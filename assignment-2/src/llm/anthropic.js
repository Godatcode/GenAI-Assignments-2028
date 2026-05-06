import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../prompts/system.js";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 16384;

function toAnthropicMessages(messages) {
  const converted = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    // Pre-formatted array content (e.g. image observations) — pass through.
    // Anthropic accepts content arrays with text + image blocks natively.
    if (Array.isArray(m.content)) {
      const role = m.role === "developer" ? "user" : m.role;
      converted.push({ role, content: m.content });
      continue;
    }
    if (m.role === "developer") {
      converted.push({ role: "user", content: `[OBSERVATION] ${m.content}` });
    } else if (m.role === "assistant" || m.role === "user") {
      converted.push({ role: m.role, content: m.content });
    } else {
      converted.push({ role: "user", content: m.content });
    }
  }
  return converted;
}

export async function getCompletion(messages) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: toAnthropicMessages(messages),
  });

  const text = response.content[0]?.text ?? "";
  if (response.stop_reason === "max_tokens") {
    const err = new Error(
      `Response truncated at ${MAX_TOKENS} tokens (stop_reason=max_tokens). The file you tried to write is too large.`
    );
    err.truncated = true;
    err.partial = text;
    throw err;
  }
  return text;
}
