import type { ClientFinding } from "@/lib/types";
import { getDocument } from "../documents";
import { shapeClientFindings } from "./shape-findings";

/**
 * The request addressed to a client about a finding, found by the number they
 * read it by.
 *
 * This is how an answer finds what it answers. It returns the finding only if
 * the document is this client's organisation's and a request is addressed to
 * the client about that finding. Anything else is null, and every kind of
 * anything else is the same null: a number that was never given, a finding the
 * advocate kept from the client, a finding raised with no request to them,
 * another organisation's document, and a document that is not there. Nothing
 * about the answer says which, so a number cannot be used to find out what
 * exists.
 *
 * The number is the client's own (`ClientFinding.number`), never the document's
 * (`Finding.number`), which a finding kept from the client has and the client
 * has no way to know of.
 */
export async function getClientRequest(
  orgId: string,
  documentId: string,
  number: string,
): Promise<ClientFinding | null> {
  const doc = await getDocument(documentId);
  if (!doc || doc.orgId !== orgId) return null;
  const found = shapeClientFindings(doc).find((f) => f.number === number);
  return found && found.request !== null ? found : null;
}
