import type { ClientVersionDiffResult } from "@/lib/clientVersions";
import type { ClientVersionList } from "@/lib/types";
import { getDocument, getDocumentVersions } from "../documents";
import { shapeClientDiff, shapeClientVersionList } from "./shape-versions";

/**
 * A client's view of a document's history. Both take the organisation, and a
 * document that is not the organisation's is the same null as one that is not
 * there. The drafts themselves are never handed over: a list of them as counts,
 * and a comparison limited to what the client may read.
 */

export async function getClientVersions(orgId: string, id: string): Promise<ClientVersionList | null> {
  const doc = await getDocument(id);
  if (!doc || doc.orgId !== orgId) return null;
  return shapeClientVersionList(doc, await getDocumentVersions(id));
}

export async function getClientDiff(
  orgId: string,
  id: string,
  a: number,
  b: number,
): Promise<ClientVersionDiffResult | null> {
  const doc = await getDocument(id);
  if (!doc || doc.orgId !== orgId) return null;
  return shapeClientDiff(doc, await getDocumentVersions(id), a, b);
}
