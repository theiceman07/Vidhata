import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { NOTES_SIGNED_OFF } from "@/lib/noteAccess";
import { signOffDocument } from "./documents";
import { getClientSettlementNotes } from "./client/settlement-notes";
import { addNote, deleteNote, listNotes, updateNote } from "./notes";
import { addSettlementNote, listSettlementNotes } from "./settlement-notes";
import {
  advocate,
  claimedDocument,
  otherAdvocate,
  refusal,
  releasedDocument,
  screenedDocument,
  settle,
  settleEverything,
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

describe("after sign-off the working notes are append-only", () => {
  /** A held document with one working note on it, signed off. */
  async function signedOffWithANote() {
    const doc = await claimedDocument();
    const note = await settle(write(doc.id, doc.clauses[0].id));
    await settleEverything(doc.id);
    await settle(signOffDocument(doc.id, advocate.id));
    return { doc, note };
  }

  it("lets the holder add a new note", async () => {
    const { doc } = await signedOffWithANote();
    const added = await settle(addNote({ documentId: doc.id, clauseId: doc.clauses[1].id, advocateId: advocate.id, text: "Add to the file." }));
    expect(added.text).toBe("Add to the file.");
    expect((await settle(listNotes(doc.id, advocate.id))).map((n) => n.text)).toContain("Add to the file.");
  });

  it("refuses to change or remove a note already written, and says why", async () => {
    const { doc, note } = await signedOffWithANote();
    expect(await refusal(updateNote(note.id, advocate.id, "Rewritten afterwards."))).toBe(NOTES_SIGNED_OFF);
    expect(await refusal(deleteNote(note.id, advocate.id))).toBe(NOTES_SIGNED_OFF);
    const kept = await settle(listNotes(doc.id, advocate.id));
    expect(kept.map((n) => n.text)).toEqual([text]);
  });

  it("also refuses to change or remove a note that was itself added after sign-off", async () => {
    const { doc } = await signedOffWithANote();
    const late = await settle(addNote({ documentId: doc.id, clauseId: doc.clauses[1].id, advocateId: advocate.id, text: "Late." }));
    expect(await refusal(updateNote(late.id, advocate.id, "Later."))).toBe(NOTES_SIGNED_OFF);
    expect(await refusal(deleteNote(late.id, advocate.id))).toBe(NOTES_SIGNED_OFF);
  });

  it("never lets a note added after sign-off reach the client, or become a note to the client", async () => {
    const { doc } = await signedOffWithANote();
    const sentinel = "LATE-WORKING-NOTE-SENTINEL";
    await settle(addNote({ documentId: doc.id, clauseId: doc.clauses[1].id, advocateId: advocate.id, text: sentinel }));

    // It is not a settlement note: those are a different store, written only through their own API.
    const settlement = await settle(listSettlementNotes(advocate.id, doc.id));
    expect(JSON.stringify(settlement)).not.toContain(sentinel);
    // Nothing is released by it, and the client reads only what sign-off released.
    const client = await settle(getClientSettlementNotes(MOCK_CLIENT_ORG.id, doc.id));
    expect(JSON.stringify(client)).not.toContain(sentinel);
    expect(client).toEqual([]);
    // And the notes to the client can no longer be written, edited, marked or removed at all.
    expect(await refusal(addSettlementNote(advocate.id, doc.id, doc.clauses[1].number, "A note to the client."))).toBe(
      "This document is signed off. Its notes can no longer be changed.",
    );
  });
});
