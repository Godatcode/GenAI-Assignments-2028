import "dotenv/config";

const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

let getCompletionImpl;

if (provider === "openai") {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "LLM_PROVIDER=openai but OPENAI_API_KEY is not set. Add it to your .env file."
    );
  }
  ({ getCompletion: getCompletionImpl } = await import("./openai.js"));
} else if (provider === "anthropic") {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set. Add it to your .env file."
    );
  }
  ({ getCompletion: getCompletionImpl } = await import("./anthropic.js"));
} else {
  throw new Error(
    `Unknown LLM_PROVIDER "${provider}". Use "anthropic" or "openai".`
  );
}

export const PROVIDER = provider;
export const getCompletion = getCompletionImpl;
