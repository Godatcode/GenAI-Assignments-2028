"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import ChatWindow from "@/components/ChatWindow";
import type { Source } from "@/components/SourceCard";
import type { ClientDoc } from "@/lib/types";

const STORAGE_KEY = "notebook-rag.docs";
const LEGACY_KEY = "notebook-rag.doc";

export default function Home() {
  const [docs, setDocs] = useState<ClientDoc[]>([]);
  const [cited, setCited] = useState<Source[]>([]);
  // Track hydration so the persistence effect doesn't blank out a stored set
  // before the read-from-storage effect has had a chance to run.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setDocs(parsed as ClientDoc[]);
      } else {
        // One-shot migration from the v1 single-doc key.
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const single = JSON.parse(legacy) as ClientDoc;
          setDocs([single]);
          localStorage.removeItem(LEGACY_KEY);
        }
      }
    } catch {
      // corrupted entry — ignore and let the user re-upload
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (docs.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // quota / privacy mode — fail quietly
    }
  }, [docs, hydrated]);

  const handleAdd = useCallback((doc: ClientDoc) => {
    setDocs((prev) => {
      // Deduplicate by documentId — re-uploads of the same id (shouldn't
      // happen given server-side uuid, but just in case) replace the old tile.
      const without = prev.filter((d) => d.documentId !== doc.documentId);
      return [...without, doc];
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setDocs((prev) => prev.filter((d) => d.documentId !== id));
  }, []);

  const handleClear = useCallback(() => {
    setDocs([]);
    setCited([]);
  }, []);

  return (
    <div className="app">
      <Sidebar
        docs={docs}
        cited={cited}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onClear={handleClear}
      />

      {docs.length > 0 ? (
        <ChatWindow
          docs={docs}
          onClearAll={handleClear}
          onSourcesChange={setCited}
        />
      ) : (
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">
              Notebook
              <span className="muted"> — start by uploading a document</span>
            </div>
          </div>
          <div className="scroll-area">
            <FileUpload onUploaded={handleAdd} />
          </div>
        </main>
      )}
    </div>
  );
}
