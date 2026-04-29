"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonaMeta } from "@/lib/types";

interface Props {
  persona: PersonaMeta;
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function Composer({ persona, onSend, disabled }: Props) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [val]);

  const submit = () => {
    const t = val.trim();
    if (!t || disabled) return;
    onSend(t);
    setVal("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          disabled={disabled}
          placeholder={`Ask ${persona.name.split(" ")[0]} something…`}
        />
        <button
          type="button"
          className="send-btn"
          onClick={submit}
          disabled={!val.trim() || disabled}
        >
          Send <span className="arr">→</span>
        </button>
      </div>
      <div className="foot">
        <span>↵ to send · Shift+↵ for newline</span>
        <span>Persona-based AI · responses are generated</span>
      </div>
    </div>
  );
}
