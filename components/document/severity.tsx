import { cn } from "@/lib/utils";
import { SEVERITY_ORDER, type Severity } from "@/lib/types";

const FILL: Record<Severity, string> = {
  // Critical is ink, and a diamond rather than a square (below): not a deeper red, so it
  // never reads as high at a glance, and the word beside it always says which it is.
  critical: "bg-ink border-ink rotate-45",
  high: "bg-blocked border-blocked",
  medium: "bg-blocked/50 border-blocked",
  // Low carries no colour. Colour is spent where it changes a decision.
  low: "bg-transparent border-muted-fg",
};

const WORD: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** The glyph alone, for dense rows where the word sits beside it anyway. */
export function SeverityGlyph({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-[2px] border",
        FILL[severity],
        className,
      )}
    />
  );
}

/** Severity as a glyph and a word. Never the glyph alone. */
export function SeverityMark({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-label font-medium text-ink",
        className,
      )}
    >
      <SeverityGlyph severity={severity} />
      {WORD[severity]}
    </span>
  );
}

/**
 * The shape of the remaining work, read in a glance: a count per severity with
 * its glyph, zeroes dimmed rather than dropped, so the columns line up
 * from one row to the next.
 */
export function SeverityCounts({
  counts,
  className,
  labelled = false,
}: {
  counts: Record<Severity, number>;
  className?: string;
  /** Say the word beside each count, as the legend does. */
  labelled?: boolean;
}) {
  const order = SEVERITY_ORDER;
  const summary = order
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(", ");

  return (
    <span
      role="img"
      className={cn("inline-flex items-center gap-3", className)}
      aria-label={summary ? `Severity: ${summary}` : "No findings"}
    >
      {order.map((s) => (
        <span
          key={s}
          aria-hidden
          title={`${counts[s]} ${s}`}
          className={cn(
            "inline-flex items-center gap-1 text-label tabular-nums",
            counts[s] === 0 ? "text-muted-fg/50" : "text-ink",
          )}
        >
          <SeverityGlyph
            severity={s}
            className={counts[s] === 0 ? "opacity-30" : undefined}
          />
          {labelled && <span>{WORD[s]}</span>}
          {counts[s]}
        </span>
      ))}
    </span>
  );
}
