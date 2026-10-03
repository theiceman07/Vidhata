import { lookupCitation, type BlockedReason, type CitationLookup } from "@/lib/citations";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";

/**
 * One time an advocate typed a citation and the gate ran on it.
 *
 * Kept as a record of its own, not inferred from findings afterwards: a
 * blocked attempt may never become a finding at all, and the share of typed
 * citations the corpus could not match is the pre-gate fabrication rate
 * (FR-14). That rate is blocked typed attempts over all typed attempts.
 * Picking a citation from the corpus is not an attempt: it is always
 * verified, so it is not in the denominator.
 */
export interface CitationAttempt {
  id: string;
  /** ISO 8601. */
  at: string;
  documentId: string;
  advocateId: string;
  /** Exactly what was typed, before any normalising. */
  input: string;
  outcome: "verified" | "blocked";
  corpusRef: string | null;
  reason: BlockedReason | null;
}

// In-memory, like the rest of the mock layer: it resets on reload, and a
// real backend would write each one as an event.
const attempts: CitationAttempt[] = [];

/** Run a typed citation through the gate, and record that it was tried. */
export async function checkCitation(args: {
  documentId: string;
  advocateId: string;
  input: string;
}): Promise<CitationLookup> {
  await randomDelay(150, 350);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not check this source.");
  }
  const result = lookupCitation(args.input);
  attempts.push({
    id: `attempt-${attempts.length + 1}`,
    at: new Date().toISOString(),
    documentId: args.documentId,
    advocateId: args.advocateId,
    input: args.input,
    outcome: result.status,
    corpusRef: result.corpusRef,
    reason: result.reason,
  });
  return result;
}

/** What the fabrication-rate metric reads. Oldest first. */
export async function listCitationAttempts(): Promise<CitationAttempt[]> {
  await randomDelay(100, 200);
  return structuredClone(attempts);
}
