import type { AdvocateNote } from "@/lib/types";
import { MockApiError, randomDelay } from "./delay";

/**
 * An advocate's margin notes.
 *
 * Private to the advocate who wrote them: every call is scoped to one
 * advocate, and nothing here is ever read on the client side. Until the
 * backend lands the notes live in this browser's localStorage, so they
 * survive a reload. A real backend must scope them by the authenticated
 * advocate, never by an id the page supplies.
 */
const STORAGE_KEY = "vidhata-advocate-notes";

function readAll(): AdvocateNote[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdvocateNote[]) : [];
  } catch {
    return [];
  }
}

function writeAll(notes: AdvocateNote[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage unavailable: the note lasts for this page only.
  }
}

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
