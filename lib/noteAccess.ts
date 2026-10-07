import { isReleased } from "@/lib/api/documents";
import type { ContractDocument } from "@/lib/types";

/**
 * Whether an advocate may write working notes on a document, and if not, the
 * words that say why. The screen disables the note controls on it, so an
 * advocate is told before typing and not after. The API holds the same rule
 * (`heldDocument`), so this only spares a refusal: it is never the guard.
 */
export type NoteAccess = { allowed: true } | { allowed: false; reason: string };

export function canWriteNotes(
  doc: Pick<ContractDocument, "status" | "advocate">,
  advocateId: string,
): NoteAccess {
  if (!isReleased(doc)) return { allowed: false, reason: "This document is not open for review yet" };
  if (!doc.advocate) return { allowed: false, reason: "Claim this document to add notes" };
  if (doc.advocate.id !== advocateId) {
    return { allowed: false, reason: `Held by ${doc.advocate.name}` };
  }
  return { allowed: true };
}
