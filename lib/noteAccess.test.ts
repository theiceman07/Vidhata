import { describe, expect, it } from "vitest";
import { canWriteNotes } from "./noteAccess";

const me = "adv-me";
const mine = { id: me, name: "Ananya Rao", bar: "XX/0001/2020" };
const theirs = { id: "adv-2", name: "Farhan Sheikh", bar: "XX/0002/2020" };

describe("who may write working notes on a document", () => {
  it("is not an unclaimed document: the advocate is told to claim it", () => {
    expect(canWriteNotes({ status: "pending_review", advocate: null }, me)).toEqual({
      allowed: false,
      reason: "Claim this document to add notes",
    });
  });

  it("is the advocate who holds it", () => {
    expect(canWriteNotes({ status: "under_review", advocate: mine }, me)).toEqual({ allowed: true });
    expect(canWriteNotes({ status: "revision", advocate: mine }, me)).toEqual({ allowed: true });
  });

  it("is not another advocate, and the reason names who holds it", () => {
    expect(canWriteNotes({ status: "revision", advocate: theirs }, me)).toEqual({
      allowed: false,
      reason: "Held by Farhan Sheikh",
    });
  });

  it("is not an unpaid document, held or not: it is not open for review", () => {
    for (const status of ["draft", "analysing", "awaiting_payment"] as const) {
      expect(canWriteNotes({ status, advocate: null }, me)).toEqual({
        allowed: false,
        reason: "This document is not open for review yet",
      });
      expect(canWriteNotes({ status, advocate: mine }, me).allowed).toBe(false);
    }
  });

  it("is still the holder after sign-off, as the API allows, and nobody else", () => {
    expect(canWriteNotes({ status: "settled", advocate: mine }, me)).toEqual({ allowed: true });
    expect(canWriteNotes({ status: "executed", advocate: mine }, me)).toEqual({ allowed: true });
    expect(canWriteNotes({ status: "settled", advocate: theirs }, me)).toEqual({
      allowed: false,
      reason: "Held by Farhan Sheikh",
    });
  });
});
