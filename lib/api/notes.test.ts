import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addNote, deleteNote, listNotes, updateNote } from "./notes";
import {
  advocate,
  claimedDocument,
  otherAdvocate,
  refusal,
  releasedDocument,
  screenedDocument,
  settle,
} from "./testing";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const text = "Check this against the term sheet.";

/** A working note, written the way the review page writes one. */
const write = (documentId: string, clauseId: string, who = advocate) =>
  addNote({ documentId, clauseId, advocateId: who.id, text });

describe("a working note goes through the one gate the other advocate writes use", () => {
  it("is refused on an unpaid document exactly as on one that does not exist", async () => {
    const unpaid = await screenedDocument();
    const onUnpaid = await refusal(write(unpaid.id, "clause-1"));
    const onMissing = await refusal(write("no-such-document", "clause-1"));
    expect(onUnpaid).toBe("Document not found.");
    expect(onMissing).toBe(onUnpaid);
    expect(await settle(listNotes(unpaid.id, advocate.id))).toEqual([]);
  });

  it("is refused until the document is claimed", async () => {
    const released = await releasedDocument();
    expect(await refusal(write(released.id, released.clauses[0].id))).toBe(
      "Claim this document before you decide anything on it.",
    );
    expect(await settle(listNotes(released.id, advocate.id))).toEqual([]);
  });

  it("is refused to an advocate who does not hold the document, who is named", async () => {
    const doc = await claimedDocument();
    expect(await refusal(write(doc.id, doc.clauses[0].id, otherAdvocate))).toBe(
      "Test Advocate holds this document.",
    );
    expect(await settle(listNotes(doc.id, otherAdvocate.id))).toEqual([]);
  });

  it("is kept, changed and removed by the advocate who holds the document", async () => {
    const doc = await claimedDocument();
    const note = await settle(write(doc.id, doc.clauses[0].id));
    expect(note.text).toBe(text);

    const changed = await settle(updateNote(note.id, advocate.id, "A different thought."));
    expect(changed.text).toBe("A different thought.");

    await settle(deleteNote(note.id, advocate.id));
    expect(await settle(listNotes(doc.id, advocate.id))).toEqual([]);
  });

  it("is still the advocate's alone: another advocate cannot change or remove it", async () => {
    const doc = await claimedDocument();
    const note = await settle(write(doc.id, doc.clauses[0].id));
    expect(await refusal(updateNote(note.id, otherAdvocate.id, "Overwritten."))).toBe(
      "Note not found.",
    );
    await settle(deleteNote(note.id, otherAdvocate.id));
    const kept = await settle(listNotes(doc.id, advocate.id));
    expect(kept.map((n) => n.text)).toEqual([text]);
  });
});
