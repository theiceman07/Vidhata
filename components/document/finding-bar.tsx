"use client";

import { cn } from "@/lib/utils";
import { blockingCitations, findingState } from "@/lib/findings";
import type { Finding } from "@/lib/types";
import { FindingRule } from "./finding-rule";
import { SeverityMark } from "./severity";
import { StateLabel } from "./state-label";

/**
 * A finding as it appears in the margin of its clause.
 *
 * Annotation, not cards: no border, no shadow, no surrounding box. A rule
 * in the severity colour, then the facts a reviewer triages on (number,
 * severity, state, whether its source holds), then the concern.
 *
 * Hovering it lights the passage it concerns, so the link between the
 * words and the note is visible before anything is clicked.
 *
 * A settled finding collapses to a single line but is never removed.
 */
export function FindingBar({
  finding,
  number,
  selected,
  onSelect,
  onHover,
}: {
  finding: Finding;
  /** Display ordinal, "04". Never the opaque id. */
  number: string;
  selected: boolean;
  onSelect: () => void;
  onHover?: (hovering: boolean) => void;
}) {
  const state = findingState(finding);
  const settled = state === "settled";
  const blocked = blockingCitations(finding).length > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "relative block w-full rounded-r-control py-2.5 pl-4 pr-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected ? "bg-parchment" : "hover:bg-parchment/60",
      )}
    >
      <FindingRule finding={finding} className={selected ? "w-1" : undefined} />

      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-label text-muted-fg">Finding {number}</span>
        {!settled && <SeverityMark severity={finding.severity} />}
        <StateLabel state={state} />
        {blocked && <StateLabel state="citation_blocked" />}
      </span>

      <span
        className={cn(
          "mt-1 block text-meta",
          settled ? "truncate text-muted-fg" : "line-clamp-3 text-ink",
        )}
      >
        {finding.description}
      </span>
    </button>
  );
}
