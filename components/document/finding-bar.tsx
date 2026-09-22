"use client";

import { cn } from "@/lib/utils";
import { findingState } from "@/lib/findings";
import type { Finding } from "@/lib/types";
import { FindingRule } from "./finding-rule";

/**
 * A finding as it appears in the margin of its clause.
 *
 * Annotation, not cards: no border, no shadow, no surrounding box. A
 * rule in the severity colour, the concern beside it, and nothing else.
 *
 * A settled finding collapses to a single line but is never removed. A
 * legal decision stays part of the record, and a document that quietly
 * drops the concerns it resolved cannot be audited.
 */
export function FindingBar({
  finding,
  number,
  selected,
  onSelect,
}: {
  finding: Finding;
  /** Display ordinal, "04". Never the opaque id. */
  number: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const settled = findingState(finding) === "settled";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "relative block w-full py-3 pl-4 pr-3 text-left transition-colors",
        selected ? "bg-parchment" : "hover:bg-parchment/60",
      )}
    >
      <FindingRule finding={finding} />

      <span className="font-mono text-notation uppercase tracking-notation text-muted-fg">
        Finding {number}
        <span className="mx-2 text-line">·</span>
        <span className={settled ? "text-verified" : "text-caution-fg"}>
          {settled ? "Settled" : "Open"}
        </span>
      </span>

      <p
        className={cn(
          "mt-1 text-meta",
          settled ? "truncate text-muted-fg" : "text-ink",
        )}
      >
        {finding.description}
      </p>
    </button>
  );
}
