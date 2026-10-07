import { describe, expect, it } from "vitest";
import { canWriteNotes, NOTES_SIGNED_OFF } from "./noteAccess";

const me = "adv-me";
const mine = { id: me, name: "Ananya Rao", bar: "XX/0001/2020" };
const theirs = { id: "adv-2", name: "Farhan Sheikh", bar: "XX/0002/2020" };

const allowed = { allowed: true };
const refused = (reason: string) => ({ allowed: false, reason });

describe("who may write working notes on a document", () => {
  it("is not an unclaimed document: the advocate is told to claim it, for adding and changing alike", () => {
    const reason = "Claim this document to add notes";
    expect(canWriteNotes({ status: "pending_review", advocate: null }, me)).toEqual({
      add: refused(reason),
      change: refused(reason),
    });
  });

  it("is the advocate who holds it, to add a note and to change one", () => {
    for (const status of ["under_review", "revision"] as const) {
      expect(canWriteNotes({ status, advocate: mine }, me)).toEqual({ add: allowed, change: allowed });
    }
  });

  it("is not another advocate, and the reason names who holds it", () => {
    const reason = "Held by Farhan Sheikh";
    expect(canWriteNotes({ status: "revision", advocate: theirs }, me)).toEqual({
      add: refused(reason),
      change: refused(reason),
    });
  });

  it("is not an unpaid document, held or not: it is not open for review", () => {
    const reason = "This document is not open for review yet";
    for (const status of ["draft", "analysing", "awaiting_payment"] as const) {
      expect(canWriteNotes({ status, advocate: null }, me)).toEqual({ add: refused(reason), change: refused(reason) });
      const held = canWriteNotes({ status, advocate: mine }, me);
      expect(held.add.allowed).toBe(false);
      expect(held.change.allowed).toBe(false);
    }
  });

  it("is append-only after sign-off: the holder may add a note, and may not change or remove one", () => {
    for (const status of ["settled", "executed"] as const) {
      expect(canWriteNotes({ status, advocate: mine }, me)).toEqual({
        add: allowed,
        change: refused("Signed off. Notes can be added, not changed."),
      });
    }
    expect(NOTES_SIGNED_OFF).toBe("Signed off. Notes can be added, not changed.");
  });

  it("is nobody else after sign-off, and the reason is the holder's, not the sign-off", () => {
    const reason = "Held by Farhan Sheikh";
    expect(canWriteNotes({ status: "settled", advocate: theirs }, me)).toEqual({
      add: refused(reason),
      change: refused(reason),
    });
  });
});
