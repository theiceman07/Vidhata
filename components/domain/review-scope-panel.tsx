"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Switch } from "@/components/ui/switch";
import {
  noLongerRaisedLabel,
  scopeTagLabel,
  type ReviewScope,
} from "@/lib/reviewScope";
import type { WorkspaceFinding } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * What the last round changed, for the advocate re-reviewing a draft.
 *
 * The full pipeline re-ran, so nothing is removed: the view is scoped to
 * what needs a decision this round, and one switch shows everything. A
 * finding decided in an earlier round keeps its disposition and needs no new
 * decision; one that is new or still open does. This panel says which is
 * which, and the numbers it gives are the ones sign-off checks.
 */

type Metric = "changed" | "new" | "carried" | "resolved";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function ReviewScopePanel({
  scope,
  findings,
  findingNumbers,
  showAll,
  onShowAllChange,
  onGoToClause,
  onOpenFinding,
}: {
  scope: ReviewScope;
  findings: WorkspaceFinding[];
  findingNumbers: Record<string, string>;
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
  onGoToClause: (clauseNumber: string) => void;
  onOpenFinding: (findingId: string) => void;
}) {
  // Collapsed to a line at first: the document is the subject of the screen,
  // and the counts open from the line when they are wanted.
  const [open, setOpen] = useState(false);
  // Which group's list shows beneath the counts; none until asked for.
  const [detail, setDetail] = useState<Metric | null>(null);

  const withTag = (tag: "new" | "carried_over" | "resolved_settled") =>
    findings.filter((f) => scope.tags[f.findingId] === tag);
  const newly = withTag("new");
  const carriedOver = withTag("carried_over");
  const resolved = withTag("resolved_settled");
  const resolvedCount = resolved.length + scope.noLongerRaised.length;

  const total = findings.length;
  const hidden = scope.carriedForward.length;

  const metrics: { key: Metric; label: string; count: number }[] = [
    { key: "changed", label: "Changed", count: scope.changedClauses.length },
    { key: "new", label: "Newly flagged", count: newly.length },
    { key: "carried", label: "Carried over", count: carriedOver.length },
    { key: "resolved", label: "Resolved", count: resolvedCount },
  ];

  return (
    <section
      aria-label={`Round ${scope.round} review scope`}
      className="border-t border-line bg-parchment px-5 py-2 md:px-8"
    >
      {/* One slim row at rest: round, comparison, undecided count, chevron. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="review-scope-detail"
          className="inline-flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 text-left text-meta transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="font-medium text-ink">Round {scope.round}</span>
          <span className="hidden text-muted-fg sm:inline">
            {scope.baselineLabel} against {scope.headLabel}
          </span>
          <span className="text-muted-fg">·</span>
          <span className="truncate text-ink">
            {plural(
              scope.needsDecision.length,
              "finding needs",
              "findings need",
            )}{" "}
            a fresh decision
          </span>
          <Icon
            name={open ? "expand_less" : "expand_more"}
            size={18}
            className="shrink-0 text-muted-fg"
          />
        </button>

        <label
          htmlFor="show-all-findings"
          className="flex cursor-pointer items-center gap-2.5 py-1 text-meta text-ink md:ml-auto"
        >
          <Switch
            id="show-all-findings"
            checked={showAll}
            onCheckedChange={onShowAllChange}
          />
          Show all findings
        </label>
      </div>

      {/* In the flow: opening it pushes the panes down, never covers them. */}
      {open && (
        <div id="review-scope-detail" className="pt-1.5">
          {/* Four separate status cards, one row from lg. */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={detail === m.key}
                onClick={() => setDetail((d) => (d === m.key ? null : m.key))}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-control border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  detail === m.key
                    ? "border-ink bg-paper"
                    : "border-line bg-paper hover:border-muted-fg/50",
                )}
              >
                <span className="text-label text-muted-fg">{m.label}</span>
                <span className="font-display text-xl font-medium leading-none text-ink">
                  {m.count}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-1 text-label leading-snug text-muted-fg" aria-live="polite">
            {showAll
              ? `All ${plural(total, "finding", "findings")} shown`
              : `${total - hidden} of ${plural(total, "finding", "findings")} shown`}
            {!showAll && hidden > 0 && ` · ${hidden} hidden from an earlier round`}
          </p>

          {detail && (
            <ul className="mt-2 flex max-h-24 flex-wrap gap-x-4 gap-y-1 overflow-y-auto rounded-control bg-paper px-3 py-2">
              {detail === "changed" &&
                (scope.changedClauses.length === 0 ? (
                  <Empty>No clause changed.</Empty>
                ) : (
                  scope.changedClauses.map((c) => (
                    <li key={c.number}>
                      <JumpButton onClick={() => onGoToClause(c.number)}>
                        Clause {c.number} · {c.heading}
                      </JumpButton>
                      <span className="ml-1.5 text-label text-muted-fg">
                        {c.kind === "added"
                          ? "Added"
                          : c.kind === "removed"
                            ? "Removed"
                            : "Changed"}
                      </span>
                    </li>
                  ))
                ))}
              {detail === "new" &&
                (newly.length === 0 ? (
                  <Empty>Nothing new was flagged.</Empty>
                ) : (
                  newly.map((f) => (
                    <FindingJump
                      key={f.findingId}
                      finding={f}
                      number={findingNumbers[f.findingId]}
                      onOpen={onOpenFinding}
                    />
                  ))
                ))}
              {detail === "carried" &&
                (carriedOver.length === 0 ? (
                  <Empty>Nothing carried over.</Empty>
                ) : (
                  carriedOver.map((f) => (
                    <FindingJump
                      key={f.findingId}
                      finding={f}
                      number={findingNumbers[f.findingId]}
                      onOpen={onOpenFinding}
                    />
                  ))
                ))}
              {detail === "resolved" &&
                (resolvedCount === 0 ? (
                  <Empty>Nothing was resolved.</Empty>
                ) : (
                  <>
                    {resolved.map((f) => (
                      <FindingJump
                        key={f.findingId}
                        finding={f}
                        number={findingNumbers[f.findingId]}
                        note={scopeTagLabel("resolved_settled")}
                        onOpen={onOpenFinding}
                      />
                    ))}
                    {scope.noLongerRaised.map((r) => (
                      <li key={r.findingId} className="text-meta text-ink">
                        {r.clauseReference} · {r.description}
                        <span className="ml-1.5 text-label text-muted-fg">
                          {noLongerRaisedLabel(r.reason)}
                        </span>
                      </li>
                    ))}
                  </>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="text-meta text-muted-fg">{children}</li>;
}

function JumpButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-control text-left text-meta text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

function FindingJump({
  finding,
  number,
  note,
  onOpen,
}: {
  finding: WorkspaceFinding;
  number: string;
  note?: string;
  onOpen: (findingId: string) => void;
}) {
  return (
    <li>
      <JumpButton onClick={() => onOpen(finding.findingId)}>
        Finding {number} · {finding.clauseReference}
      </JumpButton>
      {note && (
        <span className="ml-1.5 text-label text-muted-fg">{note}</span>
      )}
    </li>
  );
}
