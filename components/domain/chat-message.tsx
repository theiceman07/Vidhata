import { Icon } from "@/components/shared/icon";
import type { ChatCitationView, ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  onCiteClick?: (clauseReference: string) => void;
}

/** A citation to a numbered clause can be followed; "Summary" and the like are labels only. */
const isClause = (reference: string) => /\d/.test(reference);

const CITATION_STYLES = {
  page: {
    chip: "inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-small font-medium text-muted-fg",
    link: "min-h-11 transition-colors hover:bg-line sm:min-h-0",
  },
  docked: {
    chip: "inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-meta text-ink",
    link: "min-h-11 transition-colors hover:border-ink/40 sm:min-h-0",
  },
} as const;

/**
 * The clauses an answer rests on, and what it quotes from them. The quotes sit in a native
 * disclosure, so they can be opened by keyboard, by tap and by a screen reader; they are
 * never only in a hover tooltip. Used by this page's messages and by the docked agent.
 */
export function ChatCitations({
  citations,
  variant,
  onCite,
}: {
  citations: ChatCitationView[];
  variant: keyof typeof CITATION_STYLES;
  /** Carry the reader to the clause. Called with the reference as the reply gave it. */
  onCite?: (clauseReference: string) => void;
}) {
  if (citations.length === 0) return null;
  const style = CITATION_STYLES[variant];
  const quoted = citations.filter((c) => c.quote.trim() !== "");

  return (
    <div className="mt-2">
      <ul aria-label="Clauses this answer rests on" className="flex flex-wrap items-center gap-2">
        {citations.map((c, i) => (
          <li key={`${c.clauseReference}-${i}`}>
            {isClause(c.clauseReference) ? (
              <button type="button" onClick={() => onCite?.(c.clauseReference)} className={cn(style.chip, style.link)}>
                <Icon name="description" size={16} />
                {c.clauseReference}
              </button>
            ) : (
              <span className={style.chip}>
                <Icon name="description" size={16} />
                {c.clauseReference}
              </span>
            )}
          </li>
        ))}
      </ul>
      {quoted.length > 0 && (
        <details className="mt-2 text-small text-muted-fg">
          <summary className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-control py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent">
            What it quotes
          </summary>
          <ul className="mt-1 space-y-1 border-l-2 border-line pl-3">
            {quoted.map((c, i) => (
              <li key={`${c.clauseReference}-${i}`}>
                <span className="font-medium text-ink">{c.clauseReference}</span>: &ldquo;{c.quote}&rdquo;
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function ChatMessage({ message, onCiteClick }: ChatMessageProps) {
  const isUser = message.role === "user";
  const refused = message.status === "refused";
  // A reply from the service lists every clause it rests on. The welcome line and older
  // messages carry only the one reference.
  const citations =
    message.citations && message.citations.length > 0
      ? message.citations
      : message.citedClauseReference
        ? [{ clauseReference: message.citedClauseReference, quote: "" }]
        : [];

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-card px-4 py-3 text-body sm:max-w-[80%]",
          isUser
            ? "bg-accent text-accent-fg"
            : refused
              ? "border border-line bg-canvas text-ink"
              : "border border-line bg-paper text-ink shadow-card",
        )}
      >
        {refused && <p className="mb-1 text-label font-medium text-muted-fg">Not something this document answers</p>}
        <p className="whitespace-pre-wrap">{message.text}</p>
        <ChatCitations citations={citations} variant="page" onCite={onCiteClick} />
      </div>
    </div>
  );
}
