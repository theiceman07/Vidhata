import { cn } from "@/lib/utils";

/**
 * The position readout.
 *
 * A precision instrument tells you where you are at all times. In a
 * contract, where you are is the clause you are reading, the finding you
 * are holding, and the state the document is in:
 *
 *   LEASE AGREEMENT · DRAFT 03 · CLAUSE 7.1 · FINDING 04 · AWAITING ADVOCATE
 *
 * Segments are passed in already built, so each caller decides what is
 * worth reporting. Empty and null segments are dropped rather than
 * rendering a stray separator.
 */
export function Dateline({
  segments,
  className,
}: {
  segments: (string | null | undefined | false)[];
  className?: string;
}) {
  const parts = segments.filter((s): s is string => Boolean(s));
  if (parts.length === 0) return null;

  return (
    <p
      className={cn(
        "font-mono text-notation uppercase tracking-notation text-muted-fg",
        className,
      )}
    >
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 && <span className="mx-2 text-line">·</span>}
          {part}
        </span>
      ))}
    </p>
  );
}
