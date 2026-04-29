"use client";

import { PERSONAS } from "@/lib/personas";
import type { PersonaId } from "@/lib/types";

interface Props {
  active: PersonaId;
  onChange: (id: PersonaId) => void;
}

export default function PersonaSwitcher({ active, onChange }: Props) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto p-1 sm:gap-3">
      {PERSONAS.map((p) => {
        const isActive = p.id === active;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`group flex min-w-[170px] flex-1 items-center gap-3 rounded-xl border px-3 py-2 text-left transition sm:px-4 sm:py-3 ${
              isActive
                ? "border-transparent bg-white shadow-sm ring-2 ring-indigo-500/60 dark:bg-zinc-900"
                : "border-zinc-200 bg-white/60 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white sm:h-10 sm:w-10 sm:text-sm ${p.accent}`}
            >
              {p.initials}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                {p.name}
              </span>
              <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                {p.title}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
