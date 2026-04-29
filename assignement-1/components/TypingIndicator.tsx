"use client";

import type { PersonaMeta } from "@/lib/types";

export default function TypingIndicator({ persona }: { persona: PersonaMeta }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white ${persona.accent}`}
      >
        {persona.initials}
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm dark:bg-zinc-900">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
      style={{ animationDelay: delay }}
    />
  );
}
