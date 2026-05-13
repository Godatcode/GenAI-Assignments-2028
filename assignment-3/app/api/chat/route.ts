import { NextRequest } from "next/server";
import { retrieveRelevantChunks } from "@/lib/retrieve";
import { streamGroundedAnswer } from "@/lib/generate";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatRequestBody {
  documentIds?: string[];
  // back-compat: a single id can be sent in too, just in case an older client
  // is still cached in someone's tab when we deploy.
  documentId?: string;
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

  const { question, history = [] } = body;
  const documentIds: string[] = (() => {
    if (Array.isArray(body.documentIds)) {
      return body.documentIds.filter((id) => typeof id === "string" && id.length > 0);
    }
    if (typeof body.documentId === "string" && body.documentId.length > 0) {
      return [body.documentId];
    }
    return [];
  })();

  if (documentIds.length === 0) {
    return Response.json(
      { error: "Upload at least one document before asking questions." },
      { status: 400 }
    );
  }
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return Response.json({ error: "question is required." }, { status: 400 });
  }

  try {
    const chunks = await retrieveRelevantChunks(question, documentIds, 5);

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
