# Assignment 3 — Notebook RAG

> A NotebookLM-style RAG app. Upload a PDF, plain-text, markdown, or CSV file and chat with it. Every answer is grounded in the document — if the answer isn't in the file, the model says so instead of hallucinating.

🔗 **Live demo:** [notebook-ai-rag.vercel.app](https://notebook-ai-rag.vercel.app/)
📁 **Source:** [`assignment-3/`](.)

---

## What it does

| Stage          | Tool                                                        |
| -------------- | ----------------------------------------------------------- |
| Ingestion      | `PDFLoader` · `CSVLoader` · inline plain-text reader        |
| Chunking       | `RecursiveCharacterTextSplitter` (1000 / 150 overlap)       |
| Embedding      | OpenAI `text-embedding-3-large`                             |
| Vector store   | Qdrant Cloud (single shared collection, filtered by doc id) |
| Retrieval      | Cosine similarity search, top-k = 5                         |
| Generation     | Claude Sonnet 4.6 (streaming)                               |
| Frontend       | Next.js 14 App Router · React · Tailwind                    |

```
┌────────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────┐
│ Upload UI  │──▶│ /api/upload│──▶│ chunk/embed  │──▶│  Qdrant  │
└────────────┘   └────────────┘   └──────────────┘   └────┬─────┘
                                                          │
┌────────────┐   ┌────────────┐   ┌──────────────┐   ┌────▼─────┐
│  Chat UI   │◀──│  /api/chat │◀──│ Claude stream│◀──│ retrieve │
└────────────┘   └────────────┘   └──────────────┘   └──────────┘
```

---

## Chunking strategy (and why I chose it)

Splitting a PDF page-by-page is the naive baseline — it cuts mid-sentence at every page break, loses cross-page semantic continuity, and produces wildly variable chunk sizes (some pages are 100 chars, some 4000).

This app uses **`RecursiveCharacterTextSplitter`** with `chunkSize: 1000` / `chunkOverlap: 150` and the separator hierarchy `["\n\n", "\n", ". ", " ", ""]`. The splitter walks the list in order — it tries to break on paragraph boundaries first, falls back to lines, then sentences, then words, and only resorts to mid-word splits when nothing else fits. Result: chunks are roughly uniform in size, respect natural prose boundaries, and the 150-char overlap keeps a sentence's head/tail reachable from both neighbouring chunks so retrieval doesn't lose context across cut points.

**CSV is a special case.** Each row is already a self-contained semantic unit; running the recursive splitter over it would shred the structure. So we keep `CSVLoader`'s row-per-document output and skip splitting for CSV files. Each row becomes one chunk, retrievable by row number.

See [`lib/chunking.ts`](lib/chunking.ts) and the CSV branch in [`lib/ingest.ts`](lib/ingest.ts).

---

## Grounded answers (no hallucinations)

The system prompt in [`lib/generate.ts`](lib/generate.ts) instructs Claude to:

1. Answer **only** from the supplied context.
2. Say _"I can't find that in this document."_ when the context doesn't cover the question.
3. Cite every claim inline as `[page N]` (PDFs), `[row N]` (CSVs), or `[source]` (text files).

Each retrieved chunk is fed to the model with a header line that includes the chunk index, file name, and page/row number, so citation accuracy is unambiguous.

The UI also renders **collapsible source cards** beneath every answer — chunk text, file name, page/row, and similarity score — so the user can verify the citation directly.

---

## Local setup

```bash
cd assignment-3
npm install
cp .env.example .env.local
# Fill in: ANTHROPIC_API_KEY, OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY
npm run dev          # → http://localhost:3000
```

You'll need:

- An **Anthropic** API key — https://console.anthropic.com/settings/keys
- An **OpenAI** API key (only used for embeddings) — https://platform.openai.com/api-keys
- A **Qdrant Cloud** cluster — https://cloud.qdrant.io (free tier is enough). Or run `docker run -p 6333:6333 qdrant/qdrant` and set `QDRANT_URL=http://localhost:6333` (no API key needed).

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel and set **Root Directory** to `assignment-3`.
3. Add the four env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`) under Settings → Environment Variables.
4. Deploy. The API routes already declare `runtime = "nodejs"` and `maxDuration = 60` so streaming + `pdf-parse` both work on Vercel.

> **Vercel hobby tier caps request bodies at 4.5 MB.** Larger PDFs work locally but will be rejected on the deployed instance. The in-app limit is set to 10 MB; trim that if you only ever deploy on hobby.

---

## File map

```
assignment-3/
├── app/
│   ├── layout.tsx                 typography + global CSS
│   ├── page.tsx                   upload rail + chat panel
│   ├── globals.css                editorial theme (matches A1)
│   └── api/
│       ├── upload/route.ts        POST: ingest pipeline
│       └── chat/route.ts          POST: retrieve + stream answer
├── components/
│   ├── FileUpload.tsx             drag-drop + status card
│   ├── ChatWindow.tsx             streaming thread + composer
│   └── SourceCard.tsx             collapsible chunk viewer
├── lib/
│   ├── chunking.ts                RecursiveCharacterTextSplitter
│   ├── embeddings.ts              OpenAIEmbeddings factory
│   ├── vectorstore.ts             QdrantVectorStore + doc-id filter
│   ├── ingest.ts                  load → chunk → stamp meta → index
│   ├── retrieve.ts                similarity search w/ scores
│   ├── generate.ts                Claude streaming + grounded prompt
│   ├── llm/anthropic.ts           SDK client singleton
│   └── types.ts
├── next.config.mjs                pdf-parse marked external
├── package.json
└── README.md
```

---

## How the rubric is satisfied

| Criterion                                | Where                                                         | Marks |
| ---------------------------------------- | ------------------------------------------------------------- | ----- |
| GitHub repo                              | _public — see top-level README_                               | 2     |
| Live project                             | Vercel deploy (link above)                                    | 2     |
| RAG pipeline (chunk → embed → retrieve → generate) | `lib/ingest.ts`, `lib/retrieve.ts`, `lib/generate.ts` | 3     |
| Answers grounded, not hallucinated       | strict system prompt + `"can't find that"` fallback + citations | 2     |
| Code quality & docs                      | Typed end-to-end, modular libs, this README                   | 1     |
