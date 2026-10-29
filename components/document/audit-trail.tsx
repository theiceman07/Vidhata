import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ActivityTrack } from "@/components/document/activity-track";

/**
 * What the trail reads of an entry. The advocate's entries (AuditEntry) name a
 * finding by its id, a client's (ClientAuditEntry) by its number, and either
 * satisfies this, so one component draws both portals' records.
 */
export interface TrailEntry {
  at: string;
  actor: string;
  action: string;
  ref: string | null;
  kind: "event" | "decision";
  findingId?: string | null;
  findingNumber?: string | null;
}

/**
 * The retained record.
 *
 * Newest first, because the question it answers is usually "what happened
 * last". Decisions (a finding settled, a source withdrawn, the sign-off) carry
 * a solid accent dot; events carry a hollow one. Each entry states what
 * happened, then who did it, then when.
 *
 * Three shapes:
 * - `timeline`: one horizontal track, newest first (ActivityTrack), paged by arrows.
 * - `large`: a grid of tiles, for a page whose subject the record is.
 * - default: a compact list for a side panel.
 */
export function AuditTrail({
  entries,
  onSelectFinding,
  title = "Activity",
  className,
  large = false,
  timeline = false,
}: {
  entries: TrailEntry[];
  /** When set, entries about a finding link to it, by its id or its number. */
  onSelectFinding?: (finding: string) => void;
  title?: string | null;
  className?: string;
  /** Tile grid for a record that is the page's subject rather than a side panel. */
  large?: boolean;
  /** Horizontal track. Takes precedence over `large`. */
  timeline?: boolean;
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
      {title && <h2 className="text-body font-medium text-ink">{title}</h2>}

      {timeline ? (
        <div className={cn(title && "mt-3")}>
          {/* What the two kinds of dot mean, stated once above the record. */}
          <p className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-meta text-muted-fg">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-3 rounded-full border border-accent bg-accent"
              />
              Decision by the advocate
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border border-muted-fg bg-paper"
              />
              Event recorded
            </span>
          </p>
          <ActivityTrack
            entries={newestFirst}
            onSelectFinding={onSelectFinding}
          />
        </div>
      ) : (
        <ol
          className={cn(
            title && !timeline && "mt-3",
            large
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-1",
          )}
        >
          {newestFirst.map((entry, i) => {
            const findingKey = entry.findingId ?? entry.findingNumber ?? null;
            const linkable = onSelectFinding && findingKey;
            const dot = (
              <span
                aria-hidden
                className={cn(
                  "inline-block h-2 w-2 shrink-0 rounded-full border",
                  entry.kind === "decision"
                    ? "border-accent bg-accent"
                    : "border-muted-fg bg-paper",
                )}
              />
            );
            const time = (
              <time
                dateTime={entry.at}
                className="tabular-nums text-small text-muted-fg"
              >
                {format(new Date(entry.at), "d MMM yyyy · HH:mm")}
              </time>
            );

            const body = large ? (
              <>
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-small text-muted-fg">
                    {dot}
                    {entry.kind === "decision" ? "Decision" : "Event"}
                  </span>
                  {time}
                </span>
                <span className="mt-4 block font-display text-h3 text-ink">
                  {entry.action}
                </span>
                {entry.ref && (
                  <span className="mt-1 block tabular-nums text-small text-muted-fg">
                    {entry.ref}
                  </span>
                )}
                <span className="mt-auto block pt-4 text-meta text-muted-fg">
                  {entry.actor}
                </span>
              </>
            ) : (
              <span className="flex items-start gap-3">
                <span className="mt-1.5">{dot}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-meta text-ink">
                    {entry.action}
                  </span>
                  {entry.ref && (
                    <span className="mt-0.5 block tabular-nums text-small text-muted-fg">
                      {entry.ref}
                    </span>
                  )}
                  <span className="mt-0.5 block text-small text-muted-fg">
                    {entry.actor}
                    <span aria-hidden className="mx-1.5 text-muted-fg">
                      ·
                    </span>
                    {time}
                  </span>
                </span>
              </span>
            );

            const frame = large
              ? "flex h-full flex-col rounded-card bg-paper p-5"
              : "rounded-control px-2 py-1.5";

            return (
              <li key={`${entry.at}-${i}`} className="min-w-0">
                {linkable ? (
                  <button
                    type="button"
                    onClick={() => onSelectFinding(findingKey as string)}
                    className={cn(
                      frame,
                      "w-full text-left transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    )}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={frame}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
