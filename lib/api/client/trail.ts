import type { ClientAuditEntry } from "@/lib/types";
import { getDocument } from "../documents";
import { shapeClientTrail } from "./shape-trail";

/**
 * A client's activity trail for one of their documents. It takes the
 * organisation, and a document that is not the organisation's is the same null
 * as one that is not there.
 */
export async function getClientTrail(orgId: string, id: string): Promise<ClientAuditEntry[] | null> {
  const doc = await getDocument(id);
  if (!doc || doc.orgId !== orgId) return null;
  return shapeClientTrail(doc);
}
