"use client";

import type { CSSProperties } from "react";
import type { PersonaMeta } from "@/lib/types";

type Size = "sm" | "lg" | "xl";

interface Props {
  persona: PersonaMeta;
  size?: Size;
}

export default function Avatar({ persona, size = "sm" }: Props) {
  const cls = size === "xl" ? "avatar xl" : size === "lg" ? "avatar lg" : "avatar";
  const style = {
    "--card-accent-soft": persona.accentSoft,
    "--card-accent-ink": persona.accentInk,
  } as CSSProperties;
  return (
    <div className={cls} style={style} aria-label={persona.name}>
      {persona.initials}
    </div>
  );
}
