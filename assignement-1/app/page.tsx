"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Avatar from "@/components/Avatar";
import PersonaCard from "@/components/PersonaCard";
import Hero from "@/components/Hero";
import Suggestions from "@/components/Suggestions";
import Message from "@/components/Message";
import Composer from "@/components/Composer";
import ThemeToggle from "@/components/ThemeToggle";
import { PERSONAS, getPersona } from "@/lib/personas";
import type { ChatMessage, PersonaId } from "@/lib/types";

type ThreadMap = Record<PersonaId, ChatMessage[]>;
type ErrorMap = Record<PersonaId, string | null>;

const EMPTY_THREADS: ThreadMap = { anshuman: [], abhimanyu: [], kshitij: [] };
const EMPTY_ERRORS: ErrorMap = { anshuman: null, abhimanyu: null, kshitij: null };

export default function Home() {
  const [activeId, setActiveId] = useState<PersonaId>("anshuman");
  const [threads, setThreads] = useState<ThreadMap>(EMPTY_THREADS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [errors, setErrors] = useState<ErrorMap>(EMPTY_ERRORS);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persona = useMemo(() => getPersona(activeId), [activeId]);
  const messages = threads[activeId];
  const error = errors[activeId];

  const rootStyle = {
    "--accent": persona.accent,
    "--accent-soft": persona.accentSoft,
    "--accent-ink": persona.accentInk,
  } as CSSProperties;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, showTyping, activeId]);

  const switchPersona = (id: PersonaId) => {
    if (id === activeId || isStreaming) return;
    setActiveId(id);
  };

  const reset = () => {
    setThreads((p) => ({ ...p, [activeId]: [] }));
    setErrors((p) => ({ ...p, [activeId]: null }));
  };

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const personaForRequest = activeId;
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const baseHistory = [...threads[personaForRequest], userMsg];

      setErrors((p) => ({ ...p, [personaForRequest]: null }));
      setThreads((p) => ({ ...p, [personaForRequest]: baseHistory }));
      setIsStreaming(true);
      setShowTyping(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: baseHistory,
            persona: personaForRequest,
          }),
        });

        if (!res.ok || !res.body) {
          let msg = "Something went wrong. Please try again.";
          try {
            const data = await res.json();
            if (data?.error) msg = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }

        // Push placeholder assistant message into the right thread
        setThreads((p) => ({
          ...p,
          [personaForRequest]: [
            ...p[personaForRequest],
            { role: "assistant", content: "" },
          ],
        }));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistant = "";
        let started = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          if (!started) {
            setShowTyping(false);
            started = true;
          }
          assistant += chunk;
          setThreads((p) => {
            const list = p[personaForRequest].slice();
            list[list.length - 1] = { role: "assistant", content: assistant };
            return { ...p, [personaForRequest]: list };
          });
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setErrors((p) => ({ ...p, [personaForRequest]: msg }));
        // Remove empty placeholder if the stream never produced text
        setThreads((p) => {
          const list = p[personaForRequest].slice();
          if (
            list.length &&
            list[list.length - 1].role === "assistant" &&
            !list[list.length - 1].content
          ) {
            list.pop();
          }
          return { ...p, [personaForRequest]: list };
        });
      } finally {
        setIsStreaming(false);
        setShowTyping(false);
      }
    },
    [activeId, isStreaming, threads]
  );

  return (
    <div className="app paper-bg" style={rootStyle} data-persona={persona.id}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Lectern</div>
          <div className="brand-sub">Persona Chat · v1</div>
        </div>
        <div className="section-label">Choose your conversation</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {PERSONAS.map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              active={p.id === activeId}
              disabled={isStreaming && p.id !== activeId}
              onClick={() => switchPersona(p.id)}
            />
          ))}
        </div>
        <div className="sidebar-foot">
          <div>SCALER × INTERVIEWBIT</div>
          <div style={{ marginTop: 4 }}>BUILT FOR PROMPT-ENG · 2026</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <Avatar persona={persona} />
            <span className="topbar-meta">
              CHAT · {persona.id.toUpperCase()}
            </span>
            <span className="topbar-title">a conversation, not a query</span>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="icon-btn"
              title="Reset conversation"
              aria-label="Reset conversation"
              onClick={reset}
            >
              ↺
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div className="mobile-persona-row" role="tablist" aria-label="Personas">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pill ${p.id === activeId ? "active" : ""}`}
              role="tab"
              aria-selected={p.id === activeId}
              disabled={isStreaming && p.id !== activeId}
              onClick={() => switchPersona(p.id)}
              style={
                {
                  "--accent": p.accent,
                  "--accent-soft": p.accentSoft,
                  "--accent-ink": p.accentInk,
                } as CSSProperties
              }
            >
              {p.name.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="scroll" ref={scrollRef}>
          <div className="column">
            <Hero persona={persona} />
            {messages.length === 0 ? (
              <>
                <p className="pullquote">{persona.pullQuote}</p>
                <ol className="knownfor">
                  {persona.knownFor.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ol>
                {error && (
                  <div className="error-banner" style={{ marginBottom: 24 }}>
                    {error}
                  </div>
                )}
                <Suggestions
                  persona={persona}
                  onPick={send}
                  disabled={isStreaming}
                />
              </>
            ) : (
              <div className="thread">
                {messages.map((m, i) => (
                  <Message key={i} msg={m} persona={persona} />
                ))}
                {showTyping && (
                  <Message
                    msg={{ role: "assistant", content: "" }}
                    persona={persona}
                    typing
                  />
                )}
                {error && <div className="error-banner">{error}</div>}
              </div>
            )}
          </div>
        </div>

        <Composer persona={persona} onSend={send} disabled={isStreaming} />
      </main>
    </div>
  );
}
