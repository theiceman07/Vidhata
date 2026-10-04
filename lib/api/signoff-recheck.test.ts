import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimDocument,
  getDocument,
  signOffDocument,
  updateFinding,
  withdrawCitation,
} from "./documents";
import { advocate, declaration, refusal, settle, settleEverything } from "./testing";

// The corpus without the MSMED s.15 entry. The fixture's finding cites it as
// verified, and has done since before sign-off was reached, so if sign-off finds
// it blocked, the gate really ran again at sign-off and the stored flag was not
// simply believed. This is its own file because the mock would otherwise change
// the corpus for every other test.
vi.mock("@/lib/mock/corpus.mock", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mock/corpus.mock")>();
  return {
    ...original,
    CORPUS: original.CORPUS.filter((entry) => entry.ref !== "msmed-2006-s15"),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const id = "doc-msa-pending";

describe("signing off a document whose source the corpus no longer holds", () => {
  it("runs the gate again, and refuses while a finding relies on a source that has gone", async () => {
    await settle(claimDocument(id, advocate, declaration));
    const before = (await settle(getDocument(id)))!;
    const msmed = before.findings.find((f) => f.citations.some((c) => c.corpusRef === "msmed-2006-s15"))!;
    const citationId = msmed.citations.find((c) => c.corpusRef === "msmed-2006-s15")!.id;
    // As stored, the finding still reads verified.
    expect(msmed.citations.find((c) => c.id === citationId)!.status).toBe("verified");

    await settleEverything(id);
    expect(await refusal(signOffDocument(id, advocate.id))).toBe(
      "A citation on this document is blocked. Resolve the source before sign-off.",
    );

    // What the gate found is on the record now, and the document is not signed off.
    const after = (await settle(getDocument(id)))!;
    const citation = after.findings
      .find((f) => f.findingId === msmed.findingId)!
      .citations.find((c) => c.id === citationId)!;
    expect(citation.status).toBe("blocked");
    expect(after.status).not.toBe("settled");
    expect(after.settledAt ?? null).toBeNull();
  });

  it("can be signed off once the advocate has withdrawn the source and recorded why", async () => {
    const doc = (await settle(getDocument(id)))!;
    const finding = doc.findings.find((f) => f.citations.some((c) => c.status === "blocked" && !c.withdrawn))!;
    const citation = finding.citations.find((c) => c.status === "blocked" && !c.withdrawn)!;

    // The finding was settled when its source stood; it now rests on the advocate's reasoning.
    await settle(withdrawCitation(id, finding.findingId, citation.id, "No longer in the corpus.", advocate));
    await settle(updateFinding(id, finding.findingId, { disposition: "pending", overrideNote: null }, advocate.id));
    await settle(
      updateFinding(
        id,
        finding.findingId,
        { disposition: "overridden", overrideNote: "The source has gone; the finding stands on my judgment." },
        advocate.id,
      ),
    );

    const signed = await settle(signOffDocument(id, advocate.id));
    expect(signed.status).toBe("settled");
    // The withdrawn source is still on the record as blocked: nothing pretends it was checked.
    const kept = signed.findings
      .find((f) => f.findingId === finding.findingId)!
      .citations.find((c) => c.id === citation.id)!;
    expect(kept.status).toBe("blocked");
    expect(kept.withdrawn?.note).toBe("No longer in the corpus.");
  });
});
