import {
  lookupCitation,
  resolveCitationSource,
  type BlockedReason,
  type CitationLookup,
  type CitationSource,
} from "@/lib/citations";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocumentForReview } from "./documents";
import { register, restored } from "./state";

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
const attempts: CitationAttempt[] = restored("citationAttempts");
register("citationAttempts", () => attempts);

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

/**
 * What one citation on a document resolved to, for the advocate reading it.
 *
 * Read through getDocumentForReview, so a missing document and one still
 * awaiting payment are the same "Document not found." and nothing is told
 * about either. Reading it records nothing: it is not an attempt.
 */
export async function getCitationSource(args: {
  documentId: string;
  findingId: string;
  citationId: string;
}): Promise<CitationSource> {
  const doc = await getDocumentForReview(args.documentId);
  if (!doc) throw new MockApiError("Document not found.");
  const finding = doc.findings.find((f) => f.findingId === args.findingId);
  if (!finding) throw new MockApiError("Finding not found.");
  const citation = finding.citations.find((c) => c.id === args.citationId);
  if (!citation) throw new MockApiError("Citation not found.");
  return resolveCitationSource(citation);
}

/** What the fabrication-rate metric reads. Oldest first. */
export async function listCitationAttempts(): Promise<CitationAttempt[]> {
  await randomDelay(100, 200);
  return structuredClone(attempts);
}
