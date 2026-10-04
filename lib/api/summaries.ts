import { mockSummaries } from "@/lib/mock/summaries.mock";
import type { SettledSummary } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocument } from "./documents";

/**
 * What asking for a summary can come back as. Three states, and the first two
 * carry nothing about the content: a document that is not signed off says only
 * that, and a signed-off one with no summary says only that.
 */
export type SummaryResult =
  | { state: "not_available" }
  | { state: "none" }
  | { state: "ready"; summary: SettledSummary };

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
  if (doc.status !== "settled" && doc.status !== "executed") {
    return { state: "not_available" };
  }
  const found = mockSummaries.find((s) => s.documentId === doc.id && s.draft === doc.version);
  return found ? { state: "ready", summary: structuredClone(found) } : { state: "none" };
}
