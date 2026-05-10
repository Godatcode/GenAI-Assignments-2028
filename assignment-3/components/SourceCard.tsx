"use client";

export interface Source {
  fileName: string;
  source: "pdf" | "csv" | "text" | "image";
  page?: number;
  row?: number;
  score?: number;
  preview: string;
}

interface Props {
  sources: Source[];
}

function describeRef(s: Source): string {
  if (s.source === "csv" && typeof s.row === "number") return `row ${s.row}`;
  if (s.source === "pdf" && typeof s.page === "number") return `page ${s.page}`;
  if (s.source === "image") return "image";
  return "source";
}

export default function SourceCards({ sources }: Props) {
  if (sources.length === 0) return null;

  return (
    <div className="sources-panel">
      {sources.map((s, i) => (
        <div className="chunk" key={i}>
          <div className="chunk-head">
            <div className="chunk-num">{i + 1}</div>
            <div className="chunk-meta">
              <span className="file">{s.fileName}</span>
              <span className="sep">·</span>
              <span>{describeRef(s)}</span>
            </div>
            {typeof s.score === "number" && (
              <div className="chunk-score">sim {s.score.toFixed(2)}</div>
            )}
          </div>
          <div className="chunk-text">{s.preview}</div>
        </div>
      ))}
    </div>
  );
}
