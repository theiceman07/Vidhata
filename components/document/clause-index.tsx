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
 *
 * Beneath it, the findings themselves. The keyboard walks them with J
 * and K; this is the same walk for everyone else, and the reason the
 * shortcuts can stay an enhancement rather than the only way through.
 */
export function ClauseIndex({
  clauses,
  findings,
  findingNumbers,
  activeClauseId,
  selectedFindingId,
  onSelectClause,
  onSelectFinding,
  openCount,
}: {
  clauses: Clause[];
  findings: Finding[];
  findingNumbers: Record<string, string>;
  activeClauseId: string | null;
  selectedFindingId: string | null;
  onSelectClause: (clauseId: string) => void;
  onSelectFinding: (findingId: string) => void;
  openCount: number;
}) {
  const byId = new Map(findings.map((f) => [f.findingId, f]));

  return (
    <div className="flex h-full flex-col gap-6">
      <nav aria-label="Clauses" className="flex min-h-0 flex-col">
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
                  onClick={() => onSelectClause(clause.id)}
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
      </nav>

      <nav aria-label="Findings" className="border-t border-line pt-4">
        <p className="mb-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
          Findings
          <span className="mx-2 text-line">·</span>
          {openCount === 0 ? "none open" : `${openCount} open`}
        </p>

        {findings.length === 0 ? (
          <p className="text-small text-muted-fg">
            The first pass raised no findings against this document.
          </p>
        ) : (
          <ul className="space-y-px">
            {findings.map((finding) => {
              const settled = findingState(finding) === "settled";
              const selected = finding.findingId === selectedFindingId;

              return (
                <li key={finding.findingId}>
                  <button
                    type="button"
                    onClick={() => onSelectFinding(finding.findingId)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-baseline gap-2 rounded-control px-2 py-1.5 text-left transition-colors",
                      selected
                        ? "bg-parchment text-ink"
                        : "hover:bg-parchment/60",
                    )}
                  >
                    <span className="w-10 shrink-0 font-mono text-notation tracking-notation text-muted-fg">
                      {findingNumbers[finding.findingId]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-meta text-ink">
                      {finding.clauseReference}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-notation uppercase tracking-notation",
                        settled ? "text-verified" : "text-caution-fg",
                      )}
                    >
                      {settled ? "Settled" : "Open"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
