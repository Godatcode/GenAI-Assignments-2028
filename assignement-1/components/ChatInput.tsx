"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-200 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-500/20"
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim()) onSubmit();
          }
        }}
        placeholder={placeholder ?? "Type your message…"}
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
