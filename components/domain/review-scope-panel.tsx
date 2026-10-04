"use client";

import { useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Switch } from "@/components/ui/switch";
import {
  noLongerRaisedLabel,
  scopeShowing,
  scopeTagLabel,
  type ReviewScope,
} from "@/lib/reviewScope";
import type { Finding } from "@/lib/types";

/**
 * What the last round changed, for the advocate re-reviewing a draft.
 *
 * The full pipeline re-ran, so nothing is removed: the view is scoped to
 * what needs a decision this round, and one switch shows everything. A
 * finding decided in an earlier round keeps its disposition and needs no new
 * decision; one that is new or still open does. This panel says which is
 * which, and the numbers it gives are the ones sign-off checks.
 */

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
  findings: Finding[];
  findingNumbers: Record<string, string>;
  showAll: boolean;
  onShowAllChange: (showAll: boolean) => void;
  onGoToClause: (clauseNumber: string) => void;
  onOpenFinding: (findingId: string) => void;
}) {
  // Collapsed to a line of counts at first: the document is the subject of
  // the screen, and the groups open from the line when they are wanted.
  const [open, setOpen] = useState(false);

  const withTag = (tag: "new" | "carried_over" | "resolved_settled") =>
    findings.filter((f) => scope.tags[f.findingId] === tag);
  const newly = withTag("new");
  const carriedOver = withTag("carried_over");
  const resolved = withTag("resolved_settled");

  const total = findings.length;
  const hidden = scope.carriedForward.length;

  return (
    <section
      aria-label={`Round ${scope.round} review scope`}
      className="border-t border-line bg-parchment px-5 py-4 md:px-8"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-meta font-medium text-ink">
            Round {scope.round}
            <span className="ml-2 font-normal text-muted-fg">
              {scope.baselineLabel} against {scope.headLabel}
            </span>
          </h2>
          <p className="mt-0.5 text-meta text-muted-fg">
            {plural(scope.changedClauses.length, "clause", "clauses")} changed ·{" "}
            {newly.length} newly flagged · {carriedOver.length} carried over ·{" "}
            {resolved.length + scope.noLongerRaised.length} resolved
          </p>
          <p className="mt-0.5 text-meta text-ink">
            {plural(scope.needsDecision.length, "finding needs", "findings need")} a fresh decision
            {hidden > 0 &&
              ` · ${hidden} decided in an earlier round ${hidden === 1 ? "carries" : "carry"} forward`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:ml-auto">
          <label
            htmlFor="show-all-findings"
            className="flex cursor-pointer items-center gap-2.5 text-meta text-ink"
          >
            <Switch id="show-all-findings" checked={showAll} onCheckedChange={onShowAllChange} />
            Show all findings
          </label>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="review-scope-detail"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-meta font-medium text-muted-fg transition-colors hover:bg-paper hover:text-ink"
          >
            <Icon name={open ? "expand_less" : "expand_more"} size={18} />
            {open ? "Hide what changed" : "What changed"}
          </button>
        </div>
      </div>

      <p className="mt-2 max-w-measure text-label text-muted-fg" aria-live="polite">
        {scopeShowing(scope, total, showAll)}
      </p>

      {open && (
        <div
          id="review-scope-detail"
          className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <Group title="Changed clauses" empty="No clause changed." count={scope.changedClauses.length}>
            {scope.changedClauses.map((c) => (
              <li key={c.number}>
                <JumpButton onClick={() => onGoToClause(c.number)}>
                  Clause {c.number} · {c.heading}
                </JumpButton>
                <span className="block text-label text-muted-fg">
                  {c.kind === "added" ? "Added" : c.kind === "removed" ? "Removed" : "Changed"}
                </span>
              </li>
            ))}
          </Group>

          <Group title="Newly flagged" empty="Nothing new was flagged." count={newly.length}>
            {newly.map((f) => (
              <FindingJump
                key={f.findingId}
                finding={f}
                number={findingNumbers[f.findingId]}
                onOpen={onOpenFinding}
              />
            ))}
          </Group>

          <Group
            title="Carried over, still open"
            empty="Nothing carried over."
            count={carriedOver.length}
          >
            {carriedOver.map((f) => (
              <FindingJump
                key={f.findingId}
                finding={f}
                number={findingNumbers[f.findingId]}
                onOpen={onOpenFinding}
              />
            ))}
          </Group>

          <Group
            title="Resolved"
            empty="Nothing was resolved."
            count={resolved.length + scope.noLongerRaised.length}
          >
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
                <span className="block text-label text-muted-fg">
                  {noLongerRaisedLabel(r.reason)}
                </span>
              </li>
            ))}
          </Group>
        </div>
      )}
    </section>
  );
}

function Group({
  title,
  empty,
  count,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-label font-medium text-muted-fg">
        {title} · {count}
      </h3>
      {count > 0 ? (
        <ul className="mt-2 space-y-1.5">{children}</ul>
      ) : (
        <p className="mt-2 text-meta text-muted-fg">{empty}</p>
      )}
    </div>
  );
}

function JumpButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
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
  finding: Finding;
  number: string;
  note?: string;
  onOpen: (findingId: string) => void;
}) {
  return (
    <li>
      <JumpButton onClick={() => onOpen(finding.findingId)}>
        Finding {number} · {finding.clauseReference}
      </JumpButton>
      {note && <span className="block text-label text-muted-fg">{note}</span>}
    </li>
  );
}
