import type { AdvocateNote } from "@/lib/types";
import { MockApiError, randomDelay } from "./delay";
import { register, restored } from "./state";

/**
 * An advocate's margin notes.
 *
 * Private to the advocate who wrote them: every call is scoped to one
 * advocate, and nothing here is ever read on the client side. A real backend
 * must scope them by the authenticated advocate, never by an id the page
 * supplies.
 */
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
  if (!text.trim()) throw new MockApiError("A note needs some text.");
  note.text = text.trim();
  note.updatedAt = new Date().toISOString();
  writeAll(all);
  return { ...note };
}

export async function deleteNote(noteId: string, advocateId: string): Promise<void> {
  await randomDelay(80, 160);
  writeAll(readAll().filter((n) => !(n.id === noteId && n.advocateId === advocateId)));
}
