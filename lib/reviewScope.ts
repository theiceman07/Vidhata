import {
  diffVersions,
  headAsSide,
  type ClauseChangeKind,
  type ResolvedReason,
} from "@/lib/diff";
import { unsettledFindings } from "@/lib/findings";
import type { ContractDocument, DocumentVersion } from "@/lib/types";

/**
 * The advocate's re-review, scoped to what the last round changed.
 *
 * When a draft comes back, most of it is what the advocate already decided.
 * The scope says what is new this round, so the review starts there, and
 * the full pipeline having re-run (FR-18) is not hidden: every finding is
 * one toggle away.
 *
 * It compares the live document against the draft before it, which is the
 * one place the working copy is compared with a snapshot (everywhere else a
 * diff is between two snapshots). It is not the latest snapshot: a draft's
 * own snapshot is written the moment it is handed on, so against that the
 * live document would show nothing until the advocate had already acted.
 * Against the draft before it, it shows the round.
 *
 * Advocate only. A client never reads this: what a client may see of a
 * history is lib/clientVersions.
 */

/**
 * What a finding is, this round.
 *
 * - new: raised since the earlier draft
 * - carried_over: open in the earlier draft and still open
 * - resolved_settled: open before, decided since
 * - carried_forward: already decided in an earlier round, and still standing
 *   with that decision, which carries forward and needs no new one
 */
export type ScopeTag = "new" | "carried_over" | "resolved_settled" | "carried_forward";

export interface ScopeChangedClause {
  number: string;
  heading: string;
  kind: Exclude<ClauseChangeKind, "unchanged">;
}

/** A finding the new draft no longer raises, and why. */
export interface ScopeNoLongerRaised {
  findingId: string;
  clauseReference: string;
  description: string;
  reason: ResolvedReason;
}

export interface ReviewScope {
  /** "Round 3": how many times it has been sent back, plus the first. */
  round: number;
  baseline: number;
  head: number;
  baselineLabel: string;
  headLabel: string;
  changedClauses: ScopeChangedClause[];
  /** Every finding on the live document, by what it is this round. */
  tags: Record<string, ScopeTag>;
  /** What the scoped view shows: everything except what carries forward. */
  inScope: string[];
  /** Findings that need a fresh decision. These are what sign-off checks. */
  needsDecision: string[];
  /** Settled in an earlier round, disposition carried forward. */
  carriedForward: string[];
  /** Gone from the new draft. They are not on the document, so not in tags. */
  noLongerRaised: ScopeNoLongerRaised[];
}

/**
 * The scope for a document's current draft, or null when there is no earlier
 * draft to compare it with, in which case the whole review is the scope.
 */
export function reviewScope(
  doc: ContractDocument,
  versions: DocumentVersion[],
): ReviewScope | null {
  const earlier = versions
    .filter((v) => v.number < doc.version)
    .sort((a, b) => b.number - a.number)[0];
  if (!earlier) return null;

  const diff = diffVersions(earlier, headAsSide(doc));

  const tags: Record<string, ScopeTag> = {};
  const noLongerRaised: ScopeNoLongerRaised[] = [];
  for (const change of diff.findings) {
    if (change.kind === "new") {
      tags[change.findingId] = "new";
    } else if (change.kind === "unresolved") {
      // Includes one decided before and reopened since: it is open again.
      tags[change.findingId] = "carried_over";
    } else if (change.after) {
      tags[change.findingId] = "resolved_settled";
    } else if (change.before && change.resolvedReason) {
      noLongerRaised.push({
        findingId: change.findingId,
        clauseReference: change.before.clauseReference,
        description: change.before.description,
        reason: change.resolvedReason,
      });
    }
  }

  // The diff leaves out what was decided before and still is. That is what
  // carries forward.
  for (const finding of doc.findings) {
    if (!(finding.findingId in tags)) tags[finding.findingId] = "carried_forward";
  }

  const ids = doc.findings.map((f) => f.findingId);
  return {
    round: doc.revisionCount + 1,
    baseline: earlier.number,
    head: doc.version,
    baselineLabel: `Draft ${earlier.number}`,
    headLabel: `Draft ${doc.version}`,
    changedClauses: diff.clauses
      .filter((c): c is typeof c & { kind: ScopeChangedClause["kind"] } => c.kind !== "unchanged")
      .map((c) => ({ number: c.number, heading: c.heading, kind: c.kind })),
    tags,
    inScope: ids.filter((id) => tags[id] !== "carried_forward"),
    needsDecision: unsettledFindings(doc).map((f) => f.findingId),
    carriedForward: ids.filter((id) => tags[id] === "carried_forward"),
    noLongerRaised,
  };
}

/**
 * What the view holds, said as a sentence. `total` is every finding on the
 * document, so the scoped view shows the total less what carries forward.
 */
export function scopeShowing(scope: ReviewScope, total: number, showAll: boolean): string {
  const findings = (n: number) => `${n} ${n === 1 ? "finding" : "findings"}`;
  const hidden = scope.carriedForward.length;
  if (showAll) return `Showing all ${findings(total)}. Each is marked with what it is this round.`;
  if (hidden === 0) return `Showing all ${findings(total)}: none was decided in an earlier round.`;
  return `Showing ${total - hidden} of ${findings(total)}. Hidden: ${hidden} decided in an earlier round, with ${hidden === 1 ? "its disposition" : "their dispositions"} carried forward.`;
}

/** What a tag is called on a finding. */
export function scopeTagLabel(tag: ScopeTag): string {
  switch (tag) {
    case "new":
      return "New this round";
    case "carried_over":
      return "Carried over, still open";
    case "resolved_settled":
      return "Resolved: settled";
    case "carried_forward":
      return "Decided in an earlier round";
  }
}

/** Why a finding is no longer raised, said so the advocate can act on it. */
export function noLongerRaisedLabel(reason: ResolvedReason): string {
  return reason === "clause_changed" ? "Resolved: clause changed" : "Resolved: settled";
}

/**
 * Whether the advocate has a decision to make on a finding this round, said
 * plainly. A finding decided in an earlier round carries its disposition
 * forward; a new or still-open one needs a fresh decision.
 */
export function scopeNote(tag: ScopeTag, settled: boolean): string {
  if (tag === "carried_forward") {
    return "Settled in an earlier round. Its disposition carries forward, and it needs no new decision.";
  }
  if (tag === "resolved_settled") return "Open last round and decided since. Nothing more to decide.";
  if (settled) return "New this round, and already decided.";
  return "Needs a fresh decision this round.";
}
