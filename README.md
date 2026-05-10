# GenAI Assignments — Scaler Academy 2026 Cohort

A monorepo of hands-on Generative AI projects, each one shipped with a live demo, a recorded walkthrough, and full source.

---

## 📦 Assignments in this repo

| # | Project | Stack | What it does |
|:-:|---|---|---|
| 1 | **Scaler Persona Chat** | Next.js · TypeScript · Gemini 2.5 Flash | A 3-persona AI chatbot — Anshuman Singh, Abhimanyu Saxena, Kshitij Mishra — with hand-crafted system prompts, streaming responses, and a polished mobile UI. |
| 2 | **Website Cloner Agent** | Node.js · Claude Sonnet 4.6 · Puppeteer | A conversational CLI agent (Cursor-style) that infers a brand's URL, fetches the live HTML, takes a real screenshot, **looks at it**, and clones the site into working HTML/CSS/JS. |
| 3 | **Notebook RAG** | Next.js · Claude Sonnet 4.6 · OpenAI embeddings · Qdrant | A NotebookLM-style RAG app — upload a PDF / CSV / text file, chat with it, and get answers grounded in the document with inline citations and source cards. |

---

## 🧪 Assignment 1 — Persona-Based AI Chatbot

> Prompt-engineered chatbot that role-plays three Scaler personalities with researched system prompts, few-shot examples, and chain-of-thought scaffolding.

🔗 **Live demo:** [gen-ai-vert-nine.vercel.app](https://gen-ai-vert-nine.vercel.app/)
📁 **Source:** [`assignement-1/`](./assignement-1)
📖 **Read more:** [assignement-1/README.md](./assignement-1/README.md)

**Highlights**
- 3 distinct personas with hand-written system prompts
- Streaming responses + typing indicator
- Suggestion chips per persona
- Fully responsive — sidebar collapses to pill-row on mobile

---

## 📚 Assignment 3 — Notebook RAG (NotebookLM clone)

> Upload any PDF, plain-text, markdown, or CSV file and ask grounded questions about it. The full RAG pipeline runs end-to-end: ingestion → chunking → embedding → Qdrant → retrieval → Claude generation. Answers come from the document, not the model's memory — with inline page/row citations.

🔗 **Live demo:** [notebook-ai-rag.vercel.app](https://notebook-ai-rag.vercel.app/)
📁 **Source:** [`assignment-3/`](./assignment-3)
📖 **Read more:** [assignment-3/README.md](./assignment-3/README.md)

**Highlights**
- Loaders for PDF (page-aware), CSV (row-as-chunk), plain text / markdown — plus images (PNG/JPG/WEBP/GIF) and scanned PDFs via Claude vision OCR
- Recursive-character chunking (1000 / 150 overlap) — documented strategy beyond naive page splits
- OpenAI `text-embedding-3-large` embeddings stored in Qdrant Cloud, filtered per-document
- Claude Sonnet 4.6 streams the answer; system prompt forbids hallucination ("I can't find that in this document.")
- Source cards under every answer — chunk text + filename + page/row/image + similarity score
- Markdown rendering with inline citation chips that survive bold, lists, tables, and headings

---

## 🤖 Assignment 2 — AI Agent CLI Tool

> Conversational CLI agent that takes a natural-language instruction like *"Clone Scaler Academy"* and produces a working webpage by reasoning step-by-step: `START → THINK → TOOL → OBSERVE → … → OUTPUT`.

📁 **Source:** [`assignment-2/`](./assignment-2)
📖 **Read more:** [assignment-2/README.md](./assignment-2/README.md)

**Highlights**
- True agent loop — never one-shots, always reasons in steps
- Live website analysis via `fetchUrl` (HTML) + `screenshotWebsite` (vision input via Puppeteer)
- URL inference — say "clone Scaler" and the agent figures out `scaler.com` itself
- Pluggable LLM — swap between Anthropic Claude and OpenAI GPT via one env var
- Self-recovery — handles parse errors, truncated responses, and tool failures without crashing

---

## 🚀 Quick start

Each assignment lives in its own folder with its own setup. Pick one:

```bash
# Assignment 1 — Persona Chat (Next.js)
cd assignement-1
npm install
npm run dev          # → http://localhost:3000

# Assignment 2 — Website Cloner Agent (Node CLI)
cd assignment-2
npm install
cp .env.example .env  # add your ANTHROPIC_API_KEY
npm start

# Assignment 3 — Notebook RAG (Next.js)
cd assignment-3
npm install
cp .env.example .env.local   # add ANTHROPIC, OPENAI, QDRANT keys
npm run dev          # → http://localhost:3000
```

---

## 🗂️ Repo layout

```
GenAI-Assignments-2028/
├── README.md                ← you are here
├── assignement-1/           ← Persona Chat (Next.js app)
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
├── assignment-2/            ← Website Cloner Agent (Node CLI)
│   ├── src/
│   │   ├── index.js          ← readline CLI
│   │   ├── agent.js          ← reasoning loop
│   │   ├── llm/              ← provider router (anthropic | openai)
│   │   ├── tools/            ← fileSystem · browser · fetchUrl · screenshot
│   │   ├── prompts/system.js
│   │   └── utils/parseJSON.js
│   ├── package.json
│   └── README.md
└── assignment-3/            ← Notebook RAG (Next.js)
    ├── app/
    │   ├── api/upload/       ← POST: ingest pipeline
    │   ├── api/chat/         ← POST: retrieve + stream answer
    │   ├── layout.tsx · page.tsx · globals.css
    ├── components/           ← FileUpload · ChatWindow · SourceCard
    ├── lib/                  ← chunking · embeddings · vectorstore · ingest · retrieve · generate
    ├── package.json
    └── README.md
```

---

## 🧠 What I learned across both

| Theme | Where it shows up |
|---|---|
| **Prompt engineering** | A1 — persona system prompts with persona description, examples, CoT, output format, constraints |
| **Tool-using agents** | A2 — strict THINK/TOOL/OBSERVE loop with retry/recovery semantics |
| **Multimodal reasoning** | A2 — screenshots fed back into the model so it can *see* the target site, not just remember it |
| **Provider abstraction** | A2 — single `getCompletion(messages)` interface over Anthropic + OpenAI |
| **UX polish** | A1 — streaming, mobile responsiveness, suggestion chips |
| **RAG pipelines** | A3 — chunk → embed → Qdrant → retrieve → grounded generation with citations |
| **Vector search** | A3 — OpenAI embeddings, Qdrant similarity search, per-document metadata filtering |

