import { getCompletion, PROVIDER } from "./llm/index.js";
import { extractAllParsed } from "./utils/parseJSON.js";
import { SYSTEM_PROMPT } from "./prompts/system.js";
import {
  createFolder,
  writeFile,
  readFile,
  listFiles,
} from "./tools/fileSystem.js";
import { openInBrowser } from "./tools/browser.js";
import { fetchUrl } from "./tools/fetchUrl.js";
import { screenshotWebsite } from "./tools/screenshot.js";

const tool_map = {
  createFolder,
  writeFile,
  readFile,
  listFiles,
  openInBrowser,
  fetchUrl,
  screenshotWebsite,
};

// Build the conversation message that represents an OBSERVE step.
// Strings → plain JSON OBSERVE payload.
// Objects with base64 (e.g. screenshotWebsite success) → provider-specific
// content array with the image attached so the model can SEE it.
function buildObserveMessage(observation) {
  const isImage =
    observation && typeof observation === "object" && observation.base64;

  if (!isImage) {
    const text =
      typeof observation === "string"
        ? observation
        : observation?.message || String(observation);
    return {
      role: "developer",
      content: JSON.stringify({ step: "OBSERVE", content: text }),
    };
  }

  const text = `[OBSERVATION] ${observation.message}\nI have attached the screenshot above. Analyze it carefully — match the layout, colors, spacing, typography, and sections you see. This is the source of truth for visual design.`;

  if (PROVIDER === "openai") {
    return {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${observation.mimeType};base64,${observation.base64}`,
            detail: "high",
          },
        },
        { type: "text", text },
      ],
    };
  }

  // Anthropic (default)
  return {
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: observation.mimeType,
          data: observation.base64,
        },
      },
      { type: "text", text },
    ],
  };
}

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  whiteBold: "\x1b[1;37m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function logStep(parsed) {
  const c = COLOR;
  const step = parsed.step;
  if (step === "START") {
    console.log(`\n${c.cyan}▶ START${c.reset}   ${parsed.content}`);
  } else if (step === "THINK") {
    console.log(`${c.yellow}🤔 THINK${c.reset}   ${parsed.content}`);
  } else if (step === "TOOL") {
    console.log(
      `${c.green}🛠  TOOL${c.reset}    ${parsed.tool_name}  ${c.dim}${JSON.stringify(
        truncateArgs(parsed.tool_args)
      )}${c.reset}`
    );
  } else if (step === "OBSERVE") {
    console.log(
      `${c.magenta}👁  OBSERVE${c.reset} ${truncateText(parsed.content, 200)}`
    );
  } else if (step === "OUTPUT") {
    console.log(`\n${c.whiteBold}✅ OUTPUT${c.reset}\n${parsed.content}\n`);
  } else {
    console.log(`${c.dim}? ${step}${c.reset} ${JSON.stringify(parsed)}`);
  }
}

function truncateArgs(args) {
  if (!args || typeof args !== "object") return args;
  const out = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "…" : v;
  }
  return out;
}

function truncateText(text, n) {
  const s = typeof text === "string" ? text : JSON.stringify(text);
  return s.length > n ? s.slice(0, n) + "…" : s;
}

const MAX_ITERATIONS = 30;
const MAX_PARSE_RETRIES = 3;

export async function runAgent(userMessage, conversationHistory) {
  if (conversationHistory.length === 0) {
    conversationHistory.push({ role: "system", content: SYSTEM_PROMPT });
  }
  conversationHistory.push({ role: "user", content: userMessage });

  let iterations = 0;
  let parseRetries = 0;
  let done = false;

  while (!done) {
    if (iterations++ >= MAX_ITERATIONS) {
      console.log(
        `${COLOR.red}⚠ Reached max iterations (${MAX_ITERATIONS}). Stopping.${COLOR.reset}`
      );
      break;
    }

    let raw;
    try {
      raw = await getCompletion(conversationHistory);
    } catch (err) {
      if (err.truncated) {
        console.log(
          `${COLOR.red}⚠ Response truncated (output token cap hit). Asking the model to write a smaller file.${COLOR.reset}`
        );
        // Persist the partial reply so role alternation stays correct,
        // then nudge with a recovery instruction.
        if (err.partial) {
          conversationHistory.push({ role: "assistant", content: err.partial });
        }
        conversationHistory.push({
          role: "user",
          content:
            "Your previous response was truncated because the file was too large. Try again: write a SMALLER, more focused version of that file (under 1500 lines). Keep core sections only — Header, Hero, Footer — and omit nice-to-have sections.",
        });
        continue;
      }
      console.log(`${COLOR.red}⚠ LLM call failed: ${err.message}${COLOR.reset}`);
      break;
    }

    let steps;
    try {
      steps = extractAllParsed(raw);
      parseRetries = 0;
    } catch (e) {
      parseRetries++;
      console.log(
        `${COLOR.red}⚠ JSON parse failed (attempt ${parseRetries}/${MAX_PARSE_RETRIES}): ${e.message}${COLOR.reset}`
      );
      if (process.env.DEBUG_RAW) {
        console.log(
          `${COLOR.dim}--- raw response (${raw.length} chars) ---\n${raw}\n--- end ---${COLOR.reset}`
        );
      }
      if (parseRetries >= MAX_PARSE_RETRIES) {
        console.log(
          `${COLOR.red}⚠ Giving up after ${MAX_PARSE_RETRIES} parse failures.${COLOR.reset}`
        );
        break;
      }
      conversationHistory.push({ role: "assistant", content: raw });
      conversationHistory.push({
        role: "user",
        content:
          "Your last response was not valid JSON. Respond with one or more JSON objects only — no markdown fences, no commentary.",
      });
      continue;
    }

    // Persist the model's full reply so the assistant turn is a single message.
    conversationHistory.push({ role: "assistant", content: raw });

    let pauseReason = "thinking-only"; // becomes "tool" if we ran a tool, "output" if we finished
    for (const parsed of steps) {
      logStep(parsed);

      if (parsed.step === "TOOL") {
        const tool = tool_map[parsed.tool_name];
        let observation;
        if (!tool) {
          observation = `Tool "${parsed.tool_name}" is not available. Available tools: ${Object.keys(tool_map).join(", ")}`;
        } else {
          try {
            observation = await tool(parsed.tool_args || {});
          } catch (err) {
            observation = `Error: ${err.message}`;
          }
        }
        // Log only the text portion — never the base64 payload.
        const logText =
          typeof observation === "string"
            ? observation
            : observation?.message || String(observation);
        logStep({ step: "OBSERVE", content: logText });
        conversationHistory.push(buildObserveMessage(observation));
        pauseReason = "tool";
        break; // stop processing further steps in this response
      }

      if (parsed.step === "OUTPUT") {
        pauseReason = "output";
        break;
      }
      // START / THINK — keep iterating through this response's steps
    }

    if (pauseReason === "output") {
      done = true;
      break;
    }

    if (pauseReason === "thinking-only") {
      // No tool was called and no output produced — Anthropic requires the
      // conversation to end with a user message, so nudge the model forward.
      conversationHistory.push({
        role: "user",
        content: "Continue with the next step.",
      });
    }
  }

  return conversationHistory;
}
