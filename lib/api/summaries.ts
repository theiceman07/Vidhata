import { mockSummaries } from "@/lib/mock/summaries.mock";
import type { ContractDocument, SummaryResult } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocument } from "./documents";

/**
 * The plain-language summary of a settled document.
 *
 * It is a reading of the settled text, so it exists only after sign-off, and
 * that is held here and not in the page: a document that is not signed off
 * gets `not_available` whatever else is stored, so the content cannot leave
 * this function early. It is also shown only for the draft it was written
 * from, so a text that has changed since is never read against an old summary.
 */
export async function getSettledSummary(documentId: string): Promise<SummaryResult> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load the summary.");
  }
  const doc = await getDocument(documentId);
  if (!doc) throw new MockApiError("Document not found.");
  return summaryResultFor(doc);
}

/**
 * The summary reading of a document already in hand. The one place the gate
 * lives, so the summary page and the delivery view cannot disagree about it.
 */
export function summaryResultFor(doc: ContractDocument): SummaryResult {
  if (doc.status !== "settled" && doc.status !== "executed") {
    return { state: "not_available" };
  }
  const found = mockSummaries.find((s) => s.documentId === doc.id && s.draft === doc.version);
  return found ? { state: "ready", summary: structuredClone(found) } : { state: "none" };
}
