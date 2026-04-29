"use client";

interface Props {
  chips: string[];
  onPick: (chip: string) => void;
  disabled?: boolean;
}

export default function SuggestionChips({ chips, onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          disabled={disabled}
          onClick={() => onPick(chip)}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 sm:text-sm"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
