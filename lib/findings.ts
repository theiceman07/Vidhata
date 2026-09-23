import type {
  Citation,
  ContractDocument,
  Finding,
  Severity,
} from "@/lib/types";

/**
 * Four state systems, never one.
 *
 * A document moves through its lifecycle, a finding through its own, a
 * citation is verified or blocked, and a document is claimed or not. They
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

export function findingState(finding: Finding): FindingState {
  if (finding.disposition !== "pending") return "settled";
  if (finding.changeRequest && !finding.changeRequest.response) {
    return "with_client";
  }
  return "open";
}

/** Everything not yet settled: open, or waiting on the client. */
export function unsettledFindings(doc: ContractDocument): Finding[] {
  return doc.findings.filter((f) => findingState(f) !== "settled");
}

export function openFindingCount(doc: ContractDocument): number {
  return unsettledFindings(doc).length;
}

export function findingsWithClient(doc: ContractDocument): Finding[] {
  return doc.findings.filter((f) => findingState(f) === "with_client");
}

/**
 * Citation lifecycle: verified or blocked. Never "probably fine".
 *
 * A blocked citation that an advocate has withdrawn no longer blocks the
 * finding, but it is still blocked: nothing here pretends it was checked.
 */
export function blockingCitations(finding: Finding): Citation[] {
  return finding.citations.filter(
    (c) => c.status === "blocked" && c.withdrawn === null,
  );
}

export function reliedCitations(finding: Finding): Citation[] {
  return finding.citations.filter(
    (c) => c.status === "verified" && c.withdrawn === null,
  );
}

export function canSettle(finding: Finding): boolean {
  return blockingCitations(finding).length === 0;
}

/**
 * A finding without a verified source is an opinion. It can still be
 * settled, because an advocate's judgment is the product, but only with
 * the reasoning written down.
 */
export function settleNeedsNote(finding: Finding): boolean {
  return reliedCitations(finding).length === 0;
}

export function hasBlockedCitation(doc: ContractDocument): boolean {
  return doc.findings.some((f) => blockingCitations(f).length > 0);
}

export function blockedCitationCount(doc: ContractDocument): number {
  return doc.findings.reduce((n, f) => n + blockingCitations(f).length, 0);
}

export function severityCounts(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
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
    if (blockingCitations(f).length > 0) {
      return { findingId: f.findingId, label: `Finding ${n} · source blocked` };
    }
    if (findingState(f) === "with_client") {
      return { findingId: f.findingId, label: `Finding ${n} · with the client` };
    }
    return { findingId: f.findingId, label: `Finding ${n} · open` };
  });
}
