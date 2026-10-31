import { SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF } from "@/lib/config/visibility";
import {
  SEVERITY_ORDER,
  type ContractDocument,
  type DocumentStatus,
  type Finding,
  type Severity,
} from "@/lib/types";

/** A document in draft or still being analysed has not been screened: its empty findings list means "not yet", not "none". */
export function isScreened(status: DocumentStatus): boolean {
  return status !== "draft" && status !== "analysing";
}

/** The line over the findings list when there are no findings to list. */
export function noFindingsLine(status: DocumentStatus, scoped: boolean): string {
  if (!isScreened(status)) return "Not screened yet";
  return scoped ? "No findings in this round" : "No findings raised";
}

/**
 * Three state systems, never one.
 *
 * A document moves through its lifecycle, a finding through its own, and a
 * document is claimed or not. They
 * are read from different fields and drawn with different marks, so that
 * "changes requested" can never sit beside "no open findings" without the
 * screen also saying what the change is.
 */

/**
 * Finding lifecycle.
 *
 * Both "confirmed" and "overridden" are advocate decisions, so both are
 * settled. A finding is with the client when the advocate has asked them
 * something and the answer has not come back yet; once it has, the
 * decision is the advocate's again, and the finding is open.
 */
export type FindingState = "open" | "with_client" | "settled";

/**
 * What a finding's state is read from. The shared workspace holds a client's
 * findings as well as an advocate's, so these take only what they read, and a
 * caller's richer finding comes back as it went in.
 */
type Decidable = Pick<Finding, "disposition"> & { changeRequest: { response: string | null } | null };

export function findingState(finding: Decidable): FindingState {
  if (finding.disposition !== "pending") return "settled";
  if (finding.changeRequest && !finding.changeRequest.response) {
    return "with_client";
  }
  return "open";
}

/** Everything not yet settled: open, or waiting on the client. */
export function unsettledFindings<F extends Decidable>(doc: { findings: F[] }): F[] {
  return doc.findings.filter((f) => findingState(f) !== "settled");
}

export function openFindingCount(doc: { findings: Decidable[] }): number {
  return unsettledFindings(doc).length;
}

export function findingsWithClient<F extends Decidable>(doc: { findings: F[] }): F[] {
  return doc.findings.filter((f) => findingState(f) === "with_client");
}

/**
 * What a client may be told of a document's findings.
 *
 * Before sign-off the client sees status and the passages behind requests
 * addressed to them, so a finding the advocate added reaches them only
 * through a request addressed to them. After sign-off the whole record is
 * theirs, read-only. Every client screen reads findings through this, never
 * from doc.findings, so a screen cannot count or list a finding it should
 * not know about. The advocate portal reads doc.findings and keeps the full
 * picture.
 */
export function clientVisibleFindings(
  doc: ContractDocument,
  options: { advocateAddedAfterSignOff?: boolean } = {},
): Finding[] {
  const signedOff = doc.status === "settled" || doc.status === "executed";
  const advocateAddedAfterSignOff =
    options.advocateAddedAfterSignOff ?? SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF;
  if (signedOff && advocateAddedAfterSignOff) return doc.findings;
  return doc.findings.filter((f) => f.source === "pipeline" || f.changeRequest !== null);
}

/**
 * What the first pass raised. Findings an advocate added are not part of it,
 * so "the first pass raised N" counts only these, for the client and the
 * advocate alike.
 */
export function firstPassFindings(doc: ContractDocument): Finding[] {
  return doc.findings.filter((f) => f.source === "pipeline");
}

/** 0 is the most serious. Sort ascending to put the worst first. */
export function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

export function severityCounts(findings: Pick<Finding, "severity">[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  findings.forEach((f) => {
    counts[f.severity] += 1;
  });
  return counts;
}

/**
 * Findings are numbered for display in the order the pipeline raised
 * them, so a reader can refer to "finding 04" and mean one thing. The id
 * itself is opaque and is never shown.
 */
export function findingNumbers(doc: ContractDocument): Record<string, string> {
  const map: Record<string, string> = {};
  doc.findings.forEach((f, i) => {
    map[f.findingId] = String(i + 1).padStart(2, "0");
  });
  return map;
}

/**
 * Why sign-off is unavailable, as things someone can act on. Each blocker
 * names its finding so the screen can offer a way straight to it.
 */
export interface Blocker {
  findingId: string | null;
  label: string;
}

export function signOffBlockers(
  doc: ContractDocument,
  advocateId: string,
): Blocker[] {
  if (!doc.advocate) {
    return [{ findingId: null, label: "Claim the document to review it" }];
  }
  if (doc.advocate.id !== advocateId) {
    // Claims are exclusive, so there is nothing this advocate can do to
    // clear it; the blocker says whose document it is.
    return [{ findingId: null, label: `Held by ${doc.advocate.name}` }];
  }

  const numbers = findingNumbers(doc);
  return unsettledFindings(doc).map((f) => {
    const n = numbers[f.findingId];
    if (findingState(f) === "with_client") {
      return { findingId: f.findingId, label: `Finding ${n} · with the client` };
    }
    return { findingId: f.findingId, label: `Finding ${n} · open` };
  });
}
