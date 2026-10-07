import type { AdvocateNote } from "@/lib/types";
import { MockApiError, randomDelay } from "./delay";
import { NOTES_SIGNED_OFF } from "@/lib/noteAccess";
import { heldDocument } from "./documents";
import { register, restored } from "./state";

/**
 * An advocate's margin notes.
 *
 * Private to the advocate who wrote them: every call is scoped to one
 * advocate, and nothing here is ever read on the client side. A real backend
 * must scope them by the authenticated advocate, never by an id the page
 * supplies.
 *
 * Every write goes through the one gate the other advocate writes use
 * (`heldDocument`): an unpaid or missing document is the same "Document not
 * found.", and only the advocate who holds the claim may write.
 *
 * After sign-off the notes are append-only: a new one may be added, and one
 * already written can be neither changed nor removed. They are the advocate's
 * own record of how they settled the document.
 */

/** A note already written is the advocate's record once the document is signed off. */
function unchangeable(documentId: string, advocateId: string): void {
  const doc = heldDocument(documentId, advocateId);
  if (doc.status === "settled" || doc.status === "executed") throw new MockApiError(NOTES_SIGNED_OFF);
}
// Held for this browser tab with the rest of the preview's data (lib/api/state),
// so they survive a refresh and die with the tab. They used to be in
// localStorage, which kept them for days and across tabs.
let notes: AdvocateNote[] = restored("notes");
register("notes", () => notes);

const readAll = () => notes;
const writeAll = (next: AdvocateNote[]) => {
  notes = next;
};

export async function listNotes(
  documentId: string,
  advocateId: string,
): Promise<AdvocateNote[]> {
  await randomDelay(80, 160);
  return readAll().filter(
    (n) => n.documentId === documentId && n.advocateId === advocateId,
  );
}

export async function addNote(input: {
  documentId: string;
  clauseId: string;
  advocateId: string;
  text: string;
}): Promise<AdvocateNote> {
  await randomDelay(80, 160);
  heldDocument(input.documentId, input.advocateId);
  const text = input.text.trim();
  if (!text) throw new MockApiError("A note needs some text.");
  const now = new Date().toISOString();
  const note: AdvocateNote = {
    id: `note-${Date.now()}`,
    ...input,
    text,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...readAll(), note]);
  return note;
}

export async function updateNote(
  noteId: string,
  advocateId: string,
  text: string,
): Promise<AdvocateNote> {
  await randomDelay(80, 160);
  const all = readAll();
  const note = all.find((n) => n.id === noteId && n.advocateId === advocateId);
  if (!note) throw new MockApiError("Note not found.");
  unchangeable(note.documentId, advocateId);
  if (!text.trim()) throw new MockApiError("A note needs some text.");
  note.text = text.trim();
  note.updatedAt = new Date().toISOString();
  writeAll(all);
  return { ...note };
}

export async function deleteNote(noteId: string, advocateId: string): Promise<void> {
  await randomDelay(80, 160);
  const note = readAll().find((n) => n.id === noteId && n.advocateId === advocateId);
  // A note that is not there is already gone, so removing it again changes nothing.
  if (!note) return;
  unchangeable(note.documentId, advocateId);
  writeAll(readAll().filter((n) => n !== note));
}
