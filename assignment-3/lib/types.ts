export type SourceKind = "pdf" | "csv" | "text";

export interface ChunkMetadata {
  documentId: string;
  fileName: string;
  source: SourceKind;
  page?: number;
  row?: number;
  loc?: { lines?: { from: number; to: number } };
}

export interface RetrievedChunk {
  text: string;
  metadata: ChunkMetadata;
  score?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UploadResponse {
  documentId: string;
  fileName: string;
  source: SourceKind;
  chunkCount: number;
}

// Client-side enrichment of UploadResponse with fields the browser knows but
// the server doesn't bother sending back (file size, upload time). Lives on
// page state only — never in the API contract.
export interface ClientDoc extends UploadResponse {
  size?: string;
  uploadedAt?: string;
}
