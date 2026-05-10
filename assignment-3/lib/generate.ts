import { ANTHROPIC_MODEL, getAnthropic } from "./llm/anthropic";
import type { ChatMessage, RetrievedChunk } from "./types";

const SYSTEM_PROMPT = `You are a careful research assistant answering questions about a single user-uploaded document.

RULES — follow strictly:
1. Answer ONLY using the information in the CONTEXT block below. Never fall back to general knowledge.
2. If the context does not contain the answer, reply exactly: "I can't find that in this document." Do not guess. Do not improvise.
3. After every claim, cite the source inline like [page 4] for PDFs, [row 12] for CSVs, [image] for image / OCR-only files, or [source] for plain-text files. Use the page/row numbers exactly as they appear in the context headers.
4. Quote short phrases verbatim when it makes the answer more credible. Keep answers tight — no filler, no preamble.
5. If the question is ambiguous, answer the most likely interpretation and note the assumption in one short clause.`;

function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no relevant context found)";
  return chunks
    .map((c, i) => {
      const m = c.metadata;
      let header: string;
      if (m.source === "pdf" && typeof m.page === "number") {
        header = `[Chunk ${i + 1} | ${m.fileName} | page ${m.page}]`;
      } else if (m.source === "csv" && typeof m.row === "number") {
        header = `[Chunk ${i + 1} | ${m.fileName} | row ${m.row}]`;
      } else if (m.source === "image") {
        header = `[Chunk ${i + 1} | ${m.fileName} | image]`;
      } else {
        header = `[Chunk ${i + 1} | ${m.fileName} | source]`;
      }
      return `${header}\n${c.text}`;
    })
    .join("\n\n---\n\n");
}

export interface GenerateArgs {
  question: string;
  history: ChatMessage[];
  chunks: RetrievedChunk[];
}

// Streams Claude's answer back as raw text deltas — the route handler pipes
// these straight to the browser so the UI feels responsive.
export async function streamGroundedAnswer({
  question,
  history,
  chunks,
}: GenerateArgs): Promise<ReadableStream<Uint8Array>> {
  const anthropic = getAnthropic();
  const contextText = formatContext(chunks);

  const stream = anthropic.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      {
        type: "text",
        text: `CONTEXT (the only source of truth for this answer):\n\n${contextText}`,
      },
    ],
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: question },
    ],
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
