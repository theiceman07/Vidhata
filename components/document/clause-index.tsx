"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { Tick } from "@/components/shared/tick";
import { findingState, severityRank } from "@/lib/findings";
import type { Clause, WorkspaceFinding } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";
import { SeverityGlyph } from "./severity";

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
  activeClauseId,
  selectedFindingId,
  onSelectClause,
  onSelectFinding,
  onHoverFinding,
}: {
  clauses: Clause[];
  findings: WorkspaceFinding[];
  findingNumbers?: Record<string, string>;
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
  // With nothing undecided there is nothing to filter: the findings are one row that opens.
  const allSettled = findings.length > 0 && unsettled.length === 0;
  const [open, setOpen] = useState(false);
  const shown = allSettled || filter === "all" ? findings : unsettled;

  const clauseHasFindings = (c: Clause) => c.findingIds.some((id) => byId.has(id));
  const clauseSettled = (c: Clause) =>
    c.findingIds.map((id) => byId.get(id)).filter((f): f is WorkspaceFinding => Boolean(f))
      .every((f) => findingState(f) === "settled");
  const flagged = clauses.filter(clauseHasFindings);
  const withFindings = flagged.length;
  const firstPending = [...unsettled].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))[0];
  const settledClauses = flagged.filter(clauseSettled).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Clauses" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-h3 text-ink">Clauses</p>
            <p className="text-label tabular-nums text-muted-fg">{clauses.length}</p>
          </div>
          {withFindings > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-card border border-line bg-sand px-4 py-3">
              {settledClauses === withFindings ? (
                <Tick state="done" size="md" label="All findings settled" />
              ) : (
                <SeverityGlyph severity={firstPending?.severity ?? "high"} />
              )}
              <div className="min-w-0">
                <p className="text-meta font-semibold text-ink">
                  {settledClauses === withFindings
                    ? "All findings settled"
                    : `${unsettled.length} ${unsettled.length === 1 ? "finding" : "findings"} undecided`}
                </p>
                <p className="text-label text-muted-fg">
                  {settledClauses} of {withFindings} flagged{" "}
                  {withFindings === 1 ? "clause" : "clauses"} settled
                </p>
              </div>
            </div>
          )}
        </div>

        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {clauses.map((clause) => {
            const clauseFindings = clause.findingIds
              .map((id) => byId.get(id))
              .filter((f): f is WorkspaceFinding => Boolean(f));
            const pending = clauseFindings
              .filter((f) => findingState(f) !== "settled")
              .sort(
                (a, b) => severityRank(a.severity) - severityRank(b.severity),
              );
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
                    "flex w-full items-start gap-3 rounded-control border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active
                      ? "border-accent bg-brand-tint text-ink"
                      : "border-transparent text-ink hover:bg-sand",
                  )}
                >
                  <span
                    className={cn(
                      "w-7 shrink-0 pt-0.5 font-mono text-label tabular-nums",
                      active ? "font-semibold text-accent" : "text-muted-fg",
                    )}
                  >
                    {clause.number}
                  </span>
                  <span className="min-w-0 flex-1 text-meta leading-snug">
                    {clause.heading}
                  </span>
                  {pending.length > 0 && (
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 font-mono text-label tabular-nums",
                        "text-ink",
                      )}
                      title={`${pending.length} undecided`}
                    >
                      <SeverityGlyph severity={pending[0].severity} />
                      {pending.length}
                    </span>
                  )}
                  {allSettled && (
                    <span title="Finding settled" className="inline-flex shrink-0 pt-px">
                      <Tick state="done" size="sm" label="All findings settled" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Anchored: the header stays put and the list scrolls on its own, so
          the clause list above keeps at least its share of the rail. */}
      <nav
        aria-label="Findings"
        className="flex max-h-[50%] min-h-0 shrink-0 flex-col border-t border-line"
      >
        {allSettled ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full shrink-0 items-center justify-between gap-2 px-4 py-3 text-left text-label font-medium text-muted-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>
              {findings.length} {findings.length === 1 ? "finding" : "findings"}
              <span className="font-normal"> · all settled</span>
            </span>
            <Icon name={open ? "expand_less" : "expand_more"} size={18} />
          </button>
        ) : (
          <div className="shrink-0 px-4 pb-2 pt-3">
            <p className="text-label font-medium text-ink">Findings</p>
            {findings.length > 0 && (
              <div
                role="group"
                aria-label="Filter findings"
                className="mt-2 flex w-full rounded-full bg-sand p-0.5"
              >
                {(["unsettled", "all"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={cn(
                      "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-meta transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      filter === value
                        ? "bg-surface font-medium text-ink"
                        : "text-muted-fg hover:text-ink",
                    )}
                  >
                    {value === "all" ? "All" : "Undecided"}
                    <span className="tabular-nums text-label text-muted-fg">
                      {value === "all" ? findings.length : unsettled.length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-2 pb-3",
            allSettled && !open && "hidden",
          )}
        >
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
                className="link"
              >
                Show all
              </button>
            </p>
          ) : (
            <ul className="space-y-1.5">
              {shown.map((finding) => {
                const state = findingState(finding);
                const selected = finding.findingId === selectedFindingId;
                const number = clauseNumberFromReference(
                  finding.clauseReference,
                );

                return (
                  <li key={finding.findingId}>
                    <button
                      type="button"
                      onClick={() => onSelectFinding(finding.findingId)}
                      onMouseEnter={() => onHoverFinding(finding.findingId)}
                      onMouseLeave={() => onHoverFinding(null)}
                      aria-current={selected ? "true" : undefined}
                      className={cn(
                        "block w-full rounded-control border px-3 py-3 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        selected
                          ? "border-accent bg-brand-tint"
                          : "border-line bg-surface hover:bg-sand",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <SeverityGlyph
                          severity={finding.severity}
                          className={cn("h-2.5 w-2.5 shrink-0", finding.severity === "low" && "border-progress bg-progress")}
                        />
                        <span className="min-w-0 flex-1 truncate text-meta font-medium text-ink">
                          <span className="font-mono text-label text-muted-fg">
                            {number}
                          </span>{" "}
                          {headingByNumber.get(number) ?? finding.clauseReference}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-label leading-snug text-muted-fg">
                        {finding.description}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-label text-ink">
                        {state === "settled" && (
                          <Icon name="check_circle" size={16} className="text-done" />
                        )}
                        {state === "settled"
                          ? "Settled"
                          : state === "with_client"
                            ? "With client"
                            : "Open"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>
    </div>
  );
}
