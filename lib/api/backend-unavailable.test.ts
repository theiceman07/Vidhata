import * as React from "react";
const { createElement } = React;
(globalThis as { React?: unknown }).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotAvailable } from "@/components/shared/not-available";
import {
  acceptConsultation,
  answerConsultation,
  declineConsultation,
  getAdvocateConsultation,
  getPayoutStatement,
  listAdvocateConsultations,
} from "@/lib/api/consultations";
import { addNote, deleteNote, listNotes, updateNote } from "@/lib/api/notes";
import {
  addSettlementNote,
  deleteSettlementNote,
  listSettlementNotes,
  updateSettlementNote,
} from "@/lib/api/settlement-notes";
import { snapshot } from "@/lib/api/state";
import { NOT_AVAILABLE_YET, notAvailableInBackend } from "@/lib/api/unavailable";

const DOC = "d-1";
const ADV = "a-1";

describe("backend mode: notes, consultations and payouts are not available", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "backend"));
  afterEach(() => vi.unstubAllEnvs());

  it("reports itself as unavailable only in backend mode", () => {
    expect(notAvailableInBackend()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "");
    expect(notAvailableInBackend()).toBe(false);
  });

  it("writes no note, and leaves the browser store untouched", async () => {
    const before = JSON.stringify(snapshot());
    const calls = [
      () => addNote({ documentId: DOC, clauseId: "c-1", advocateId: ADV, text: "x" }),
      () => updateNote("n-1", ADV, "x"),
      () => deleteNote("n-1", ADV),
      () => listNotes(DOC, ADV),
    ];
    for (const call of calls) await expect(call()).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(JSON.stringify(snapshot())).toBe(before);
  });

  it("writes no note to the client, and leaves the browser store untouched", async () => {
    const before = JSON.stringify(snapshot());
    const calls = [
      () => listSettlementNotes(ADV, DOC),
      () => addSettlementNote(ADV, DOC, "1", "x"),
      () => updateSettlementNote(ADV, DOC, "n-1", { text: "x" }),
      () => deleteSettlementNote(ADV, DOC, "n-1"),
    ];
    for (const call of calls) await expect(call()).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(JSON.stringify(snapshot())).toBe(before);
  });

  it("refuses consultations and payouts instead of returning an empty list", async () => {
    const before = JSON.stringify(snapshot());
    const calls = [
      () => listAdvocateConsultations(ADV),
      () => getAdvocateConsultation(ADV, "r-1"),
      () => acceptConsultation(ADV, "r-1"),
      () => declineConsultation(ADV, "r-1"),
      () => answerConsultation(ADV, "r-1", "x" as never),
      () => getPayoutStatement(ADV),
    ];
    for (const call of calls) await expect(call()).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(JSON.stringify(snapshot())).toBe(before);
  });

  it("the not-available state says so, rather than showing an empty list", () => {
    const html = renderToStaticMarkup(createElement(NotAvailable, { what: "Notes are" }));
    expect(html).toContain("Notes are not available yet");
    expect(html).toContain("Nothing you do here is kept");
  });
});
