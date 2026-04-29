import type { ChatMessage } from "@/lib/types";

export type ProviderId = "openai" | "gemini";

export interface StreamArgs {
  systemPrompt: string;
  messages: ChatMessage[];
}

export interface ChatProvider {
  id: ProviderId;
  /** Returns a stream of plain UTF-8 text deltas. */
  stream(args: StreamArgs): Promise<ReadableStream<Uint8Array>>;
}
