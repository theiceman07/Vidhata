import type { ContractDocument } from "@/lib/types";
import { MockApiError } from "../delay";
import { getDocument } from "../documents";
import { backendDataEnabled } from "../source";

/**
 * The client's own document, or the one refusal every other case gets: another
 * organisation's document and one that is not there are both "Document not
 * found.", so a read or a write cannot show that a document exists.
 */
export async function ownDocument(orgId: string, id: string): Promise<ContractDocument> {
  const doc = await getDocument(id);
  // With the real backend the server has already scoped the read to the caller's organisation.
  if (!doc || (!backendDataEnabled() && doc.orgId !== orgId)) throw new MockApiError("Document not found.");
  return doc;
}
