import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../prompts/system.js";

const client = new OpenAI();

const MODEL = "gpt-4.1-mini";
const MAX_TOKENS = 16384;

function toOpenAIMessages(messages) {
  const hasSystem = messages.some((m) => m.role === "system");
  const out = hasSystem ? [] : [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of messages) {
    // Pre-formatted array content (e.g. image observations) — pass through.
    // OpenAI vision models accept content arrays with text + image_url blocks.
    if (Array.isArray(m.content)) {
      const role = m.role === "developer" ? "user" : m.role;
      out.push({ role, content: m.content });
      continue;
    }
    if (m.role === "developer") {
      out.push({ role: "user", content: `[OBSERVATION] ${m.content}` });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

export async function getCompletion(messages) {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    response_format: { type: "json_object" },
    messages: toOpenAIMessages(messages),
  });

  const choice = response.choices[0];
  const text = choice?.message?.content ?? "";
  if (choice?.finish_reason === "length") {
    const err = new Error(
      `Response truncated at ${MAX_TOKENS} tokens (finish_reason=length). The file you tried to write is too large.`
    );
    err.truncated = true;
    err.partial = text;
    throw err;
  }
  return text;
}
