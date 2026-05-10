import { ANTHROPIC_MODEL, getAnthropic } from "./llm/anthropic";

// Identical instruction reused for PDFs and images. The page marker is a
// load-bearing detail — `splitTranscribedPages` parses it back out so per-page
// citations still work after OCR.
const TRANSCRIBE_INSTRUCTION = `Transcribe everything visible in this document into plain text.
Rules:
- Preserve original wording, numbers, names, and ordering verbatim. Do not summarize or paraphrase.
- Insert a marker line "--- PAGE {n} ---" at the start of every page (n starts at 1).
- Render tables as plain-text rows, one row per line, columns separated by " | ".
- For figures, charts, or photos, write a short bracketed description like "[Figure: bar chart of 2024 sales]".
- Do not add commentary, headings, or framing text of your own.`;

// Max output tokens for transcription. Long scanned docs can exceed this and
// will get truncated — that's a known cost of single-shot OCR. Documented in
// the README so users know to keep PDFs short on the live demo.
const OCR_MAX_TOKENS = 16384;

type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export function imageMediaType(fileName: string): ImageMediaType {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

// Anthropic's stable Messages types in v0.32.1 don't yet include the document
// content block (it shipped as a beta header). Cast through unknown so TS is
// happy without dropping the rest of the type-checking on the call.
type DocBlock = {
  type: "document";
  source: { type: "base64"; media_type: "application/pdf"; data: string };
};

export async function transcribePdfWithClaude(buffer: Buffer): Promise<string> {
  const client = getAnthropic();
  const docBlock: DocBlock = {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: buffer.toString("base64"),
    },
  };

  const response = await client.beta.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: OCR_MAX_TOKENS,
    betas: ["pdfs-2024-09-25"],
    messages: [
      {
        role: "user",
        content: [
          docBlock as unknown as { type: "text"; text: string },
          { type: "text", text: TRANSCRIBE_INSTRUCTION },
        ],
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned a non-text response while transcribing the PDF.");
  }
  return block.text;
}

export async function transcribeImageWithClaude(
  buffer: Buffer,
  mediaType: ImageMediaType
): Promise<string> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: OCR_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: buffer.toString("base64"),
            },
          },
          { type: "text", text: TRANSCRIBE_INSTRUCTION },
        ],
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Claude returned a non-text response while transcribing the image.");
  }
  return block.text;
}

// Split a transcribed string on "--- PAGE N ---" markers into per-page chunks.
// Returns [{ pageNumber, text }, ...]. If no markers are found, the whole
// transcription is returned as page 1.
export function splitTranscribedPages(
  transcribed: string
): Array<{ pageNumber: number; text: string }> {
  const re = /^---\s*PAGE\s+(\d+)\s*---\s*$/gim;
  const segments: Array<{ pageNumber: number; text: string }> = [];

  let lastIndex = 0;
  let lastPage = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(transcribed)) !== null) {
    const before = transcribed.slice(lastIndex, m.index).trim();
    if (before) segments.push({ pageNumber: lastPage, text: before });
    lastPage = parseInt(m[1], 10);
    lastIndex = m.index + m[0].length;
  }
  const tail = transcribed.slice(lastIndex).trim();
  if (tail) segments.push({ pageNumber: lastPage, text: tail });

  if (segments.length === 0) {
    const trimmed = transcribed.trim();
    if (trimmed) segments.push({ pageNumber: 1, text: trimmed });
  }
  return segments;
}
