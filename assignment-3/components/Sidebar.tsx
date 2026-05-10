"use client";

import { useMemo } from "react";
import type { ClientDoc } from "@/lib/types";
import type { Source } from "./SourceCard";

interface Props {
  doc: ClientDoc | null;
  cited: Source[];
  onReplace: () => void;
}

const EMBED_DIMS = 3072; // text-embedding-3-large native dimension

function describeRef(s: Source): string {
  if (s.source === "csv" && typeof s.row === "number") return `row ${s.row}`;
  if (s.source === "pdf" && typeof s.page === "number") return `p. ${s.page}`;
  if (s.source === "image") return "image";
  return "source";
}

export default function Sidebar({ doc, cited, onReplace }: Props) {
  // Aggregate unique sources cited so far across all answers, ranked by score.
  const unique = useMemo(() => {
    const seen = new Map<string, Source & { idx: number }>();
    cited.forEach((s, i) => {
      const k = `${s.source}-${s.page ?? ""}-${s.row ?? ""}-${(s.preview ?? "").slice(0, 40)}`;
      if (!seen.has(k)) seen.set(k, { ...s, idx: i + 1 });
    });
    return Array.from(seen.values()).sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );
  }, [cited]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div className="brand-name">
          Notebook<em>.rag</em>
        </div>
      </div>

      <div className="side-section">
        <div className="side-label">Document</div>
      </div>

      <div className="doc-card">
        {doc ? (
          <div className="doc-tile">
            <div className="doc-tile-head">
              <div className="doc-icon">
                <span>{doc.source.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="doc-name">{doc.fileName}</div>
                <div className="doc-meta">
                  {doc.size ?? `${doc.source.toUpperCase()} file`}
                  {doc.uploadedAt && ` · uploaded ${doc.uploadedAt}`}
                </div>
              </div>
            </div>
            <div className="doc-stats">
              <div>
                <div className="stat-num">{doc.chunkCount}</div>
                <div className="stat-lbl">chunks</div>
              </div>
              <div>
                <div className="stat-num">{EMBED_DIMS}</div>
                <div className="stat-lbl">dim</div>
              </div>
              <div>
                <div className="stat-num">5</div>
                <div className="stat-lbl">top-k</div>
              </div>
            </div>
            <div className="doc-actions">
              <button className="btn-ghost" onClick={onReplace}>
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="doc-empty">
            <b>No document yet.</b>
            <br />
            Upload a PDF, CSV, text, or markdown file to begin.
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
          {doc
            ? "Sources you cite will appear here as you ask questions."
            : "—"}
        </div>
      )}

      <div className="side-foot">
        <span>
          <span className="dot" />
          qdrant · notebooklm-docs
        </span>
        <span>v0.1</span>
      </div>
    </aside>
  );
}
