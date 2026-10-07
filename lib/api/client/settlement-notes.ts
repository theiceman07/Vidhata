import type { ClientSettlementNote } from "@/lib/types";
import { ownDocument } from "./own";
import { shapeClientSettlementNotes } from "./shape-settlement-notes";

/**
 * The notes to the client on one of the organisation's own documents.
 *
 * A document that is not the organisation's is the same "Document not found."
 * as one that is not there, so asking cannot show that it exists. Before the
 * recorded sign-off the list is empty, for every document alike, whatever the
 * advocate has written: nothing here says that a note exists until it has been
 * released. After it, the notes marked to share and released with the sign-off,
 * and no others.
 */
export async function getClientSettlementNotes(
  orgId: string,
  id: string,
): Promise<ClientSettlementNote[]> {
  return shapeClientSettlementNotes(await ownDocument(orgId, id));
}
