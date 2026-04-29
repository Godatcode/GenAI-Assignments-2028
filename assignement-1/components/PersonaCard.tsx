"use client";

import type { CSSProperties } from "react";
import type { PersonaMeta } from "@/lib/types";
import Avatar from "./Avatar";

interface Props {
  persona: PersonaMeta;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function PersonaCard({ persona, active, disabled, onClick }: Props) {
  const style = {
    "--card-accent": persona.accent,
    "--card-accent-soft": persona.accentSoft,
    "--card-accent-ink": persona.accentInk,
  } as CSSProperties;
  return (
    <button
      type="button"
      className={`persona-card ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      <Avatar persona={persona} />
      <div className="meta">
        <div className="name">{persona.name}</div>
        <div className="role">{persona.role}</div>
      </div>
    </button>
  );
}
