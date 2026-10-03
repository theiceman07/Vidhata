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

type Options = { advocateAddedAfterSignOff?: boolean };

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

export interface ClientVersionRow {
  number: number;
  /** "Draft 3 (current)" for the latest snapshot, "Draft 2" for the rest. */
  label: string;
  current: boolean;
  createdAt: string;
  madeBy: string;
  clauseCount: number;
  /** Counted through clientVisibleFindings, never from the raw findings. */
  findingCount: number;
}

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
  versions: DocumentVersion[],
): { from: number; to: number } | null {
  const numbers = versions.map((v) => v.number).sort((a, b) => b - a);
  return numbers.length >= 2 ? { from: numbers[1], to: numbers[0] } : null;
}

/** What a finding's change is called to the client. Never an internal term. */
export function plainChange(
  kind: FindingChangeKind,
  reason: ResolvedReason | null,
  laterMadeBy: VersionCreatedBy,
): string {
  if (kind === "new") return "New in this draft";
  if (kind === "unresolved") return "Still open";
  if (reason === "clause_changed") {
    return laterMadeBy === "client_response"
      ? "No longer raised after your change to this clause"
      : "No longer raised after the advocate's revision to this clause";
  }
  return "Settled by the advocate";
}

export function dispositionText(disposition: Finding["disposition"]): string {
  if (disposition === "confirmed") return "Confirmed by the advocate";
  if (disposition === "overridden") return "Overridden by the advocate";
  return "Not yet decided";
}

export interface ClientClauseRow {
  number: string;
  heading: string;
  kind: ClauseChangeKind;
  before: string | null;
  after: string | null;
}

export interface ClientFindingRow {
  /** "04", as the client's own list numbers it. */
  number: string;
  clauseReference: string;
  kind: FindingChangeKind;
  /** Plain wording for the change. */
  change: string;
  /** The first pass's own words. After sign-off only. */
  description: string | null;
  /** The advocate's decision. After sign-off only. */
  disposition: Finding["disposition"] | null;
  /** Said only once the record is the client's to read in full. */
  advocateAdded: boolean;
}

export interface ClientVersionDiff {
  from: number;
  to: number;
  fromLabel: string;
  toLabel: string;
  signedOff: boolean;
  /** Clauses shown with their text. */
  clauses: ClientClauseRow[];
  /** Clauses not shown, only counted. Always zero after sign-off. */
  otherClauses: Record<ClauseChangeKind, number>;
  /**
   * Findings shown as rows. Named for what they are, not "findings": client
   * code must never read a document's own findings, and a guard test fails
   * on any `.findings` in a client file.
   */
  findingRows: ClientFindingRow[];
  /** Over every finding the client may know about, shown or not. */
  findingCounts: { new: number; stillOpen: number; resolved: number };
}

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

  // Only findings the client may know about, in either draft, and numbered
  // the way their own list numbers them.
  const fromVisible = clientVisibleFindings(fromDoc, options);
  const toVisible = clientVisibleFindings(toDoc, options);
  const visibleIds = new Set([...fromVisible, ...toVisible].map((f) => f.findingId));
  const numbers = {
    ...findingNumbers({ ...fromDoc, findings: fromVisible }),
    ...findingNumbers({ ...toDoc, findings: toVisible }),
  };
  const visibleChanges = diff.findings.filter((c) => visibleIds.has(c.findingId));

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
      change: plainChange(c.kind, c.resolvedReason, to.createdBy),
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
