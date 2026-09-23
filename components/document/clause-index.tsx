"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { blockingCitations, findingState } from "@/lib/findings";
import type { Clause, Finding, Severity } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";
import { SeverityGlyph } from "./severity";

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/**
 * The clause index.
 *
 * Navigation by the document's own structure, carrying the state of the
 * work: a clause with something undecided shows its most severe glyph and
 * a count, a clause whose findings are all decided shows a tick, and a
 * clause nobody raised anything against shows nothing at all.
 *
 * Beneath it, the findings themselves, filterable to what is still
 * undecided. The keyboard walks them with J and K; this is the same walk
 * for everyone else.
 */
export function ClauseIndex({
  clauses,
  findings,
  findingNumbers,
  activeClauseId,
  selectedFindingId,
  onSelectClause,
  onSelectFinding,
  onHoverFinding,
}: {
  clauses: Clause[];
  findings: Finding[];
  findingNumbers: Record<string, string>;
  activeClauseId: string | null;
  selectedFindingId: string | null;
  onSelectClause: (clauseId: string) => void;
  onSelectFinding: (findingId: string) => void;
  onHoverFinding: (findingId: string | null) => void;
}) {
  const byId = new Map(findings.map((f) => [f.findingId, f]));
  const headingByNumber = new Map(clauses.map((c) => [c.number, c.heading]));

  const unsettled = findings.filter((f) => findingState(f) !== "settled");
  // A settled document opens on its record; one in review opens on the work.
  const [filter, setFilter] = useState<"all" | "unsettled">(() =>
    unsettled.length > 0 ? "unsettled" : "all",
  );
  const shown = filter === "all" ? findings : unsettled;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Clauses" className="flex min-h-0 flex-1 flex-col">
        <p className="px-4 pb-2 pt-4 text-label font-medium text-muted-fg">
          Clauses
        </p>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {clauses.map((clause) => {
            const clauseFindings = clause.findingIds
              .map((id) => byId.get(id))
              .filter((f): f is Finding => Boolean(f));
            const pending = clauseFindings
              .filter((f) => findingState(f) !== "settled")
              .sort((a, b) => RANK[a.severity] - RANK[b.severity]);
            const allSettled =
              clauseFindings.length > 0 && pending.length === 0;
            const active = clause.id === activeClauseId;

            return (
              <li key={clause.id}>
                <button
                  type="button"
                  onClick={() => onSelectClause(clause.id)}
                  aria-current={active ? "location" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-control px-2 py-1 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active ? "bg-parchment text-ink" : "text-muted-fg hover:bg-parchment/60 hover:text-ink",
                  )}
                >
                  <span className="w-8 shrink-0 font-mono text-label">
                    {clause.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-meta">
                    {clause.heading}
                  </span>
                  {pending.length > 0 && (
                    <span
                      className="inline-flex items-center gap-1 font-mono text-label text-ink"
                      title={`${pending.length} undecided`}
                    >
                      <SeverityGlyph severity={pending[0].severity} />
                      {pending.length}
                    </span>
                  )}
                  {allSettled && (
                    <Icon
                      name="check"
                      size={16}
                      label="All findings settled"
                      className="text-verified"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav aria-label="Findings" className="max-h-[45%] shrink-0 overflow-y-auto border-t border-line px-2 pb-4">
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-3">
          <p className="text-label font-medium text-muted-fg">
            Findings
            {findings.length > 0 && (
              <span className="font-normal">
                {" · "}
                {unsettled.length === 0 ? "all settled" : `${unsettled.length} undecided`}
              </span>
            )}
          </p>
          {findings.length > 0 && (
            <div role="group" aria-label="Filter findings" className="flex rounded-control border border-line p-px">
              {(["unsettled", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={cn(
                    "rounded-[4px] px-1.5 py-px text-label transition-colors",
                    filter === value ? "bg-parchment text-ink" : "text-muted-fg hover:text-ink",
                  )}
                >
                  {value === "all" ? "All" : "Undecided"}
                </button>
              ))}
            </div>
          )}
        </div>

        {findings.length === 0 ? (
          <p className="px-2 text-meta text-muted-fg">
            The first pass raised no findings against this document.
          </p>
        ) : shown.length === 0 ? (
          <p className="px-2 text-meta text-muted-fg">
            Every finding is settled.{" "}
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="text-ink underline underline-offset-2"
            >
              Show all
            </button>
          </p>
        ) : (
          <ul>
            {shown.map((finding) => {
              const state = findingState(finding);
              const blocked = blockingCitations(finding).length > 0;
              const selected = finding.findingId === selectedFindingId;
              const number = clauseNumberFromReference(finding.clauseReference);

              return (
                <li key={finding.findingId}>
                  <button
                    type="button"
                    onClick={() => onSelectFinding(finding.findingId)}
                    onMouseEnter={() => onHoverFinding(finding.findingId)}
                    onMouseLeave={() => onHoverFinding(null)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-control px-2 py-1 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      selected ? "bg-parchment" : "hover:bg-parchment/60",
                    )}
                  >
                    <span className="w-6 shrink-0 font-mono text-label text-muted-fg">
                      {findingNumbers[finding.findingId]}
                    </span>
                    <SeverityGlyph severity={finding.severity} />
                    <span className="min-w-0 flex-1 truncate text-meta text-ink">
                      <span className="font-mono text-label text-muted-fg">{number}</span>{" "}
                      {headingByNumber.get(number) ?? finding.clauseReference}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-label",
                        blocked
                          ? "text-flagged"
                          : state === "settled"
                            ? "text-verified"
                            : state === "with_client"
                              ? "text-muted-fg"
                              : "text-caution-fg",
                      )}
                    >
                      {blocked
                        ? "Blocked"
                        : state === "settled"
                          ? "Settled"
                          : state === "with_client"
                            ? "Client"
                            : "Open"}
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
