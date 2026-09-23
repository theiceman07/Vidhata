import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/lib/audit";

/**
 * The retained record.
 *
 * A timeline, newest first, because the question it answers is usually
 * "what happened last". Decisions (a finding settled, a source withdrawn,
 * the sign-off) are marked in accent ink; events are hollow. Each line
 * states what happened, then who did it, then when.
 */
export function AuditTrail({
  entries,
  onSelectFinding,
  title = "Activity",
  className,
}: {
  entries: AuditEntry[];
  /** When set, entries about a finding link to it. */
  onSelectFinding?: (findingId: string) => void;
  title?: string | null;
  className?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className={cn("text-meta text-muted-fg", className)}>
        Nothing has been recorded against this document yet.
      </p>
    );
  }

  const newestFirst = [...entries].reverse();

  return (
    <section className={className}>
      {title && <h2 className="text-label font-medium text-muted-fg">{title}</h2>}

      <ol className={cn("relative", title && "mt-3")}>
        {newestFirst.map((entry, i) => {
          const linkable = onSelectFinding && entry.findingId;
          const body = (
            <>
              <span className="block text-meta text-ink">
                {entry.action}
                {entry.ref && (
                  <span className="ml-1.5 font-mono text-label text-muted-fg">
                    {entry.ref}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-label text-muted-fg">
                {entry.actor}
                <span className="mx-1.5 text-line">·</span>
                <time dateTime={entry.at} className="font-mono">
                  {format(new Date(entry.at), "d MMM yyyy · HH:mm")}
                </time>
              </span>
            </>
          );

          return (
            <li key={`${entry.at}-${i}`} className="relative pb-4 pl-5 last:pb-0">
              {/* The spine. */}
              {i < newestFirst.length - 1 && (
                <span aria-hidden className="absolute bottom-0 left-[3px] top-3 w-px bg-line" />
              )}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1.5 h-[7px] w-[7px] rounded-[1px] border",
                  entry.kind === "decision"
                    ? "border-accent bg-accent"
                    : "border-muted-fg bg-paper",
                )}
              />
              {linkable ? (
                <button
                  type="button"
                  onClick={() => onSelectFinding(entry.findingId as string)}
                  className="block w-full rounded-control text-left transition-colors hover:bg-parchment/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {body}
                </button>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
