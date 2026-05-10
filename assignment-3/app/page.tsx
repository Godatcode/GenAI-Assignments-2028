"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import ChatWindow from "@/components/ChatWindow";
import type { Source } from "@/components/SourceCard";
import type { ClientDoc } from "@/lib/types";

const STORAGE_KEY = "notebook-rag.doc";

export default function Home() {
  const [doc, setDoc] = useState<ClientDoc | null>(null);
  const [cited, setCited] = useState<Source[]>([]);
  // Track hydration so the persistence effect doesn't blank out a stored doc
  // before the read-from-storage effect has had a chance to run.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDoc(JSON.parse(raw) as ClientDoc);
    } catch {
      // corrupted entry — ignore and let the user re-upload
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (doc) localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // quota exceeded / privacy mode — fail quietly
    }
  }, [doc, hydrated]);

  const handleReplace = useCallback(() => {
    setDoc(null);
    setCited([]);
  }, []);

  return (
    <div className="app">
      <Sidebar doc={doc} cited={cited} onReplace={handleReplace} />

      {doc ? (
        <ChatWindow
          doc={doc}
          onReplace={handleReplace}
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
            <FileUpload onUploaded={setDoc} />
          </div>
        </main>
      )}
    </div>
  );
}
