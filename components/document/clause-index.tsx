"use client";

import { cn } from "@/lib/utils";
import { findingState } from "@/lib/findings";
import type { Clause, Finding } from "@/lib/types";
import { MarginMark } from "./margin-mark";

/**
 * The clause index.
 *
 * Navigation by the document's own structure rather than by app
 * sections. A mark appears against any clause still carrying an open
 * concern, so the shape of the remaining work is visible without
 * reading a word.
 */
export function ClauseIndex({
  clauses,
  findings,
  activeClauseId,
  onSelect,
  openCount,
}: {
  clauses: Clause[];
  findings: Finding[];
  activeClauseId: string | null;
  onSelect: (clauseId: string) => void;
  openCount: number;
}) {
  const byId = new Map(findings.map((f) => [f.findingId, f]));

  return (
    <nav aria-label="Clauses" className="flex h-full flex-col">
      <p className="mb-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
        Clauses
      </p>

      <ul className="min-h-0 flex-1 space-y-px overflow-y-auto">
        {clauses.map((clause) => {
          const clauseFindings = clause.findingIds
            .map((id) => byId.get(id))
            .filter((f): f is Finding => Boolean(f));
          const hasOpen = clauseFindings.some(
            (f) => findingState(f) === "open",
          );
          const active = clause.id === activeClauseId;

          return (
            <li key={clause.id}>
              <button
                type="button"
                onClick={() => onSelect(clause.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-baseline gap-2 rounded-control px-2 py-1.5 text-left transition-colors",
                  active ? "bg-parchment text-ink" : "hover:bg-parchment/60",
                )}
              >
                <span className="w-10 shrink-0 font-mono text-notation tracking-notation text-muted-fg">
                  {clause.number}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-display text-meta",
                    active ? "text-ink" : "text-muted-fg",
                  )}
                >
                  {clause.heading}
                </span>
                {hasOpen && <MarginMark kind="machine" className="mt-1" />}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-line pt-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
        {openCount === 0
          ? "No open findings"
          : `${openCount} open ${openCount === 1 ? "finding" : "findings"}`}
      </p>
    </nav>
  );
}
