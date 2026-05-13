"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientDoc } from "@/lib/types";
import {
  ACCEPT_ATTR,
  detectClientType,
  formatSize,
  uploadFileToServer,
} from "@/lib/upload-client";
import { CheckIcon, UploadIcon } from "./icons";

interface Props {
  onUploaded: (doc: ClientDoc) => void;
  onError?: (message: string) => void;
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
  // to 100% when the fetch resolves. The time constant is stretched when OCR
  // is likely (image / PDF) — those calls regularly take 20–40s.
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"upload" | "parse" | "embed" | "index">("upload");

  useEffect(() => {
    if (!busy || !pending) return;
    const ocrLikely = pending.type === "IMG" || pending.type === "PDF";
    const tau = ocrLikely ? 14000 : 4500;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const target = 90 * (1 - Math.exp(-elapsed / tau));
      setProgress(target);
      if (target < 22) setStage("upload");
      else if (target < 60) setStage("parse");
      else if (target < 80) setStage("embed");
      else setStage("index");
    }, 80);
    return () => clearInterval(id);
  }, [busy, pending]);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setProgress(0);
    setStage("upload");
    setPending({
      name: file.name,
      size: formatSize(file.size),
      type: detectClientType(file.name),
    });

    try {
      const enriched = await uploadFileToServer(file);
      setProgress(100);
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
    const isOcrLikely = pending.type === "IMG" || pending.type === "PDF";
    const steps: Array<{
      key: "upload" | "parse" | "embed" | "index";
      label: string;
      meta: string;
    }> = [
      { key: "upload", label: "Uploading file", meta: pending.size },
      {
        key: "parse",
        label: isOcrLikely ? "Reading text (OCR if scanned)" : "Parsing & chunking",
        meta: pending.type === "IMG" ? "claude vision" : "recursive splitter",
      },
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
          Upload as many as you like. We&apos;ll chunk each one, embed it with
          OpenAI, and index it into Qdrant — usually under thirty seconds per file.
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
          <div className="dz-hint">PDF · CSV · TXT · MD · PNG · JPG &nbsp;·&nbsp; up to 4 MB each &nbsp;·&nbsp; OCR for scanned PDFs &amp; images</div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
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
