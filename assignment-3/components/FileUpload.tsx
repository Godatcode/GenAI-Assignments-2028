"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientDoc, UploadResponse } from "@/lib/types";
import { CheckIcon, UploadIcon } from "./icons";

interface Props {
  onUploaded: (doc: ClientDoc) => void;
  onError?: (message: string) => void;
}

const ACCEPT = ".pdf,.txt,.md,.csv";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function detectType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "csv") return "CSV";
  if (ext === "md") return "MD";
  return "TXT";
}

export default function FileUpload({ onUploaded, onError }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ name: string; size: string; type: string } | null>(null);

  // Animated stage progression while the real fetch runs. The four stages
  // approximate what's actually happening server-side; the bar smoothly
  // advances toward 90% so it feels alive even on slow indexing, then snaps
  // to 100% when the fetch resolves.
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"upload" | "parse" | "embed" | "index">("upload");

  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      // Asymptote toward 90 over ~12s; the fetch will cut us off when it lands.
      const target = 90 * (1 - Math.exp(-elapsed / 4500));
      setProgress(target);
      if (target < 22) setStage("upload");
      else if (target < 50) setStage("parse");
      else if (target < 75) setStage("embed");
      else setStage("index");
    }, 80);
    return () => clearInterval(id);
  }, [busy]);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setProgress(0);
    setStage("upload");
    setPending({
      name: file.name,
      size: formatSize(file.size),
      type: detectType(file.name),
    });

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      const data = (await res.json()) as UploadResponse;

      // Snap to 100% so the fill catches up before we hand off to the next phase.
      setProgress(100);

      const enriched: ClientDoc = {
        ...data,
        size: formatSize(file.size),
        uploadedAt: "just now",
      };

      // Tiny delay so the user sees the bar fill, not a jump-cut.
      await new Promise((r) => setTimeout(r, 220));
      onUploaded(enriched);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
      onError?.(message);
      setBusy(false);
      setPending(null);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  if (busy && pending) {
    const steps: Array<{
      key: "upload" | "parse" | "embed" | "index";
      label: string;
      meta: string;
    }> = [
      { key: "upload", label: "Uploading file", meta: pending.size },
      { key: "parse", label: "Parsing & chunking", meta: "recursive splitter" },
      { key: "embed", label: "Generating embeddings", meta: "text-embedding-3-large" },
      { key: "index", label: "Indexing into Qdrant", meta: "cosine · notebooklm-docs" },
    ];
    const stageIdx = steps.findIndex((s) => s.key === stage);

    return (
      <div className="upload-wrap">
        <div className="indexing">
          <div className="indexing-head">
            <div className="indexing-icon">
              <span>{pending.type}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="indexing-name">{pending.name}</div>
              <div className="indexing-sub">
                Indexing · {Math.round(progress)}%
              </div>
            </div>
          </div>

          <div className="indexing-steps">
            {steps.map((s, i) => {
              const cls = i < stageIdx ? "done" : i === stageIdx ? "active" : "";
              return (
                <div key={s.key} className={`istep ${cls}`}>
                  <span className="check">
                    {i < stageIdx ? <CheckIcon /> : null}
                  </span>
                  <span>{s.label}</span>
                  <span className="meta">{s.meta}</span>
                </div>
              );
            })}
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-wrap">
      <div className="upload-card">
        <div className="upload-eyebrow">step 01 — ingest</div>
        <div className="upload-headline">
          Drop in a document.
          <br />
          <em>Ask it anything.</em>
        </div>
        <div className="upload-sub">
          One file at a time. We&apos;ll chunk it, embed it with OpenAI, and
          index it into Qdrant — usually under thirty seconds.
        </div>

        <div
          className={"dropzone" + (over ? " is-over" : "")}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <div className="dz-icon">
            <UploadIcon />
          </div>
          <div className="dz-primary">
            Drag a file here, or <b>click to browse</b>
          </div>
          <div className="dz-hint">PDF · CSV · TXT · MD &nbsp;·&nbsp; up to 4 MB</div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error && <div className="dz-error">{error}</div>}
      </div>
    </div>
  );
}
