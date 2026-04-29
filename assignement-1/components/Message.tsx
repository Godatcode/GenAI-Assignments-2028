"use client";

import type { CSSProperties } from "react";
import type { ChatMessage, PersonaMeta } from "@/lib/types";

interface Props {
  msg: ChatMessage;
  persona: PersonaMeta;
  typing?: boolean;
}

export default function Message({ msg, persona, typing }: Props) {
  if (msg.role === "user") {
    return (
      <div className="msg user">
        <div className="who">YOU</div>
        <div className="body">{msg.content}</div>
      </div>
    );
  }
  const style = {
    "--accent": persona.accent,
    "--accent-soft": persona.accentSoft,
    "--accent-ink": persona.accentInk,
  } as CSSProperties;
  return (
    <div className="msg bot" style={style}>
      <div className="who">{persona.initials}</div>
      <div className="body">
        {typing ? (
          <div className="typing">
            <span />
            <span />
            <span />
          </div>
        ) : (
          msg.content
        )}
      </div>
    </div>
  );
}
