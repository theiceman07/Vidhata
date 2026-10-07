import type { ContractDocument, SettlementNote } from "@/lib/types";

/**
 * The rules for a settlement note, apart from where it is kept.
 *
 * A settlement note is a deliberate note from the advocate to the client about
 * one clause. These are pure so the API that keeps them and the sign-off that
 * releases them read the same rules, and so a test can hold them without a
 * store.
 */

/** Long enough to explain a clause, short enough to be a note and not a letter. */
export const MAX_SETTLEMENT_NOTE_LENGTH = 1200;

export type NoteText = { ok: true; text: string } | { ok: false; reason: string };

/** The text as it will be kept, or why it cannot be. A blank note is not a note. */
export function checkNoteText(input: string): NoteText {
  const text = input.trim();
  if (!text) return { ok: false, reason: "Write the note to the client." };
  if (text.length > MAX_SETTLEMENT_NOTE_LENGTH) {
    return { ok: false, reason: `Keep the note under ${MAX_SETTLEMENT_NOTE_LENGTH} characters.` };
  }
  return { ok: true, text };
}

/** Released is final: a released note is never edited, un-marked or deleted. */
export const noteIsReleased = (note: Pick<SettlementNote, "releasedAt">): boolean => note.releasedAt !== null;

/**
 * What sign-off would do with the notes. A marked note on a clause the draft
 * has is released. A marked note on a clause it does not have is not released:
 * it would speak of text the client will not see, so sign-off stops and names
 * it instead. A draft is neither: it is never released, however sign-off goes.
 */
export function partitionForRelease(
  doc: Pick<ContractDocument, "clauses">,
  notes: SettlementNote[],
): { release: SettlementNote[]; orphaned: SettlementNote[] } {
  const clauses = new Set(doc.clauses.map((c) => c.number));
  const marked = notes.filter((n) => n.shareWithClient && !noteIsReleased(n));
  return {
    release: marked.filter((n) => clauses.has(n.clauseNumber)),
    orphaned: marked.filter((n) => !clauses.has(n.clauseNumber)),
  };
}

/** The notes after sign-off at `at`: every marked one released, every other unchanged. */
export function releaseMarked(notes: SettlementNote[], at: string): SettlementNote[] {
  return notes.map((n) => (n.shareWithClient && !noteIsReleased(n) ? { ...n, releasedAt: at } : n));
}
