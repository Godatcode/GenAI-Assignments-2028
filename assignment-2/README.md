# Website Cloner Agent

A conversational CLI agent — like Cursor/Windsurf, but in the terminal — that takes a natural-language instruction and clones any website into a working **HTML + CSS + JS** project.

The agent reasons step-by-step (`START → THINK → TOOL → OBSERVE → … → OUTPUT`), creates one file at a time, verifies its work, and finally opens the result in your default browser.

---

## Example

> **Prompt:** `Clone Scaler Academy website`

The agent infers the URL, fetches the live HTML, takes a real screenshot, **looks at it**, and generates a faithful clone:

<img width="1512" alt="Scaler Academy — source captured by the agent's screenshotWebsite tool" src="https://github.com/user-attachments/assets/f965f962-e831-4bd2-b57c-a135302c7d60" />


It produces `scaler-clone/index.html`, `styles.css`, and `script.js`, then opens the result in your browser.
---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  src/index.js  (readline CLI)                │
│   conversational loop, keeps history across turns            │
└────────────────────────────┬─────────────────────────────────┘
                             │ user prompt
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                       src/agent.js                           │
│                                                              │
│   ┌───────┐   ┌───────┐   ┌──────┐   ┌─────────┐  ┌────────┐ │
│   │ START │──▶│ THINK │──▶│ TOOL │──▶│ OBSERVE │─▶│ OUTPUT │ │
│   └───────┘   └───────┘   └──┬───┘   └────┬────┘  └────────┘ │
│                              │            │                  │
│                              ▼            │                  │
│                       ┌──────────────┐    │                  │
│                       │ src/tools/*  │────┘                  │
│                       │ fs / browser │                       │
│                       └──────────────┘                       │
└────────────────────────────┬─────────────────────────────────┘
                             │ messages
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                       src/llm/                               │
│   anthropic.js  (claude-sonnet-4-6 + prompt caching)         │
│   openai.js     (gpt-4.1-mini + JSON mode)                   │
│   index.js      (picks provider via LLM_PROVIDER env)        │
└──────────────────────────────────────────────────────────────┘
```

---

## Setup

```bash
cd assignment-2
npm install
cp .env.example .env
```

Edit `.env` and add your API key:

```env
LLM_PROVIDER=anthropic        # or "openai"
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

You only need the key for whichever provider you've selected.

---

## Usage

```bash
npm start
```

Then chat with it:

```
you ▸ Clone the Scaler Academy website
▶ START   User wants me to clone the Scaler Academy website…
🤔 THINK  Scaler has a dark navy theme with blue/orange accents…
🛠  TOOL   createFolder  {"folderName":"scaler-clone"}
👁  OBSERVE Folder created: scaler-clone
🛠  TOOL   writeFile     {"fileName":"scaler-clone/index.html",…}
…
✅ OUTPUT  Built scaler-clone/ with index.html, styles.css, script.js.
          Opened in browser.
```

The conversation persists, so follow-ups work:

```
you ▸ Now make the hero headline larger and add a gradient background
```

### Built-in commands

| Command | What it does                |
| ------- | --------------------------- |
| `exit`  | Quit the CLI                |
| `clear` | Reset the conversation      |

### Example prompts

- `Clone the Scaler Academy website`
- `Clone stripe.com`
- `Build me a clone of vercel.com homepage`
- `Now change the primary color to green`

---

## How the agent loop works

The model is instructed to emit exactly **one JSON object per turn** with a `step` field:

| Step      | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| `START`   | Agent acknowledges the task                                     |
| `THINK`   | Agent plans the next move — multiple THINK steps are encouraged |
| `TOOL`    | Agent invokes a tool (`createFolder`, `writeFile`, …)           |
| `OBSERVE` | Runtime feeds the tool's result back in                         |
| `OUTPUT`  | Final summary — loop terminates                                 |

Files are created **one at a time** (HTML, then CSS, then JS), and the agent always calls `listFiles` before `OUTPUT` to verify everything exists.

### Available tools

| Tool                | Args                              | Purpose                          |
| ------------------- | --------------------------------- | -------------------------------- |
| `createFolder`      | `{ folderName }`                  | Creates a project folder         |
| `writeFile`         | `{ fileName, content }`           | Writes/overwrites a file         |
| `readFile`          | `{ fileName }`                    | Reads a file                     |
| `listFiles`         | `{ folderName }`                  | Lists files in a folder          |
| `openInBrowser`     | `{ filePath }`                    | Opens an HTML file in the browser |

`executeCommand` exists in `src/tools/` but is intentionally **not registered** with the agent — kept for manual / future use only.

---

## Supported LLM providers

| Provider    | Model                  | JSON-output strategy                 |
| ----------- | ---------------------- | ------------------------------------ |
| `anthropic` | `claude-sonnet-4-6`    | Assistant prefill `{` + prompt cache |
| `openai`    | `gpt-4.1-mini`         | `response_format: json_object`       |

Switch with `LLM_PROVIDER=openai npm start` — no other code changes.

---

## Project layout

```
assignment-2/
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── index.js          ← readline CLI entry
    ├── agent.js          ← THINK/TOOL/OBSERVE loop
    ├── prompts/system.js ← agent system prompt
    ├── utils/parseJSON.js← strips fences, parses
    ├── llm/
    │   ├── index.js      ← provider router
    │   ├── anthropic.js
    │   └── openai.js
    └── tools/
        ├── fileSystem.js
        ├── browser.js
        └── executeCommand.js   (not registered)
```

---

## Demo

> Screenshot / GIF placeholder — record the CLI cloning a site and the resulting page in the browser.
