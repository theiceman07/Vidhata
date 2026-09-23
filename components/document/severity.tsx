import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const FILL: Record<Severity, string> = {
  high: "bg-flagged border-flagged",
  medium: "bg-caution border-caution",
  // Low carries no colour. Colour is spent where it changes a decision.
  low: "bg-transparent border-muted-fg",
};

const WORD: Record<Severity, string> = {
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
 * The shape of the remaining work, read in a glance: three counts with
 * their glyphs, zeroes dimmed rather than dropped, so the columns line up
 * from one row to the next.
 */
export function SeverityCounts({
  counts,
  className,
}: {
  counts: Record<Severity, number>;
  className?: string;
}) {
  const order: Severity[] = ["high", "medium", "low"];
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
          {counts[s]}
        </span>
      ))}
    </span>
  );
}
