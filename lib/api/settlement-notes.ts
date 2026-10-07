import { checkNoteText, noteIsReleased } from "@/lib/settlementNotes";
import type { SettlementNote } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocumentForReview, heldDocument } from "./documents";

/**
 * An advocate's notes to the client, kept on the document they hold.
 *
 * These are not the working notes in the margin (lib/api/notes.ts), and nothing
 * here turns one into the other. A note is written as a draft. Marking it to
 * share is a second act. Nothing in this file releases a note: only
 * `signOffDocument` sets `releasedAt`, in the same step as the sign-off, so a
 * note cannot reach a client by any other route. Every write goes through the
 * one gate the other advocate writes use (`heldDocument`): an unpaid or missing
 * document is the same "Document not found.", and only the holder may write.
 *
 * Once the document is signed off nothing here can change a note. A released
 * note is the client's record.
 */

const SIGNED_OFF = "This document is signed off. Its notes can no longer be changed.";

/** The document, held by this advocate and not yet signed off. */
function writable(documentId: string, advocateId: string) {
  const doc = heldDocument(documentId, advocateId);
  if (doc.status === "settled" || doc.status === "executed") throw new MockApiError(SIGNED_OFF);
  return doc;
}

function nextId(notes: SettlementNote[]): string {
  const highest = notes.reduce((max, n) => Math.max(max, Number(n.id.replace(/^\D+/, "")) || 0), 0);
  return `settlement-note-${highest + 1}`;
}

/**
 * The advocate's notes on a document, drafts and marked, in the order they were
 * written. An advocate who does not hold the document has none to read.
 */
export async function listSettlementNotes(
  advocateId: string,
  documentId: string,
): Promise<SettlementNote[]> {
  const doc = await getDocumentForReview(documentId);
  if (!doc) throw new MockApiError("Document not found.");
  if (doc.advocate?.id !== advocateId) return [];
  return structuredClone(doc.settlementNotes ?? []);
}

/** A new draft on a clause. A clause has one note to the client, so a second is refused. */
export async function addSettlementNote(
  advocateId: string,
  documentId: string,
  clauseNumber: string,
  text: string,
): Promise<SettlementNote> {
  await randomDelay(80, 160);
  if (shouldSimulateFailure()) throw new MockApiError("Could not keep this note.");
  const doc = writable(documentId, advocateId);
  if (!doc.clauses.some((c) => c.number === clauseNumber)) {
    throw new MockApiError("Clause not found.");
  }
  const checked = checkNoteText(text);
  if (!checked.ok) throw new MockApiError(checked.reason);
  const notes = doc.settlementNotes ?? [];
  if (notes.some((n) => n.clauseNumber === clauseNumber)) {
    throw new MockApiError("This clause already has a note to the client. Edit it instead.");
  }
  const now = new Date().toISOString();
  const note: SettlementNote = {
    id: nextId(notes),
    clauseNumber,
    text: checked.text,
    shareWithClient: false,
    createdAt: now,
    updatedAt: now,
    releasedAt: null,
  };
  doc.settlementNotes = [...notes, note];
  return structuredClone(note);
}

/**
 * Change a draft's words, or mark it to be shared at sign-off or take the mark
 * off. Marking is not releasing: nothing is released until sign-off.
 */
export async function updateSettlementNote(
  advocateId: string,
  documentId: string,
  noteId: string,
  change: { text?: string; shareWithClient?: boolean },
): Promise<SettlementNote> {
  await randomDelay(80, 160);
  if (shouldSimulateFailure()) throw new MockApiError("Could not save this note.");
  const doc = writable(documentId, advocateId);
  const note = (doc.settlementNotes ?? []).find((n) => n.id === noteId);
  if (!note) throw new MockApiError("Note not found.");
  if (noteIsReleased(note)) throw new MockApiError(SIGNED_OFF);

  let text = note.text;
  if (change.text !== undefined) {
    const checked = checkNoteText(change.text);
    if (!checked.ok) throw new MockApiError(checked.reason);
    text = checked.text;
  }
  if (change.shareWithClient !== undefined && typeof change.shareWithClient !== "boolean") {
    throw new MockApiError("Say whether to share this note with the client.");
  }
  note.text = text;
  if (change.shareWithClient !== undefined) note.shareWithClient = change.shareWithClient;
  note.updatedAt = new Date().toISOString();
  return structuredClone(note);
}

/** Remove a draft, marked or not. A released note cannot be removed. */
export async function deleteSettlementNote(
  advocateId: string,
  documentId: string,
  noteId: string,
): Promise<void> {
  await randomDelay(80, 160);
  if (shouldSimulateFailure()) throw new MockApiError("Could not remove this note.");
  const doc = writable(documentId, advocateId);
  const note = (doc.settlementNotes ?? []).find((n) => n.id === noteId);
  if (!note) throw new MockApiError("Note not found.");
  if (noteIsReleased(note)) throw new MockApiError(SIGNED_OFF);
  doc.settlementNotes = (doc.settlementNotes ?? []).filter((n) => n.id !== noteId);
}
