"use client";

import { useCallback, useMemo, useState } from "react";
import PersonaSwitcher from "@/components/PersonaSwitcher";
import SuggestionChips from "@/components/SuggestionChips";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import { SUGGESTION_CHIPS, getPersona } from "@/lib/personas";
import type { ChatMessage, PersonaId } from "@/lib/types";

export default function Home() {
  const [persona, setPersona] = useState<PersonaId>("anshuman");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personaMeta = useMemo(() => getPersona(persona), [persona]);

  const handleSwitch = useCallback((id: PersonaId) => {
    setPersona(id);
    setMessages([]);
    setInput("");
    setError(null);
    setIsStreaming(false);
    setShowTyping(false);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages(nextMessages);
      setInput("");
      setIsStreaming(true);
      setShowTyping(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, persona }),
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

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistant = "";
        let started = false;
        setMessages((m) => [...m, { role: "assistant", content: "" }]);

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
          setMessages((m) => {
            const copy = m.slice();
            copy[copy.length - 1] = { role: "assistant", content: assistant };
            return copy;
          });
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setError(msg);
        setMessages((m) => {
          if (
            m.length &&
            m[m.length - 1].role === "assistant" &&
            !m[m.length - 1].content
          ) {
            return m.slice(0, -1);
          }
          return m;
        });
      } finally {
        setIsStreaming(false);
        setShowTyping(false);
      }
    },
    [isStreaming, messages, persona]
  );

  const isEmpty = messages.length === 0;

  return (
    <main className="flex h-[100dvh] flex-col bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-black dark:text-zinc-50">
      <header className="border-b border-zinc-200/70 bg-white/70 px-3 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/60 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                Scaler Persona Chat
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Talk with Anshuman, Abhimanyu, or Kshitij
              </p>
            </div>
            <span className="hidden rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 sm:inline-block">
              Now chatting with{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {personaMeta.name}
              </span>
            </span>
          </div>
          <PersonaSwitcher active={persona} onChange={handleSwitch} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white ${personaMeta.accent}`}
              >
                {personaMeta.initials}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{personaMeta.name}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {personaMeta.title}
                </p>
              </div>
            </div>
            <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">
              Ask anything — career advice, interview prep, the founder journey.
              Pick a starter below or type your own.
            </p>
            <SuggestionChips
              chips={SUGGESTION_CHIPS[persona]}
              onPick={(c) => send(c)}
              disabled={isStreaming}
            />
          </div>
        ) : (
          <ChatWindow
            messages={messages}
            persona={personaMeta}
            isStreaming={isStreaming}
            showTyping={showTyping}
          />
        )}

        <div className="border-t border-zinc-200/70 bg-white/70 px-3 py-3 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/60 sm:px-6">
          {error && (
            <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            disabled={isStreaming}
            placeholder={`Message ${personaMeta.name.split(" ")[0]}…`}
          />
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Persona-based AI. Responses are generated and may not reflect the
            real person&apos;s views.
          </p>
        </div>
      </div>
    </main>
  );
}
