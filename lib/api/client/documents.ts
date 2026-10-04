import type { ClientDocument, ClientDocumentSummary } from "@/lib/types";
import { getDocument, listDocuments } from "../documents";
import { shapeClientDocument, shapeClientSummary } from "./shape-document";

/**
 * A client's documents, as a client may read them. These are the reads a client
 * screen is meant to use: they take the organisation, and what comes back is the
 * client-shaped type, never the internal record.
 *
 * A document that is not the organisation's is the same null as one that is not
 * there, so asking cannot show that it exists.
 */

export async function getClientDocument(orgId: string, id: string): Promise<ClientDocument | null> {
  const doc = await getDocument(id);
  if (!doc || doc.orgId !== orgId) return null;
  return shapeClientDocument(doc);
}

/** Every document the organisation has, whatever its state, as the list reads them. */
export async function listClientDocuments(orgId: string): Promise<ClientDocumentSummary[]> {
  const docs = await listDocuments(orgId);
  return docs.filter((d) => d.orgId === orgId).map((d) => shapeClientSummary(d));
}
