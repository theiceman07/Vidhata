import type { Citation, ContractDocument, Finding } from "@/lib/types";

/**
 * Board V2.0 speaks in OPEN and SETTLED, not in dispositions.
 *
 * Both "confirmed" and "overridden" are advocate decisions, so both are
 * settled. An overridden finding is settled *with* a note attached, not
 * still open — the note is the record of the judgment, and the finding
 * stays in the document either way.
 */
export type FindingState = "open" | "settled";

export function findingState(finding: Finding): FindingState {
  return finding.disposition === "pending" ? "open" : "settled";
}

export function openFindings(doc: ContractDocument): Finding[] {
  return doc.findings.filter((f) => findingState(f) === "open");
}

export function openFindingCount(doc: ContractDocument): number {
  return openFindings(doc).length;
}

/**
 * A citation is either verified or blocked. Never "probably fine".
 *
 * A blocked citation means the source could not be checked against the
 * corpus, so the concern it supports is unevidenced and the finding
 * cannot be settled on it.
 */
export function blockedCitations(finding: Finding): Citation[] {
  return finding.citations.filter((c) => c.status === "blocked");
}

export function canSettle(finding: Finding): boolean {
  return blockedCitations(finding).length === 0;
}

/** Documents with an unresolved source, for the queue's state line. */
export function hasBlockedCitation(doc: ContractDocument): boolean {
  return doc.findings.some((f) => blockedCitations(f).length > 0);
}

/**
 * Findings are numbered for display in the order the pipeline raised
 * them, so a reader can refer to "finding 04" and mean one thing. The id
 * itself is opaque and is never shown.
 */
export function findingNumber(
  doc: ContractDocument,
  findingId: string,
): string {
  const index = doc.findings.findIndex((f) => f.findingId === findingId);
  return String(index + 1).padStart(2, "0");
}
