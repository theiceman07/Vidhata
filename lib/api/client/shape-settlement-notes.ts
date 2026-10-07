import type { ClientSettlementNote, ContractDocument } from "@/lib/types";
import { asClientReads, signOffRecord } from "./shape-findings";

/**
 * The notes to the client a client may read: the ones released at sign-off, and
 * none before it.
 *
 * The one place a settlement note becomes a client note. Each field handed over
 * is named, so a field added to the stored note is not given to a client until
 * someone adds it here on purpose. Not whether a note was ever a draft, not who
 * wrote it (the byline is the sign-off record's, which already names the
 * advocate), and nothing of the working notes in the margin, which are not on the
 * document at all.
 *
 * Before the recorded sign-off the answer is an empty list whatever is stored,
 * the same for a document with no notes as for one with many, so nothing says
 * that any exist. A note counts only if it is marked and was released: a draft is
 * never handed over, even on a signed-off document.
 */
export function shapeClientSettlementNotes(record: ContractDocument): ClientSettlementNote[] {
  const doc = asClientReads(record);
  if (signOffRecord(doc) === null) return [];
  return (doc.settlementNotes ?? [])
    .filter((n) => n.shareWithClient && n.releasedAt !== null)
    .map((n) => ({
      id: n.id,
      clauseNumber: n.clauseNumber,
      text: n.text,
      releasedAt: n.releasedAt as string,
    }));
}
