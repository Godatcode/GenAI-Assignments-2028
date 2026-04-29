# Scaler Persona Chat

A persona-based AI chatbot that lets you have real conversations with three Scaler / InterviewBit personalities — **Anshuman Singh**, **Abhimanyu Saxena**, and **Kshitij Mishra**.

Built for **Assignment 01 — Persona-Based AI Chatbot**, Prompt Engineering, Scaler Academy.

## Live Demo

🔗 **Live URL:** **[gen-ai-vert-nine.vercel.app](https://gen-ai-vert-nine.vercel.app/)**

Powered by Google Gemini (`gemini-2.5-flash`). The `X-LLM-Provider` response header on `/api/chat` reports the active backend.

## Screenshots

> Add 2–3 screenshots here after running the app:
>
> 1. Landing screen with the active persona, suggestion chips, and the persona switcher.
> 2. A live conversation with one of the personas.
> 3. Mobile view (375px) showing the responsive layout.

To capture them quickly: run `npm run dev`, open `http://localhost:3000`, drop the screenshots into a `screenshots/` folder, and reference them like `![Landing](screenshots/landing.png)`.

## Features

- **3 distinct personas** — each with a researched, hand-written system prompt (persona description, few-shot examples, chain-of-thought, output format, constraints).
- **Persona switcher** — tabs at the top. Switching personas swaps the system prompt and **resets the conversation**.
- **Suggestion chips** — quick-start questions tailored to each persona.
- **Streaming responses** — characters appear as the model generates them.
- **Typing indicator** — animated dots until the first token arrives.
- **Mobile-responsive** — works down to 375px width.
- **Graceful error handling** — user-friendly banner if the API fails or the key is missing.
- **No API keys in source** — `OPENAI_API_KEY` is read only from the environment.

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- **Pluggable LLM provider** — supports both **Google Gemini** (`gemini-2.5-flash`) and **OpenAI** (`gpt-4o-mini`), selectable via env var
- Deployed on [Vercel](https://vercel.com/)

## Project Structure

```
assignement-1/
├── app/
│   ├── api/chat/route.ts    # Streaming chat endpoint, picks system prompt by persona
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx             # Main chat UI
├── components/
│   ├── ChatInput.tsx
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── PersonaSwitcher.tsx
│   ├── SuggestionChips.tsx
│   └── TypingIndicator.tsx
├── lib/
│   ├── personas.ts          # All 3 system prompts + suggestion chips + metadata
│   ├── types.ts
│   └── providers/           # Pluggable LLM backends
│       ├── index.ts         # resolveProvider() — picks Gemini or OpenAI
│       ├── types.ts
│       ├── gemini.ts
│       └── openai.ts
├── prompts.md               # The 3 system prompts, annotated
├── reflection.md            # 300–500 word reflection
├── .env.example
└── README.md
```

## Setup (Local)

**Prerequisites:** Node.js 18.17+ (Node 20 LTS recommended), npm.

```bash
# 1. Clone
git clone <your-repo-url>
cd assignement-1

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# then open .env.local and paste at least ONE of:
#   GEMINI_API_KEY=...        (recommended — Gemini 2.5 Flash, free tier available)
#   OPENAI_API_KEY=sk-...     (gpt-4o-mini)
# If both are set, Gemini is used by default. Override with LLM_PROVIDER=openai.

# 4. Run
npm run dev

# 5. Open
# http://localhost:3000
```

## Choosing a Provider

The chat backend supports **both Gemini and OpenAI** behind a single API. Selection is controlled by `LLM_PROVIDER`:

| `LLM_PROVIDER` | Behavior                                                              |
| -------------- | --------------------------------------------------------------------- |
| `gemini`       | Force Gemini. Requires `GEMINI_API_KEY`.                              |
| `openai`       | Force OpenAI. Requires `OPENAI_API_KEY`.                              |
| _(unset)_      | Auto-detect: prefers `GEMINI_API_KEY`, falls back to `OPENAI_API_KEY`. |

The persona prompts in [`lib/personas.ts`](./lib/personas.ts) are model-agnostic — same prompt, both providers. The active provider is also returned in the `X-LLM-Provider` response header for debugging.

## Environment Variables

| Variable         | Required               | Default              | Description                                                |
| ---------------- | ---------------------- | -------------------- | ---------------------------------------------------------- |
| `GEMINI_API_KEY` | one of these two       | —                    | Get from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | one of these two       | —                    | Get from [platform.openai.com](https://platform.openai.com/api-keys) |
| `LLM_PROVIDER`   | no                     | auto-detect          | `gemini` or `openai`                                       |
| `GEMINI_MODEL`   | no                     | `gemini-2.5-flash`   | Override the Gemini model                                  |
| `OPENAI_MODEL`   | no                     | `gpt-4o-mini`        | Override the OpenAI model                                  |

Keys are **never** read on the client. They're only used inside `app/api/chat/route.ts` (a Node runtime route).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In **Settings → Environment Variables**, add **at least one** of:
   - `GEMINI_API_KEY` = your Gemini key (recommended)
   - `OPENAI_API_KEY` = your OpenAI key
   - (optional) `LLM_PROVIDER` = `gemini` or `openai` if you set both keys
4. Click **Deploy**. First build takes ~60s.
5. Copy the resulting `*.vercel.app` URL into the **Live Demo** section above.

> Note: Vercel auto-detects Next.js. No build/start command overrides are needed. If your repo root is the workspace root (not this folder), set the Vercel **Root Directory** to `assignement-1`.

## How the Persona System Works

- Each persona has its own dedicated system prompt in [`lib/personas.ts`](./lib/personas.ts). The prompts include: persona description, communication style, **chain-of-thought instruction**, **at least 3 few-shot examples**, output format, and hard constraints.
- The frontend tracks the active `personaId`. Every request to `/api/chat` includes `{ messages, persona }`.
- The API route looks up the matching system prompt and forwards it to the active provider via [`lib/providers/`](./lib/providers/) — the provider abstraction normalizes Gemini's `systemInstruction` and OpenAI's `system` role into one streaming interface.
- Switching personas in the UI clears the conversation history — no cross-contamination between personas.

## Adding Another Provider (e.g. Anthropic / Claude)

The provider interface lives in [`lib/providers/types.ts`](./lib/providers/types.ts) and is intentionally small:

```ts
interface ChatProvider {
  id: ProviderId;
  stream(args: { systemPrompt: string; messages: ChatMessage[] }):
    Promise<ReadableStream<Uint8Array>>;
}
```

To add Claude: install `@anthropic-ai/sdk`, create `lib/providers/anthropic.ts` that returns a `ReadableStream` of text deltas (mirroring the Gemini implementation), then register it in [`lib/providers/index.ts`](./lib/providers/index.ts). The persona prompts work as-is.

## Submission Checklist

- [x] Public GitHub repo with clean structure
- [x] `README.md` with setup steps + live link slot + screenshot slots
- [x] `prompts.md` with all three annotated system prompts
- [x] `reflection.md` (300–500 words)
- [x] `.env.example` present, `.env.local` gitignored, no API keys in source
- [x] All three personas working with distinct, researched prompts
- [x] Persona switching resets the conversation
- [x] Suggestion chips per persona
- [x] Typing indicator
- [x] Streaming responses
- [x] Mobile-responsive
- [x] Graceful API error handling
- [x] Deployed and live → [gen-ai-vert-nine.vercel.app](https://gen-ai-vert-nine.vercel.app/)

## License

Educational submission. Personas are real public figures — represented as fairly and accurately as possible based on public information; outputs are AI-generated and should not be taken as their actual statements.
