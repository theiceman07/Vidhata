import { Icon } from "@/components/shared/icon";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  onCiteClick?: (clauseReference: string) => void;
}

/** A citation to a numbered clause can be followed; "Summary" and the like are labels only. */
const isClause = (reference: string) => /\d/.test(reference);

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
          "max-w-[80%] rounded-card px-4 py-3 text-body",
          isUser
            ? "bg-accent text-accent-fg"
            : refused
              ? "border border-line bg-canvas text-ink"
              : "border border-line bg-paper text-ink shadow-card",
        )}
      >
        {refused && <p className="mb-1 text-label font-medium text-muted-fg">Not something this document answers</p>}
        <p className="whitespace-pre-wrap">{message.text}</p>
        {citations.length > 0 && (
          <ul aria-label="Clauses this answer rests on" className="mt-2 flex flex-wrap gap-2">
            {citations.map((c, i) => (
              <li key={`${c.clauseReference}-${i}`}>
                {isClause(c.clauseReference) ? (
                  <button
                    type="button"
                    title={c.quote || undefined}
                    onClick={() => onCiteClick?.(c.clauseReference)}
                    className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-small font-medium text-muted-fg transition-colors hover:bg-line"
                  >
                    <Icon name="description" size={16} />
                    {c.clauseReference}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-0.5 text-small font-medium text-muted-fg">
                    <Icon name="description" size={16} />
                    {c.clauseReference}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
