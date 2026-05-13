"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ClientDoc } from "@/lib/types";
import SourceCards, { type Source } from "./SourceCard";
import {
  ChevronIcon,
  CopyIcon,
  MoreIcon,
  RefreshIcon,
  SendIcon,
} from "./icons";

interface Props {
  docs: ClientDoc[];
  onClearAll: () => void;
  onSourcesChange: (cited: Source[]) => void;
}

interface Turn extends ChatMessage {
  id: string;
  sources?: Source[];
  pending?: boolean;
}

const STARTERS: string[] = [
  "Summarize this document in three bullet points.",
  "What are the main takeaways or conclusions?",
  "List the key numbers, dates, or names mentioned.",
  "What does this document recommend or argue for?",
];

function uid() {
  return Math.random().toString(36).slice(2);
}

// Walks a string and replaces [page N] / [row N] / [source] with chip spans.
// Returns an array of strings + JSX so it can be spliced back into a parent.
const CITE_RE = /\[(page|row)\s+(\d+)\]|\[source\]|\[image\]/gi;

function tokenizeCitations(input: string): ReactNode[] {
  if (!CITE_RE.test(input)) {
    CITE_RE.lastIndex = 0;
    return [input];
  }
  CITE_RE.lastIndex = 0;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = CITE_RE.exec(input)) !== null) {
    if (m.index > last) out.push(input.slice(last, m.index));
    const matched = m[0].toLowerCase();
    let label: string;
    if (matched === "[source]") label = "src";
    else if (matched === "[image]") label = "img";
    else if ((m[1] ?? "").toLowerCase() === "page") label = `p.${m[2]}`;
    else label = `r.${m[2]}`;
    out.push(
      <span key={`c${i++}`} className="cite">
        {label}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push(input.slice(last));
  return out;
}

// react-markdown gives us a tree of React elements. Recurse into it and replace
// citation patterns inside any string leaf — that way the chip pills survive
// being inside <strong>, <li>, <h3>, table cells, etc.
function injectCitations(node: ReactNode): ReactNode {
  if (typeof node === "string") return tokenizeCitations(node);
  if (Array.isArray(node)) return node.map(injectCitations);
  if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.props.children == null) return node;
    return cloneElement(
      node,
      undefined,
      ...Children.toArray(injectCitations(node.props.children))
    );
  }
  return node;
}

// react-markdown's Components map is strictly typed per HTML element. Each
// override walks its children to swap [page N] / [row N] / [source] tokens for
// chip pills before handing them back to React.
const MARKDOWN_COMPONENTS: import("react-markdown").Components = {
  p: ({ children, ...rest }) => <p {...rest}>{injectCitations(children)}</p>,
  li: ({ children, ...rest }) => <li {...rest}>{injectCitations(children)}</li>,
  h1: ({ children, ...rest }) => <h1 {...rest}>{injectCitations(children)}</h1>,
  h2: ({ children, ...rest }) => <h2 {...rest}>{injectCitations(children)}</h2>,
  h3: ({ children, ...rest }) => <h3 {...rest}>{injectCitations(children)}</h3>,
  h4: ({ children, ...rest }) => <h4 {...rest}>{injectCitations(children)}</h4>,
  h5: ({ children, ...rest }) => <h5 {...rest}>{injectCitations(children)}</h5>,
  h6: ({ children, ...rest }) => <h6 {...rest}>{injectCitations(children)}</h6>,
  strong: ({ children, ...rest }) => (
    <strong {...rest}>{injectCitations(children)}</strong>
  ),
  em: ({ children, ...rest }) => <em {...rest}>{injectCitations(children)}</em>,
  blockquote: ({ children, ...rest }) => (
    <blockquote {...rest}>{injectCitations(children)}</blockquote>
  ),
  td: ({ children, ...rest }) => <td {...rest}>{injectCitations(children)}</td>,
  th: ({ children, ...rest }) => <th {...rest}>{injectCitations(children)}</th>,
};

function AnswerBody({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div className="ai-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {text}
      </ReactMarkdown>
      {streaming && <span className="streaming-cursor" />}
    </div>
  );
}

function AiTurn({ turn }: { turn: Turn }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    const flat = turn.content.replace(/\[(?:page|row)\s+\d+\]|\[source\]/gi, "");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(flat).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const sources = turn.sources ?? [];

  return (
    <div className="msg-ai">
      <div className="ai-avatar">N</div>
      <div className="ai-body">
        <AnswerBody text={turn.content} streaming={!!turn.pending} />

        {!turn.pending && (
          <div className="ai-foot">
            {sources.length > 0 && (
              <button
                className={"sources-toggle" + (open ? " is-open" : "")}
                onClick={() => setOpen((v) => !v)}
              >
                <span>Sources</span>
                <span className="count">{sources.length}</span>
                <span className="chev">
                  <ChevronIcon />
                </span>
              </button>
            )}
            <button className="ai-action" onClick={onCopy}>
              <CopyIcon /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        {!turn.pending && open && sources.length > 0 && (
          <SourceCards sources={sources} />
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ docs, onClearAll, onSourcesChange }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Note: we deliberately don't reset turns when the doc set changes, so
  // adding or removing a document mid-conversation keeps the thread intact.
  // The parent unmounts ChatWindow entirely when docs.length drops to 0,
  // which is the natural reset path.

  // Auto-scroll on new turns / streaming updates.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  // Auto-grow the composer textarea up to a sensible cap.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // Aggregate every cited source across the thread for the sidebar.
  const allCited = useMemo(() => {
    const flat: Source[] = [];
    turns.forEach((t) => {
      if (t.role === "assistant" && t.sources) flat.push(...t.sources);
    });
    return flat;
  }, [turns]);

  useEffect(() => {
    onSourcesChange(allCited);
  }, [allCited, onSourcesChange]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    const userTurn: Turn = { id: uid(), role: "user", content: trimmed };
    const botId = uid();
    setTurns((t) => [
      ...t,
      userTurn,
      { id: botId, role: "assistant", content: "", pending: true },
    ]);
    setInput("");
    setBusy(true);

    try {
      const history: ChatMessage[] = turns
        .filter((t) => !t.pending)
        .map((t) => ({ role: t.role, content: t.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: docs.map((d) => d.documentId),
          question: trimmed,
          history,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Chat failed (${res.status})`);
      }

      let sources: Source[] = [];
      try {
        const raw = res.headers.get("X-Sources");
        if (raw) sources = JSON.parse(decodeURIComponent(raw)) as Source[];
      } catch {
        sources = [];
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns((t) =>
          t.map((turn) =>
            turn.id === botId ? { ...turn, content: acc, pending: true } : turn
          )
        );
      }

      setTurns((t) =>
        t.map((turn) =>
          turn.id === botId
            ? { ...turn, content: acc, sources, pending: false }
            : turn
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setTurns((t) =>
        t.map((turn) =>
          turn.id === botId
            ? { ...turn, content: `Error: ${message}`, pending: false }
            : turn
        )
      );
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const canSend = !busy && input.trim().length > 0 && docs.length > 0;
  const totalChunks = docs.reduce((acc, d) => acc + d.chunkCount, 0);
  const headline =
    docs.length === 1
      ? docs[0].fileName.replace(/\.[^.]+$/, "")
      : `${docs.length} documents`;
  const topbarTitle =
    docs.length === 1
      ? docs[0].fileName
      : `${docs.length} documents`;

  return (
    <main className="main">
      <div className="topbar">
        <div className="topbar-title">
          {turns.length === 0 ? (
            <>
              {topbarTitle}
              <span className="muted"> · ready</span>
            </>
          ) : (
            <>
              {topbarTitle}
              <span className="muted">
                {" · "}
                {Math.ceil(
                  turns.filter((t) => !t.pending || t.content.length > 0).length / 2
                )}{" "}
                {Math.ceil(turns.length / 2) === 1 ? "question" : "questions"}
              </span>
            </>
          )}
        </div>
        <div className="topbar-actions">
          <button
            className="icon-btn"
            title="Clear all and start over"
            onClick={onClearAll}
          >
            <RefreshIcon />
          </button>
          <button className="icon-btn" title="More">
            <MoreIcon />
          </button>
        </div>
      </div>

      <div className="scroll-area" ref={scrollRef}>
        {turns.length === 0 ? (
          <div className="ready-empty">
            <div className="ready-eyebrow">
              <span className="dot" />
              ready · {totalChunks} chunk{totalChunks === 1 ? "" : "s"} across {docs.length} document{docs.length === 1 ? "" : "s"}
            </div>
            <div className="ready-headline">
              <em>{headline}</em>
            </div>
            <div className="ready-sub">
              {docs.length === 1
                ? "Answers will be grounded strictly in this document. If something isn't in the text, the model will say so."
                : "Answers will be grounded strictly in these documents — every claim cites the file it came from. If something isn't in any of them, the model will say so."}
            </div>
            <div className="starter-grid">
              {STARTERS.map((q, i) => (
                <button
                  key={i}
                  className="starter"
                  onClick={() => void send(q)}
                  disabled={busy}
                >
                  <span className="starter-num">
                    Q.{String(i + 1).padStart(2, "0")}
                  </span>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="thread">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="msg-user">
                  {t.content}
                </div>
              ) : (
                <AiTurn key={t.id} turn={t} />
              )
            )}
          </div>
        )}
      </div>

      <div className="composer-wrap">
        <div
          className={
            "composer" +
            (focus ? " is-focused" : "") +
            (busy ? " is-disabled" : "")
          }
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onKeyDown={onKeyDown}
            placeholder={
              busy
                ? "Thinking…"
                : docs.length === 1
                  ? "Ask a question about this document…"
                  : `Ask a question across your ${docs.length} documents…`
            }
          />
          <button
            className="send-btn"
            disabled={!canSend}
            onClick={() => void send(input)}
            aria-label="Send"
          >
            <SendIcon />
          </button>
        </div>
        <div className="composer-hint">
          <span>
            grounded in {docs.length === 1 ? "the document" : "your documents"} · cites every claim
          </span>
          <span>
            <kbd>↵</kbd> send · <kbd>⇧</kbd>+<kbd>↵</kbd> newline
          </span>
        </div>
      </div>
    </main>
  );
}
