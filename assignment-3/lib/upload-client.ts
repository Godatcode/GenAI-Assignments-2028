import type { ClientDoc, UploadResponse } from "./types";

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export function detectClientType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (ext === "csv") return "CSV";
  if (ext === "md") return "MD";
  if (IMAGE_EXTS.has(ext)) return "IMG";
  return "TXT";
}

// Single source of truth for the upload fetch. Returns a ClientDoc enriched
// with the size + uploadedAt fields the browser knows but the server doesn't.
export async function uploadFileToServer(file: File): Promise<ClientDoc> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  const data = (await res.json()) as UploadResponse;
  return {
    ...data,
    size: formatSize(file.size),
    uploadedAt: "just now",
  };
}

export const ACCEPT_ATTR = ".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif";
