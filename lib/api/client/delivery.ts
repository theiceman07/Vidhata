import type { DeliveryResult, SummaryResult } from "@/lib/types";
import { getDelivery } from "../delivery";
import { getSettledSummary } from "../summaries";
import { ownDocument } from "./own";

/**
 * What a client is handed once a document is settled: the delivery and its
 * summary. Both take the organisation, and a document that is not the
 * organisation's is the same "Document not found." as one that is not there.
 * Whether either exists is still the API's to say: a document with no recorded
 * sign-off is "not available" and nothing more.
 */

export function getClientDelivery(orgId: string, id: string): Promise<DeliveryResult> {
  return ownDocument(orgId, id).then(() => getDelivery(id));
}

/**
 * The summary, with the title the page puts over it. The title is given only
 * once the summary is the client's to read, so a document that is not signed
 * off is not named by asking for its summary.
 */
export async function getClientSummary(
  orgId: string,
  id: string,
): Promise<{ title: string | null; result: SummaryResult }> {
  const doc = await ownDocument(orgId, id);
  const result = await getSettledSummary(id);
  return { title: result.state === "not_available" ? null : doc.title, result };
}
