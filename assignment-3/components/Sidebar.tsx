"use client";

import { useMemo } from "react";
import type { ClientDoc } from "@/lib/types";
import type { Source } from "./SourceCard";
import SidebarUpload from "./SidebarUpload";

interface Props {
  docs: ClientDoc[];
  cited: Source[];
  onAdd: (doc: ClientDoc) => void;
  onRemove: (documentId: string) => void;
  onClear: () => void;
}

function describeRef(s: Source): string {
  if (s.source === "csv" && typeof s.row === "number") return `row ${s.row}`;
  if (s.source === "pdf" && typeof s.page === "number") return `p. ${s.page}`;
  if (s.source === "image") return "image";
  return "source";
}

export default function Sidebar({ docs, cited, onAdd, onRemove, onClear }: Props) {
  // Aggregate unique sources cited so far across all answers, ranked by score.
  const unique = useMemo(() => {
    const seen = new Map<string, Source & { idx: number }>();
    cited.forEach((s, i) => {
      const k = `${s.fileName}-${s.source}-${s.page ?? ""}-${s.row ?? ""}-${(s.preview ?? "").slice(0, 40)}`;
      if (!seen.has(k)) seen.set(k, { ...s, idx: i + 1 });
    });
    return Array.from(seen.values()).sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );
  }, [cited]);

  const totalChunks = docs.reduce((acc, d) => acc + d.chunkCount, 0);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div className="brand-name">
          Notebook<em>.rag</em>
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">
          {docs.length === 0
            ? "Documents"
            : docs.length === 1
              ? "Document"
              : `Documents · ${docs.length}`}
        </div>
      </div>

      <div className="doc-list">
        {docs.length === 0 ? (
          <div className="doc-empty">
            <b>No documents yet.</b>
            <br />
            Upload a PDF, CSV, text, markdown, or image to begin.
          </div>
        ) : (
          docs.map((doc) => (
            <div className="doc-tile" key={doc.documentId}>
              <button
                className="doc-remove"
                title="Remove document"
                aria-label={`Remove ${doc.fileName}`}
                onClick={() => onRemove(doc.documentId)}
              >
                ×
              </button>
              <div className="doc-tile-head">
                <div className="doc-icon">
                  <span>{doc.source.toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-name">{doc.fileName}</div>
                  <div className="doc-meta">
                    {doc.size ?? `${doc.source.toUpperCase()} file`}
                    {" · "}
                    <span style={{ fontFamily: "var(--mono)" }}>
                      {doc.chunkCount} chunks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {docs.length > 0 && (
          <div className="doc-list-foot">
            <SidebarUpload onUploaded={onAdd} />
            {docs.length > 1 && (
              <button className="btn-ghost" onClick={onClear}>
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      <div className="side-section">
        <div className="side-label">
          {unique.length > 0
            ? `Sources cited · ${unique.length}`
            : "Sources cited"}
        </div>
      </div>

      {unique.length > 0 ? (
        <div className="sources-list">
          {unique.map((s, i) => (
            <div key={i} className="src-row">
              <div className="src-pill">{i + 1}</div>
              <div className="src-row-meta">
                <span className="src-row-file">{s.fileName}</span>
                <span className="pg">{describeRef(s)}</span>
              </div>
              {typeof s.score === "number" && (
                <div className="src-row-score">{s.score.toFixed(2)}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="side-empty" style={{ flex: 1 }}>
          {docs.length > 0
            ? "Sources you cite will appear here as you ask questions."
            : "—"}
        </div>
      )}

      <div className="side-foot">
        <span>
          <span className="dot" />
          qdrant · {totalChunks > 0 ? `${totalChunks} chunks indexed` : "notebooklm-docs"}
        </span>
        <span>v0.2</span>
      </div>
    </aside>
  );
}
