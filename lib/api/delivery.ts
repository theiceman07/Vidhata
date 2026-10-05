import type { DeliveryResult } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocument } from "./documents";
import { summaryResultFor } from "./summaries";

/**
 * The settled document as it is handed to the client.
 *
 * It rests on a recorded advocate sign-off, so a document without one (not
 * signed off, or signed off with no advocate or date on record) gets
 * `not_available`, and that is held here and not in the page. The sign-off
 * record, the summary and the checklist progress are all read from the one
 * document, so they cannot disagree.
 */
export async function getDelivery(documentId: string): Promise<DeliveryResult> {
  await randomDelay(250, 450);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load this delivery.");
  }
  const doc = await getDocument(documentId);
  if (!doc) throw new MockApiError("Document not found.");

  const signedOff = doc.status === "settled" || doc.status === "executed";
  if (!signedOff || !doc.advocate || !doc.settledAt) return { state: "not_available" };

  const summary = summaryResultFor(doc);
  const steps = doc.executionSteps.filter((s) => s.applicable);

  return {
    state: "ready",
    delivery: {
      documentId: doc.id,
      title: doc.title,
      counterparty: doc.counterpartyName,
      status: doc.status as "settled" | "executed",
      signOff: { advocate: doc.advocate.name, enrolment: doc.advocate.bar, at: doc.settledAt },
      summary: summary.state === "ready" ? summary.summary : null,
      checklist: { done: steps.filter((s) => s.complete).length, total: steps.length },
    },
  };
}
