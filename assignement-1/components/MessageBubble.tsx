"use client";

import type { ChatMessage } from "@/lib/types";
import type { PersonaMeta } from "@/lib/types";

interface Props {
  message: ChatMessage;
  persona: PersonaMeta;
}

export default function MessageBubble({ message, persona }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white ${persona.accent}`}
        >
          {persona.initials}
        </span>
      )}
      <div className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <span className="px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {persona.name}
          </span>
        )}
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-md bg-indigo-600 text-white"
              : "rounded-bl-md bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
          }`}
        >
          {message.content || " "}
        </div>
      </div>
    </div>
  );
}
