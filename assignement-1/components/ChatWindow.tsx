"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import type { ChatMessage, PersonaMeta } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  persona: PersonaMeta;
  isStreaming: boolean;
  showTyping: boolean;
}

export default function ChatWindow({
  messages,
  persona,
  isStreaming,
  showTyping,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming, showTyping]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 sm:px-6">
      {messages.map((m, i) => (
        <MessageBubble key={i} message={m} persona={persona} />
      ))}
      {showTyping && <TypingIndicator persona={persona} />}
      <div ref={endRef} />
    </div>
  );
}
