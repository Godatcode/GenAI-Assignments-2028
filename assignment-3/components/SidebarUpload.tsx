"use client";

import { useRef, useState } from "react";
import type { ClientDoc } from "@/lib/types";
import {
  ACCEPT_ATTR,
  detectClientType,
  uploadFileToServer,
} from "@/lib/upload-client";
import { UploadIcon } from "./icons";

interface Props {
  onUploaded: (doc: ClientDoc) => void;
}

// Compact upload affordance for the sidebar — shown after the user already
// has at least one document loaded. Triggers the file picker directly; while
// busy, swaps to a small spinner row so the upload progress doesn't take over
// the whole pane.
export default function SidebarUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setPendingName(file.name);
    try {
      const doc = await uploadFileToServer(file);
      onUploaded(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      setPendingName(null);
    }
  }

  if (busy && pendingName) {
    return (
      <div className="side-upload-busy">
        <span className="side-upload-spinner" />
        <span className="side-upload-busy-text">
          Indexing {detectClientType(pendingName).toLowerCase()} · {pendingName}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        className="side-upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <UploadIcon width={14} height={14} />
        <span>Add document</span>
      </button>
      {error && <div className="side-upload-error">{error}</div>}
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
    </>
  );
}
