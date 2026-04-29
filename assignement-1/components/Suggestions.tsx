"use client";

import type { PersonaMeta } from "@/lib/types";

interface Props {
  persona: PersonaMeta;
  onPick: (text: string) => void;
  disabled?: boolean;
}

export default function Suggestions({ persona, onPick, disabled }: Props) {
  return (
    <div>
      <div className="chips-label">Start a conversation</div>
      <div className="chips">
        {persona.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            disabled={disabled}
            onClick={() => onPick(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
