import { NextRequest } from "next/server";
import { retrieveRelevantChunks } from "@/lib/retrieve";
import { streamGroundedAnswer } from "@/lib/generate";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatRequestBody {
  documentId: string;
  question: string;
  history?: ChatMessage[];
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { documentId, question, history = [] } = body;

  if (!documentId || typeof documentId !== "string") {
    return Response.json(
      { error: "documentId is required — upload a document first." },
      { status: 400 }
    );
  }
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return Response.json({ error: "question is required." }, { status: 400 });
  }

  try {
    const chunks = await retrieveRelevantChunks(question, documentId, 5);

    const sourcesHeader = encodeURIComponent(
      JSON.stringify(
        chunks.map((c) => ({
          fileName: c.metadata.fileName,
          source: c.metadata.source,
          page: c.metadata.page,
          row: c.metadata.row,
          score: c.score,
          preview: c.text.length > 320 ? c.text.slice(0, 320) + "…" : c.text,
        }))
      )
    );

    const stream = await streamGroundedAnswer({ question, history, chunks });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Sources": sourcesHeader,
      },
    });
  } catch (err) {
    const apiErr = err as {
      message?: string;
      status?: number;
      error?: { error?: { message?: string; type?: string } };
    };
    const detail =
      apiErr?.error?.error?.message ??
      (err instanceof Error ? err.message : "Chat failed.");
    console.error("[/api/chat]", apiErr?.status, detail, err);
    return Response.json({ error: detail }, { status: 500 });
  }
}
