import { describe, expect, it } from "vitest";
import { isReleased } from "@/lib/api/documents";
import type { DocumentStatus } from "@/lib/types";
import { mockDocuments } from "./documents.mock";

// The first load of the preview is the demo, so it has to show a document in
// every state a client can see. A fixture that drops out would take its state
// off the dashboard without a test noticing.
const EVERY_STATUS: DocumentStatus[] = [
  "draft",
  "analysing",
  "awaiting_payment",
  "pending_review",
  "under_review",
  "revision",
  "settled",
  "executed",
];

describe("the fixtures' states", () => {
  it("has a document in each state a client's dashboard can show, a draft aside", () => {
    const have = new Set(mockDocuments.map((d) => d.status));
    // A draft is the intake's own, created by starting one, so no fixture is one.
    for (const status of EVERY_STATUS.filter((s) => s !== "draft")) {
      expect(have.has(status), status).toBe(true);
    }
  });

  it("has one awaiting payment: screened and tiered, unpaid, and not in the advocate queue", () => {
    const doc = mockDocuments.find((d) => d.status === "awaiting_payment")!;
    expect(doc.tier).not.toBeNull();
    expect(doc.payment).toBeUndefined();
    expect(isReleased(doc)).toBe(false);
  });

  it("has one executed: signed off, with every applicable step confirmed and the time recorded", () => {
    const doc = mockDocuments.find((d) => d.status === "executed")!;
    expect(doc.advocate).toBeTruthy();
    expect(typeof doc.settledAt).toBe("string");
    expect(typeof doc.executedAt).toBe("string");
    const applicable = doc.executionSteps.filter((s) => s.applicable);
    expect(applicable.length).toBeGreaterThan(0);
    for (const step of applicable) {
      expect(step.complete, step.kind).toBe(true);
      expect(step.completedAt, step.kind).not.toBeNull();
    }
  });

  it("is executed exactly when every applicable step is done, in every signed-off fixture", () => {
    for (const doc of mockDocuments.filter((d) => d.status === "settled" || d.status === "executed")) {
      const allDone = doc.executionSteps.filter((s) => s.applicable).every((s) => s.complete);
      expect(doc.status === "executed", doc.id).toBe(allDone);
      expect(Boolean(doc.executedAt), doc.id).toBe(doc.status === "executed");
    }
  });

  it("gives every fixture its own id", () => {
    const ids = mockDocuments.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
