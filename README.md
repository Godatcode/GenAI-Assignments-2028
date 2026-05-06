# GenAI Assignments — Scaler Academy 2026 Cohort

A monorepo of hands-on Generative AI projects, each one shipped with a live demo, a recorded walkthrough, and full source.

---

## 📦 Assignments in this repo

| # | Project | Stack | What it does |
|:-:|---|---|---|
| 1 | **Scaler Persona Chat** | Next.js · TypeScript · Gemini 2.5 Flash | A 3-persona AI chatbot — Anshuman Singh, Abhimanyu Saxena, Kshitij Mishra — with hand-crafted system prompts, streaming responses, and a polished mobile UI. |
| 2 | **Website Cloner Agent** | Node.js · Claude Sonnet 4.6 · Puppeteer | A conversational CLI agent (Cursor-style) that infers a brand's URL, fetches the live HTML, takes a real screenshot, **looks at it**, and clones the site into working HTML/CSS/JS. |

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
└── assignment-2/            ← Website Cloner Agent (Node CLI)
    ├── src/
    │   ├── index.js          ← readline CLI
    │   ├── agent.js          ← reasoning loop
    │   ├── llm/              ← provider router (anthropic | openai)
    │   ├── tools/            ← fileSystem · browser · fetchUrl · screenshot
    │   ├── prompts/system.js
    │   └── utils/parseJSON.js
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

