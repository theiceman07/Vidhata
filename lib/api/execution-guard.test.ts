import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachEvidence, getDocument, toggleExecutionStep } from "./documents";
import { claimedDocument, refusal, releasedDocument, settle, signedOffDocument } from "./testing";

// A test-only fixture: the settled NDA with no execution steps at all, which no real sign-off
// produces (sign-off always builds them). It is how the "nothing applicable" case is reached.
vi.mock("@/lib/mock/documents.mock", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mock/documents.mock")>();
  return {
    ...original,
    mockDocuments: original.mockDocuments.map((d) =>
      d.id !== "doc-nda-settled" ? d : { ...d, executionSteps: [] },
    ),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const client = "Anaya Textiles Pvt Ltd";
const NOT_AVAILABLE = "The execution checklist is not available yet.";

describe("the execution checklist is worked only on a signed-off document, by the write itself", () => {
  it("refuses a tick on a document nobody has signed off, with nothing changed", async () => {
    for (const doc of [await releasedDocument(), await claimedDocument()]) {
      const before = (await settle(getDocument(doc.id)))!;
      expect(await refusal(toggleExecutionStep(doc.id, "esignature", true, client))).toBe(NOT_AVAILABLE);
      const after = (await settle(getDocument(doc.id)))!;
      expect([after.status, after.executedAt ?? null, after.executionSteps]).toEqual([
        before.status,
        before.executedAt ?? null,
        before.executionSteps,
      ]);
    }
  });

  it("refuses proof attached to a document nobody has signed off", async () => {
    const doc = await claimedDocument();
    expect(await refusal(attachEvidence(doc.id, "stamping", "stamp-paper.pdf"))).toBe(NOT_AVAILABLE);
  });

  it("refuses a tick when no step applies, instead of executing the document", async () => {
    const before = (await settle(getDocument("doc-nda-settled")))!;
    expect(before.status).toBe("settled");
    expect(before.executionSteps).toEqual([]);

    const reason = await refusal(toggleExecutionStep("doc-nda-settled", "esignature", true, client));
    expect(reason).toBe("This document has no execution steps to work.");
    const after = (await settle(getDocument("doc-nda-settled")))!;
    expect(after.status).toBe("settled");
    expect(after.executedAt ?? null).toBeNull();
  });
});

describe("a step that is not on the checklist is refused, not ignored", () => {
  const NOT_A_STEP = "That is not a step of this document's checklist.";
  // A kind the type does not allow, as a caller that skips the type would send it.
  const bogus = "notarisation" as never;

  it("refuses a tick on an unknown step kind, with nothing changed", async () => {
    const doc = await signedOffDocument();
    const before = (await settle(getDocument(doc.id)))!;
    expect(await refusal(toggleExecutionStep(doc.id, bogus, true, client))).toBe(NOT_A_STEP);
    const after = (await settle(getDocument(doc.id)))!;
    expect([after.status, after.executionSteps]).toEqual([before.status, before.executionSteps]);
  });

  it("refuses proof attached to an unknown step kind, with nothing changed", async () => {
    const doc = await signedOffDocument();
    const before = (await settle(getDocument(doc.id)))!;
    expect(await refusal(attachEvidence(doc.id, bogus, "proof.pdf"))).toBe(NOT_A_STEP);
    expect((await settle(getDocument(doc.id)))!.executionSteps).toEqual(before.executionSteps);
  });

  it("still takes a step the checklist has", async () => {
    const doc = await signedOffDocument();
    const kind = doc.executionSteps.find((s) => s.applicable)!.kind;
    const ticked = await settle(toggleExecutionStep(doc.id, kind, true, client));
    expect(ticked.executionSteps.find((s) => s.kind === kind)!.complete).toBe(true);
  });
});
