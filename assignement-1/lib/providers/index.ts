import { openaiProvider } from "./openai";
import { geminiProvider } from "./gemini";
import type { ChatProvider, ProviderId } from "./types";

export type { ChatProvider, ProviderId } from "./types";

const REGISTRY: Record<ProviderId, ChatProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
};

interface Resolved {
  provider: ChatProvider | null;
  /** When provider is null, this explains why so the route can return a friendly error. */
  reason?: string;
}

export function resolveProvider(): Resolved {
  const explicit = (process.env.LLM_PROVIDER || "").toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (explicit === "openai") {
    if (!hasOpenAI) {
      return {
        provider: null,
        reason: "LLM_PROVIDER=openai but OPENAI_API_KEY is missing.",
      };
    }
    return { provider: REGISTRY.openai };
  }

  if (explicit === "gemini") {
    if (!hasGemini) {
      return {
        provider: null,
        reason: "LLM_PROVIDER=gemini but GEMINI_API_KEY is missing.",
      };
    }
    return { provider: REGISTRY.gemini };
  }

  if (explicit && explicit !== "openai" && explicit !== "gemini") {
    return {
      provider: null,
      reason: `Unknown LLM_PROVIDER "${explicit}". Use "openai" or "gemini".`,
    };
  }

  // Auto-detect: prefer Gemini if its key is set, else OpenAI.
  if (hasGemini) return { provider: REGISTRY.gemini };
  if (hasOpenAI) return { provider: REGISTRY.openai };

  return {
    provider: null,
    reason:
      "No LLM key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in your environment.",
  };
}
