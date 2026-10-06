import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SETTLEMENT_NOTE_LENGTH } from "@/lib/settlementNotes";
import { addNote, listNotes } from "./notes";
import {
  addSettlementNote,
  deleteSettlementNote,
  listSettlementNotes,
  updateSettlementNote,
} from "./settlement-notes";
import {
  advocate,
  claimedDocument,
  otherAdvocate,
  refusal,
  releasedDocument,
  screenedDocument,
  settle,
  signedOffDocument,
} from "./testing";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** A document the advocate holds, and a clause on it. */
async function held() {
  const doc = await claimedDocument();
  return { doc, id: doc.id, clause: doc.clauses[0].number, other: doc.clauses[1].number };
}

describe("writing a settlement note", () => {
  it("starts as a draft: not marked, and never released", async () => {
    const { id, clause } = await held();
    const note = await settle(addSettlementNote(advocate.id, id, clause, "  Read this with clause 4.  "));
    expect(note).toMatchObject({
      clauseNumber: clause,
      text: "Read this with clause 4.",
      shareWithClient: false,
      releasedAt: null,
    });
    expect(Number.isNaN(new Date(note.createdAt).getTime())).toBe(false);
  });

  it("is refused for anyone but the advocate who holds the document, who is named", async () => {
    const { id, clause } = await held();
    expect(await refusal(addSettlementNote(otherAdvocate.id, id, clause, "A note."))).toBe(
      "Test Advocate holds this document.",
    );
    expect(await settle(listSettlementNotes(advocate.id, id))).toEqual([]);
  });

  it("is refused until the document is claimed", async () => {
    const released = await releasedDocument();
    expect(
      await refusal(addSettlementNote(advocate.id, released.id, released.clauses[0].number, "A note.")),
    ).toMatch(/Claim this document/);
  });

  it("is refused on an unpaid document exactly as on one that does not exist", async () => {
    const unpaid = await screenedDocument();
    const onUnpaid = await refusal(addSettlementNote(advocate.id, unpaid.id, unpaid.clauses[0].number, "A note."));
    const onMissing = await refusal(addSettlementNote(advocate.id, "no-such-document", "1.1", "A note."));
    expect(onUnpaid).toBe("Document not found.");
    expect(onMissing).toBe(onUnpaid);
    expect(await refusal(listSettlementNotes(advocate.id, unpaid.id))).toBe("Document not found.");
    expect(await refusal(listSettlementNotes(advocate.id, "no-such-document"))).toBe("Document not found.");
  });

  it("is refused for a clause the document does not have", async () => {
    const { id } = await held();
    expect(await refusal(addSettlementNote(advocate.id, id, "99.99", "A note."))).toBe("Clause not found.");
    expect(await settle(listSettlementNotes(advocate.id, id))).toEqual([]);
  });

  it("is not a note when it is blank, and is capped", async () => {
    const { id, clause } = await held();
    for (const blank of ["", "   ", "\n \t"]) {
      expect(await refusal(addSettlementNote(advocate.id, id, clause, blank))).toBe("Write the note to the client.");
    }
    expect(
      await refusal(addSettlementNote(advocate.id, id, clause, "x".repeat(MAX_SETTLEMENT_NOTE_LENGTH + 1))),
    ).toMatch(/under 1200 characters/);
    expect(await settle(listSettlementNotes(advocate.id, id))).toEqual([]);
  });

  it("gives a clause one note to the client, and a second is refused", async () => {
    const { id, clause, other } = await held();
    await settle(addSettlementNote(advocate.id, id, clause, "First."));
    expect(await refusal(addSettlementNote(advocate.id, id, clause, "Second."))).toBe(
      "This clause already has a note to the client. Edit it instead.",
    );
    await settle(addSettlementNote(advocate.id, id, other, "On another clause."));
    expect((await settle(listSettlementNotes(advocate.id, id))).map((n) => n.clauseNumber)).toEqual([clause, other]);
  });

  it("is kept for the advocate to read back, and for no one else", async () => {
    const { id, clause } = await held();
    await settle(addSettlementNote(advocate.id, id, clause, "Mine."));
    expect((await settle(listSettlementNotes(advocate.id, id))).map((n) => n.text)).toEqual(["Mine."]);
    expect(await settle(listSettlementNotes(otherAdvocate.id, id))).toEqual([]);
  });
});

describe("marking and editing a settlement note", () => {
  async function withNote() {
    const h = await held();
    const note = await settle(addSettlementNote(advocate.id, h.id, h.clause, "Draft."));
    return { ...h, note };
  }

  it("marking it to share is not releasing it", async () => {
    const { id, note } = await withNote();
    const marked = await settle(updateSettlementNote(advocate.id, id, note.id, { shareWithClient: true }));
    expect(marked).toMatchObject({ shareWithClient: true, releasedAt: null });
    const unmarked = await settle(updateSettlementNote(advocate.id, id, note.id, { shareWithClient: false }));
    expect(unmarked).toMatchObject({ shareWithClient: false, releasedAt: null });
  });

  it("can have its words changed, under the same rules as writing it", async () => {
    const { id, note } = await withNote();
    const edited = await settle(updateSettlementNote(advocate.id, id, note.id, { text: "  Better.  " }));
    expect(edited.text).toBe("Better.");
    expect(await refusal(updateSettlementNote(advocate.id, id, note.id, { text: "   " }))).toBe(
      "Write the note to the client.",
    );
    const [kept] = await settle(listSettlementNotes(advocate.id, id));
    expect(kept.text).toBe("Better.");
  });

  it("takes only a real yes or no for sharing", async () => {
    const { id, note } = await withNote();
    expect(
      await refusal(updateSettlementNote(advocate.id, id, note.id, { shareWithClient: "yes" as unknown as boolean })),
    ).toBe("Say whether to share this note with the client.");
    const [kept] = await settle(listSettlementNotes(advocate.id, id));
    expect(kept.shareWithClient).toBe(false);
  });

  it("is refused to another advocate, and for a note that is not there", async () => {
    const { id, note } = await withNote();
    expect(await refusal(updateSettlementNote(otherAdvocate.id, id, note.id, { text: "Mine now." }))).toBe(
      "Test Advocate holds this document.",
    );
    expect(await refusal(updateSettlementNote(advocate.id, id, "settlement-note-99", { text: "x" }))).toBe(
      "Note not found.",
    );
  });

  it("can be removed, marked or not, and a missing one is not found", async () => {
    const { id, note } = await withNote();
    await settle(updateSettlementNote(advocate.id, id, note.id, { shareWithClient: true }));
    await settle(deleteSettlementNote(advocate.id, id, note.id));
    expect(await settle(listSettlementNotes(advocate.id, id))).toEqual([]);
    expect(await refusal(deleteSettlementNote(advocate.id, id, note.id))).toBe("Note not found.");
  });

  it("does not reuse the number of a note that was removed", async () => {
    const h = await held();
    const first = await settle(addSettlementNote(advocate.id, h.id, h.clause, "One."));
    const second = await settle(addSettlementNote(advocate.id, h.id, h.other, "Two."));
    await settle(deleteSettlementNote(advocate.id, h.id, first.id));
    const third = await settle(addSettlementNote(advocate.id, h.id, h.clause, "Three."));
    expect(new Set([first.id, second.id, third.id]).size).toBe(3);
  });
});

describe("a signed-off document's notes", () => {
  it("cannot be written, edited or removed any more", async () => {
    const h = await held();
    const note = await settle(addSettlementNote(advocate.id, h.id, h.clause, "Before sign-off."));
    // Sign off through the same path the product uses.
    const signed = await signedOffDocument();
    const gone = "This document is signed off. Its notes can no longer be changed.";
    expect(await refusal(addSettlementNote(advocate.id, signed.id, signed.clauses[0].number, "Late."))).toBe(gone);
    expect(await refusal(updateSettlementNote(advocate.id, signed.id, "settlement-note-1", { text: "Late." }))).toBe(
      gone,
    );
    expect(await refusal(deleteSettlementNote(advocate.id, signed.id, "settlement-note-1"))).toBe(gone);
    // The unsigned one is untouched by any of it.
    expect((await settle(listSettlementNotes(advocate.id, h.id))).map((n) => n.id)).toEqual([note.id]);
  });
});

describe("the two kinds of note", () => {
  it("are kept apart: a working note is not a settlement note, and the other way round", async () => {
    const h = await held();
    await settle(addNote({ documentId: h.id, clauseId: "cl-1", advocateId: advocate.id, text: "WORKING-NOTE-SENTINEL" }));
    await settle(addSettlementNote(advocate.id, h.id, h.clause, "SETTLEMENT-NOTE-SENTINEL"));
    expect(JSON.stringify(await settle(listSettlementNotes(advocate.id, h.id)))).not.toContain("WORKING-NOTE-SENTINEL");
    expect(JSON.stringify(await settle(listNotes(h.id, advocate.id)))).not.toContain("SETTLEMENT-NOTE-SENTINEL");
  });

  it("have no control that turns a working note into a settlement note", () => {
    const root = path.resolve(__dirname, "..", "..");
    const working = readFileSync(path.join(root, "lib/api/notes.ts"), "utf8");
    expect(working).not.toMatch(/settlement|shareWithClient|releasedAt/i);
    const margin = readFileSync(path.join(root, "components/document/margin-note.tsx"), "utf8");
    expect(margin).not.toMatch(/settlement|shareWithClient|share with client/i);
  });
});
