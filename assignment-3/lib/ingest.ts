import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { splitDocuments } from "./chunking";
import { indexDocuments } from "./vectorstore";
import {
  imageMediaType,
  splitTranscribedPages,
  transcribeImageWithClaude,
  transcribePdfWithClaude,
} from "./ocr";
import type { ChunkMetadata, SourceKind, UploadResponse } from "./types";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

// Below this much extracted text per page we treat the PDF as scanned and
// fall back to Claude OCR. 100 chars per page is roughly "less than a single
// short paragraph" — true text PDFs always exceed this comfortably.
const SCANNED_PDF_THRESHOLD_CHARS_PER_PAGE = 100;

function detectSource(fileName: string): SourceKind {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".csv") return "csv";
  if (ext === ".txt" || ext === ".md") return "text";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  throw new Error(
    `Unsupported file type: ${ext}. Allowed: .pdf, .txt, .md, .csv, .png, .jpg, .jpeg, .webp, .gif`
  );
}

async function loadPdf(filePath: string): Promise<Document[]> {
  const native = await new PDFLoader(filePath).load();
  const totalChars = native.reduce((acc, d) => acc + d.pageContent.trim().length, 0);
  const pageCount = Math.max(native.length, 1);
  const avg = totalChars / pageCount;

  // PDFLoader returns a Document per page; if those pages are nearly empty,
  // the PDF is image-based and we need OCR to get anything useful out.
  if (avg >= SCANNED_PDF_THRESHOLD_CHARS_PER_PAGE) return native;

  const buffer = await fs.readFile(filePath);
  const transcribed = await transcribePdfWithClaude(buffer);
  const pages = splitTranscribedPages(transcribed);
  return pages.map(
    (p) =>
      new Document({
        pageContent: p.text,
        metadata: { loc: { pageNumber: p.pageNumber } },
      })
  );
}

async function loadImage(filePath: string, fileName: string): Promise<Document[]> {
  const buffer = await fs.readFile(filePath);
  const transcribed = await transcribeImageWithClaude(
    buffer,
    imageMediaType(fileName)
  );
  const trimmed = transcribed.trim();
  if (!trimmed) return [];
  return [new Document({ pageContent: trimmed, metadata: {} })];
}

async function loadDocs(
  filePath: string,
  fileName: string,
  source: SourceKind
): Promise<Document[]> {
  if (source === "pdf") return loadPdf(filePath);
  if (source === "csv") return new CSVLoader(filePath).load();
  if (source === "image") return loadImage(filePath, fileName);
  // Plain text / markdown: read the file directly. (Skipping LangChain's
  // TextLoader since it isn't exported from @langchain/community in this
  // version — and a single fs.readFile does the same thing.)
  const text = await fs.readFile(filePath, "utf-8");
  return [new Document({ pageContent: text, metadata: { source: fileName } })];
}

function stampMetadata(
  docs: Document[],
  base: { documentId: string; fileName: string; source: SourceKind }
): Document[] {
  return docs.map((doc, i) => {
    const meta: ChunkMetadata = {
      documentId: base.documentId,
      fileName: base.fileName,
      source: base.source,
    };

    // PDFLoader sets metadata.loc.pageNumber; CSVLoader uses metadata.line; both
    // are convenient for citing back to the source. OCR'd PDFs pass through the
    // same loc.pageNumber shape we set in loadPdf.
    const raw = doc.metadata as Record<string, unknown>;
    const pageNumber =
      (raw.loc as { pageNumber?: number } | undefined)?.pageNumber ??
      (typeof raw.pdf === "object" && raw.pdf
        ? (raw.pdf as { pageNumber?: number }).pageNumber
        : undefined);
    if (base.source === "pdf" && typeof pageNumber === "number") {
      meta.page = pageNumber;
    }
    if (base.source === "csv") {
      meta.row = typeof raw.line === "number" ? raw.line : i + 1;
    }

    return new Document({ pageContent: doc.pageContent, metadata: meta });
  });
}

export async function ingestFile(
  buffer: Buffer,
  fileName: string
): Promise<UploadResponse> {
  const source = detectSource(fileName);
  const documentId = randomUUID();

  const tmpPath = path.join(
    tmpdir(),
    `nblm-${documentId}${path.extname(fileName).toLowerCase()}`
  );
  await fs.writeFile(tmpPath, buffer);

  try {
    const rawDocs = await loadDocs(tmpPath, fileName, source);

    // CSV rows are already self-contained semantic units — splitting them by
    // chars would shred the structure. PDF / image / text get the recursive
    // splitter so retrieval has bite-size chunks to match against.
    const splitDocs =
      source === "csv" ? rawDocs : await splitDocuments(rawDocs);

    if (splitDocs.length === 0) {
      throw new Error("No content extracted from the uploaded file.");
    }

    const stamped = stampMetadata(splitDocs, {
      documentId,
      fileName,
      source,
    });

    await indexDocuments(stamped);

    return {
      documentId,
      fileName,
      source,
      chunkCount: stamped.length,
    };
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
