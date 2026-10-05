import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { claimedDocument, refusal, settle, signedOffDocument } from "../testing";
import { leaked, markersFor } from "./markers";
import { attachClientEvidence, getClientDocument, toggleClientStep } from "./documents";
import { getDocument } from "../documents";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const OTHER = "org-bharosa-fintech";

/** A signed-off document, and the kinds of its steps that apply. */
async function settled() {
  const doc = await signedOffDocument();
  const applicable = doc.executionSteps.filter((s) => s.applicable).map((s) => s.kind);
  expect(applicable.length).toBeGreaterThan(0);
  return { id: doc.id, applicable };
}

describe("ticking a step on the execution checklist, as the client's own organisation", () => {
  it("records the step, says who and when, and answers with what a client is handed", async () => {
    const { id, applicable } = await settled();
    const answered = await settle(toggleClientStep(ORG, id, applicable[0], true));
    const step = answered.executionSteps.find((s) => s.kind === applicable[0])!;
    expect(step.complete).toBe(true);
    expect(step.completedAt).toEqual(expect.any(String));
    expect(step.completedBy).toBe(MOCK_CLIENT_ORG.name);
    expect(answered.checklist.done).toBe(1);
    expect(Object.keys(answered)).not.toContain("advocate");
  });

  it("makes the document executed when the last applicable step is ticked, and takes it back when one is untied", async () => {
    const { id, applicable } = await settled();
    let last = await settle(toggleClientStep(ORG, id, applicable[0], true));
    for (const kind of applicable.slice(1)) last = await settle(toggleClientStep(ORG, id, kind, true));
    expect(last.status).toBe("executed");
    expect(last.executedAt).toEqual(expect.any(String));

    const back = await settle(toggleClientStep(ORG, id, applicable[0], false));
    expect(back.status).toBe("settled");
    expect(back.executedAt).toBeNull();
  });

  it("is the same refusal for another organisation's document as for one that is not there, and changes nothing", async () => {
    const { id, applicable } = await settled();
    const before = await settle(getClientDocument(ORG, id));
    const wrong = await refusal(toggleClientStep(OTHER, id, applicable[0], true));
    const missing = await refusal(toggleClientStep(ORG, "no-such-document", applicable[0], true));
    expect([wrong, missing]).toEqual(["Document not found.", "Document not found."]);
    expect(await settle(getClientDocument(ORG, id))).toEqual(before);
  });

  it("is refused on a document that has not been signed off, and changes nothing", async () => {
    const claimed = await claimedDocument();
    const before = JSON.stringify(await settle(getDocument(claimed.id)));
    const message = await refusal(toggleClientStep(ORG, claimed.id, "esignature", true));
    expect(message).toBe("The execution checklist is not available yet.");
    expect(JSON.stringify(await settle(getDocument(claimed.id)))).toBe(before);
  });

  it("hands over none of the machinery", async () => {
    const { id, applicable } = await settled();
    const answered = await settle(toggleClientStep(ORG, id, applicable[0], true));
    const record = (await settle(getDocument(id)))!;
    expect(leaked(answered, markersFor(record).machinery)).toEqual([]);
  });
});

describe("attaching proof to a step, as the client's own organisation", () => {
  it("keeps the name of the file, and clears it when given none", async () => {
    const { id, applicable } = await settled();
    const attached = await settle(attachClientEvidence(ORG, id, applicable[0], "stamped.pdf"));
    expect(attached.executionSteps.find((s) => s.kind === applicable[0])?.evidence?.name).toBe("stamped.pdf");
    const cleared = await settle(attachClientEvidence(ORG, id, applicable[0], null));
    expect(cleared.executionSteps.find((s) => s.kind === applicable[0])?.evidence).toBeNull();
  });

  it("is the same refusal for another organisation's document as for one that is not there, and before sign-off", async () => {
    const { id, applicable } = await settled();
    const wrong = await refusal(attachClientEvidence(OTHER, id, applicable[0], "x.pdf"));
    const missing = await refusal(attachClientEvidence(ORG, "no-such-document", applicable[0], "x.pdf"));
    expect([wrong, missing]).toEqual(["Document not found.", "Document not found."]);
    expect((await settle(getClientDocument(ORG, id)))?.executionSteps.every((s) => s.evidence === null)).toBe(true);

    const claimed = await claimedDocument();
    expect(await refusal(attachClientEvidence(ORG, claimed.id, "esignature", "x.pdf"))).toBe(
      "The execution checklist is not available yet.",
    );
  });
});
