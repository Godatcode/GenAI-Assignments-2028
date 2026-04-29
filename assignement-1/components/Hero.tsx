"use client";

import type { PersonaMeta } from "@/lib/types";
import Avatar from "./Avatar";

export default function Hero({ persona }: { persona: PersonaMeta }) {
  const [first, ...rest] = persona.name.split(" ");
  return (
    <div className="hero">
      <Avatar persona={persona} size="xl" />
      <div>
        <div className="hero-eyebrow">
          <span className="dot" />
          NOW IN CONVERSATION WITH
        </div>
        <h1 className="hero-name">
          <em>{first}</em> {rest.join(" ")}
        </h1>
        <div className="hero-role">
          {persona.role} &nbsp;·&nbsp; {persona.location}
        </div>
        <p className="hero-tag">{persona.tagline}</p>
      </div>
    </div>
  );
}
