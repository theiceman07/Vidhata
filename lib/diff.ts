import { findingState } from "@/lib/findings";
import type {
  Clause,
  ContractDocument,
  DocumentVersion,
  Finding,
} from "@/lib/types";

/**
 * What changed between two drafts, named once.
 *
 * Clause level, not word level. The client's version history and the
 * advocate's re-review both read this, so a clause is `changed` and a
 * finding is `new` or `unresolved` in exactly one place. For the advocate's
 * re-review "changed" is a changed clause, "newly flagged" is a `new`
 * finding and "unresolved" is an `unresolved` one.
 *
 * Callers compare snapshots, never the head, because the head keeps moving
 * between hand-offs. The one exception is the advocate's re-review, which
 * passes the head through headAsSide() against the latest snapshot.
 */

/** One side of a comparison: a snapshot, or the head for re-review only. */
export type DiffSide = Pick<DocumentVersion, "number" | "clauses" | "findings">;

export function headAsSide(doc: ContractDocument): DiffSide {
  return { number: doc.version, clauses: doc.clauses, findings: doc.findings };
}

export type ClauseChangeKind = "added" | "removed" | "changed" | "unchanged";

export interface ClauseChange {
  kind: ClauseChangeKind;
  /** "5.3". Clauses are matched by number. */
  number: string;
  /** The later heading, or the earlier one for a removed clause. */
  heading: string;
  /** The earlier body. Null for an added clause. */
  before: string | null;
  /** The later body. Null for a removed clause. */
  after: string | null;
}

export type FindingChangeKind = "new" | "unresolved" | "resolved";

/**
 * Why a finding is resolved. `settled`: it is still on the later draft and
 * the advocate has decided it. `clause_changed`: the later draft no longer
 * raises it. Without this an advocate cannot tell whether a fix worked or
 * the finding just moved.
 */
export type ResolvedReason = "clause_changed" | "settled";

export interface FindingChange {
  kind: FindingChangeKind;
  /** Stable across drafts: a carried-over finding keeps its id. */
  findingId: string;
  before: Finding | null;
  after: Finding | null;
  /** Set only when kind is "resolved". */
  resolvedReason: ResolvedReason | null;
}

export interface VersionDiff {
  from: number;
  to: number;
  clauses: ClauseChange[];
  findings: FindingChange[];
}

// Only a difference a reader could see counts as a change.
function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function sameClause(a: Clause, b: Clause): boolean {
  return (
    normalise(a.heading) === normalise(b.heading) &&
    normalise(a.body) === normalise(b.body)
  );
}

function diffClauses(earlier: Clause[], later: Clause[]): ClauseChange[] {
  const earlierByNumber = new Map(earlier.map((c) => [c.number, c]));
  const laterNumbers = new Set(later.map((c) => c.number));

  // The later draft's order, then whatever it dropped, in the earlier order.
  const changes: ClauseChange[] = later.map((after) => {
    const before = earlierByNumber.get(after.number);
    if (!before) {
      return {
        kind: "added",
        number: after.number,
        heading: after.heading,
        before: null,
        after: after.body,
      };
    }
    return {
      kind: sameClause(before, after) ? "unchanged" : "changed",
      number: after.number,
      heading: after.heading,
      before: before.body,
      after: after.body,
    };
  });

  earlier
    .filter((c) => !laterNumbers.has(c.number))
    .forEach((before) => {
      changes.push({
        kind: "removed",
        number: before.number,
        heading: before.heading,
        before: before.body,
        after: null,
      });
    });

  return changes;
}

const isSettled = (finding: Finding) => findingState(finding) === "settled";

/**
 * A finding already settled on the earlier draft is not part of this
 * revision's story and is not listed. Anything unsettled on the earlier
 * draft is either still unresolved or resolved, and anything the earlier
 * draft did not have is new.
 */
function diffFindings(earlier: Finding[], later: Finding[]): FindingChange[] {
  const earlierById = new Map(earlier.map((f) => [f.findingId, f]));
  const laterIds = new Set(later.map((f) => f.findingId));
  const changes: FindingChange[] = [];

  for (const after of later) {
    const before = earlierById.get(after.findingId) ?? null;
    if (!before) {
      changes.push({
        kind: "new",
        findingId: after.findingId,
        before: null,
        after,
        resolvedReason: null,
      });
    } else if (!isSettled(after)) {
      changes.push({
        kind: "unresolved",
        findingId: after.findingId,
        before,
        after,
        resolvedReason: null,
      });
    } else if (!isSettled(before)) {
      changes.push({
        kind: "resolved",
        findingId: after.findingId,
        before,
        after,
        resolvedReason: "settled",
      });
    }
  }

  for (const before of earlier) {
    if (laterIds.has(before.findingId) || isSettled(before)) continue;
    changes.push({
      kind: "resolved",
      findingId: before.findingId,
      before,
      after: null,
      resolvedReason: "clause_changed",
    });
  }

  return changes;
}

export function diffVersions(earlier: DiffSide, later: DiffSide): VersionDiff {
  return {
    from: earlier.number,
    to: later.number,
    clauses: diffClauses(earlier.clauses, later.clauses),
    findings: diffFindings(earlier.findings, later.findings),
  };
}
