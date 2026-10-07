import { isReleased } from "@/lib/api/documents";
import type { ContractDocument, NoteAccess } from "@/lib/types";

/** Why a note already written cannot be changed once the document is signed off. */
export const NOTES_SIGNED_OFF = "Signed off. Notes can be added, not changed.";

/** What an advocate may do with working notes on a document: add one, and change one already written. */
export interface NoteRights {
  add: NoteAccess;
  change: NoteAccess;
}

/**
 * Whether an advocate may write working notes on a document, and if not, the
 * words that say why. The screen disables the note controls on it, so an
 * advocate is told before typing and not after. The API holds the same rule
 * (`heldDocument`, and `NOTES_SIGNED_OFF` in `lib/api/notes.ts`), so this only
 * spares a refusal: it is never the guard.
 *
 * Working notes are append-only after sign-off. A new one may still be added,
 * because working notes play no part in what the client receives, and the
 * advocate's own record of how they settled the document is not quietly
 * rewritten afterwards. Whether that is right is for counsel.
 */
export function canWriteNotes(
  doc: Pick<ContractDocument, "status" | "advocate">,
  advocateId: string,
): NoteRights {
  const refused = (reason: string): NoteRights => ({
    add: { allowed: false, reason },
    change: { allowed: false, reason },
  });
  if (!isReleased(doc)) return refused("This document is not open for review yet");
  if (!doc.advocate) return refused("Claim this document to add notes");
  if (doc.advocate.id !== advocateId) return refused(`Held by ${doc.advocate.name}`);
  const signedOff = doc.status === "settled" || doc.status === "executed";
  return {
    add: { allowed: true },
    change: signedOff ? { allowed: false, reason: NOTES_SIGNED_OFF } : { allowed: true },
  };
}
