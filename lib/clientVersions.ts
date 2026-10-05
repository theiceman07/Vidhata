import {
  diffVersions,
  type ClauseChangeKind,
  type FindingChange,
  type FindingChangeKind,
  type ResolvedReason,
} from "@/lib/diff";
import { clientVisibleFindings, findingNumbers } from "@/lib/findings";
import {
  clauseNumberFromReference,
  type ClientClauseRow,
  type ClientDiff,
  type ClientFindingRow,
  type ClientVersionRow,
  type ContractDocument,
  type DocumentVersion,
  type Finding,
  type VersionCreatedBy,
} from "@/lib/types";

/**
 * The client's reading of a document's history.
 *
 * Every client screen that shows versions or what changed between them goes
 * through this file and nothing else, so what a client may see is decided
 * in one place. The rule:
 *
 * Before sign-off the client sees counts, the clauses behind requests
 * addressed to them, and the findings those requests are about. Every other
 * clause is only counted as changed or unchanged, with no text and no number,
 * because saying where a draft changed says what it contains. A finding the
 * advocate added reaches the client only through a request addressed to them.
 *
 * After sign-off the whole record is theirs, read-only: every clause in full,
 * every finding with the advocate's disposition. Whether that includes the
 * findings the advocate added is one switch (lib/config/visibility.ts).
 *
 * Diffs are read from snapshots only. The live document is consulted for
 * one thing, which clauses a request to the client is about, and never for
 * what the drafts said.
 */

type Options = {
  advocateAddedAfterSignOff?: boolean;
  /**
   * The number a client reads a finding by. Given, it is used as it is. Not
   * given, the diff numbers findings by position in the drafts it compares, the
   * way it always has. The API gives it the stored client number
   * (lib/api/client/shape-versions.ts), so a finding keeps one number in every
   * comparison; screens do not use this yet.
   */
  numberFor?: (finding: Finding) => string;
};

const isSignedOff = (doc: ContractDocument) =>
  doc.status === "settled" || doc.status === "executed";

/** A snapshot, read as the document stood at that draft. */
function asDoc(doc: ContractDocument, version: DocumentVersion): ContractDocument {
  return {
    ...doc,
    version: version.number,
    clauses: version.clauses,
    findings: version.findings,
  };
}

export const MADE_BY: Record<VersionCreatedBy, string> = {
  first_pass: "First pass",
  client_response: "Your answers",
  advocate_revision: "Advocate's revision",
};

/**
 * The drafts as they were handed on, newest first. "Current" marks the
 * latest snapshot: the live document is a working copy and is not one.
 */
export function clientVersionList(
  doc: ContractDocument,
  versions: DocumentVersion[],
  options: Options = {},
): ClientVersionRow[] {
  const sorted = [...versions].sort((a, b) => b.number - a.number);
  const latest = sorted[0]?.number;
  return sorted.map((v) => ({
    number: v.number,
    label: v.number === latest ? `Draft ${v.number} (current)` : `Draft ${v.number}`,
    current: v.number === latest,
    createdAt: v.createdAt,
    madeBy: MADE_BY[v.createdBy],
    clauseCount: v.clauses.length,
    findingCount: clientVisibleFindings(asDoc(doc, v), options).length,
  }));
}

/** The latest two drafts, or null when there is nothing earlier to compare. */
export function defaultComparison(
  versions: { number: number }[],
): { from: number; to: number } | null {
  const numbers = versions.map((v) => v.number).sort((a, b) => b - a);
  return numbers.length >= 2 ? { from: numbers[1], to: numbers[0] } : null;
}

/** What a finding's change is called to the client. Never an internal term. */
export function plainChange(
  kind: FindingChangeKind,
  reason: ResolvedReason | null,
  laterMadeBy: VersionCreatedBy,
  signedOff = true,
): string {
  if (kind === "new") return "New in this draft";
  // Before sign-off a client is not told what the advocate has decided, so a
  // finding is only ever still raised or no longer raised, never "open" or
  // "settled": either of those says a decision was or was not made.
  if (kind === "unresolved") return signedOff ? "Still open" : "Still raised";
  if (reason === "clause_changed") {
    return laterMadeBy === "client_response"
      ? "No longer raised after your change to this clause"
      : "No longer raised after the advocate's revision to this clause";
  }
  return signedOff ? "Settled by the advocate" : "No longer raised in this draft";
}

/**
 * The line over a comparison: how many findings are new, still there, and
 * gone. After sign-off it says what the advocate decided. Before it, it says
 * only what is raised in each draft, in words that read the same whatever the
 * advocate has decided (a test flips every decision to hold that).
 */
export function findingsSummary(diff: ClientVersionDiff): string {
  const c = diff.findingCounts;
  return diff.signedOff
    ? `Findings: ${c.new} new · ${c.stillOpen} still open · ${c.resolved} settled or no longer raised`
    : `Findings: ${c.new} new · ${c.stillOpen} still raised · ${c.resolved} no longer raised after a clause changed`;
}

export function dispositionText(disposition: Finding["disposition"]): string {
  if (disposition === "confirmed") return "Confirmed by the advocate";
  if (disposition === "overridden") return "Overridden by the advocate";
  return "Not yet decided";
}

/** The client's diff. The shapes live in lib/types.ts; the old names stay here. */
export type ClientVersionDiff = ClientDiff;
export type { ClientClauseRow, ClientFindingRow, ClientVersionRow };

export type ClientVersionDiffResult =
  | { ok: true; diff: ClientVersionDiff }
  | { ok: false; reason: "same_draft" | "unknown_draft" };

/**
 * What changed between two drafts, for the client. The two may be given in
 * either order; the earlier one is always the "from". A draft cannot be
 * compared with itself.
 */
export function clientVersionDiff(
  doc: ContractDocument,
  versions: DocumentVersion[],
  a: number,
  b: number,
  options: Options = {},
): ClientVersionDiffResult {
  if (a === b) return { ok: false, reason: "same_draft" };
  const from = versions.find((v) => v.number === Math.min(a, b));
  const to = versions.find((v) => v.number === Math.max(a, b));
  if (!from || !to) return { ok: false, reason: "unknown_draft" };

  const signedOff = isSignedOff(doc);
  const latest = Math.max(...versions.map((v) => v.number));
  const label = (n: number) => (n === latest ? `Draft ${n} (current)` : `Draft ${n}`);

  const fromDoc = asDoc(doc, from);
  const toDoc = asDoc(doc, to);
  const diff = diffVersions(from, to);

  // Only findings the client may know about, in either draft. A finding in
  // the later draft is numbered the way their own list numbers it. One only
  // in the earlier draft goes after those, because numbering each draft on
  // its own gives two different findings the same number.
  const fromVisible = clientVisibleFindings(fromDoc, options);
  const toVisible = clientVisibleFindings(toDoc, options);
  const visibleIds = new Set([...fromVisible, ...toVisible].map((f) => f.findingId));
  let numbers: Record<string, string>;
  if (options.numberFor) {
    // Given: the number is the finding's own, the same in every comparison.
    numbers = {};
    for (const f of [...toVisible, ...fromVisible]) numbers[f.findingId] = options.numberFor(f);
  } else {
    numbers = findingNumbers({ ...toDoc, findings: toVisible });
    let last = toVisible.length;
    for (const f of fromVisible) {
      if (!(f.findingId in numbers)) numbers[f.findingId] = String(++last).padStart(2, "0");
    }
  }
  // After sign-off the diff is the record, decisions and all. Before it, the
  // client is told only what is raised in each draft: whether a finding is in
  // both, only the later or only the earlier. The diff leaves out a finding
  // settled in both drafts and calls one settled since "resolved", and either
  // would let a count or a row move when the advocate decides something, so
  // before sign-off it is not read for what changed.
  const visibleChanges: FindingChange[] = signedOff
    ? diff.findings.filter((c) => visibleIds.has(c.findingId))
    : (() => {
        const before = new Map(fromVisible.map((f) => [f.findingId, f]));
        const after = new Map(toVisible.map((f) => [f.findingId, f]));
        const reasons = new Map(diff.findings.map((c) => [c.findingId, c.resolvedReason]));
        // The later draft's findings in its own order, then those only the
        // earlier one had.
        const order = [
          ...toVisible.map((f) => f.findingId),
          ...fromVisible.map((f) => f.findingId).filter((id) => !after.has(id)),
        ];
        return order.map((id): FindingChange => {
          const b = before.get(id) ?? null;
          const a = after.get(id) ?? null;
          return {
            findingId: id,
            before: b,
            after: a,
            kind: b && a ? "unresolved" : a ? "new" : "resolved",
            resolvedReason: !a ? (reasons.get(id) ?? "clause_changed") : null,
          };
        });
      })();

  // The clauses a request to the client is about.
  const addressedClauses = new Set<string>();
  for (const f of [...from.findings, ...to.findings, ...doc.findings]) {
    if (f.changeRequest) addressedClauses.add(clauseNumberFromReference(f.clauseReference));
  }
  const showClause = (number: string) => signedOff || addressedClauses.has(number);

  const clauses: ClientClauseRow[] = diff.clauses
    .filter((c) => showClause(c.number))
    .map((c) => ({
      number: c.number,
      heading: c.heading,
      kind: c.kind,
      before: c.before,
      after: c.after,
    }));

  const otherClauses: Record<ClauseChangeKind, number> = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };
  for (const c of diff.clauses) {
    if (!showClause(c.number)) otherClauses[c.kind] += 1;
  }

  const finding = (c: FindingChange) => c.after ?? c.before;
  const rowFor = (c: FindingChange): ClientFindingRow => {
    const f = finding(c) as Finding;
    return {
      number: numbers[c.findingId] ?? "",
      clauseReference: f.clauseReference,
      kind: c.kind,
      change: plainChange(c.kind, c.resolvedReason, to.createdBy, signedOff),
      description: signedOff ? f.description : null,
      disposition: signedOff && c.after ? c.after.disposition : null,
      advocateAdded: signedOff && f.source === "advocate",
    };
  };

  // After sign-off every visible finding is a row. Before it, only the ones
  // a request to the client is about; the rest are counted.
  const rows = visibleChanges
    .filter((c) => signedOff || finding(c)?.changeRequest)
    .map(rowFor);

  const findingCounts = {
    new: visibleChanges.filter((c) => c.kind === "new").length,
    stillOpen: visibleChanges.filter((c) => c.kind === "unresolved").length,
    resolved: visibleChanges.filter((c) => c.kind === "resolved").length,
  };

  return {
    ok: true,
    diff: {
      from: from.number,
      to: to.number,
      fromLabel: label(from.number),
      toLabel: label(to.number),
      signedOff,
      clauses,
      otherClauses,
      findingRows: rows,
      findingCounts,
    },
  };
}
