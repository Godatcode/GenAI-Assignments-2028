import { NextRequest } from "next/server";
import { ingestFile } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel's hobby tier rejects request bodies over ~4.5 MB. Cap below that so
// the user gets a clean error from us instead of an opaque 413 from the edge.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "No file uploaded under field 'file'." },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return Response.json({ error: "File is empty." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_BYTES / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestFile(buffer, file.name);

    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    console.error("[/api/upload]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
