import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { getDocument } from "../documents";
import {
  claimedDocument,
  refusal,
  releasedDocument,
  screenedDocument,
  settle,
  signedOffDocument,
} from "../testing";
import { createClientDraft, startClientAnalysis } from "./documents";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;

const intake = {
  title: "Start analysis test",
  type: "vendor" as const,
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Counterparty Pvt Ltd",
  stateOfExecution: "Delhi",
  transactionValue: 150_000,
  counterpartyIsMsme: false,
  durationMonths: 12,
  governingLaw: "Laws of India",
  keyTerms: "",
};

describe("starting analysis is a thing only a draft does", () => {
  it("starts a draft: it is analysing, with a time the screening completes", async () => {
    const draft = await settle(createClientDraft(ORG, intake));
    expect(draft.status).toBe("draft");
    const started = await settle(startClientAnalysis(ORG, draft.id));
    expect(started.status).toBe("analysing");
    const stored = (await settle(getDocument(draft.id)))!;
    expect(stored.analysisCompletesAt).toEqual(expect.any(String));
  });

  it("is an idempotent no-op on a document already being analysed: the time does not move", async () => {
    const draft = await settle(createClientDraft(ORG, intake));
    await settle(startClientAnalysis(ORG, draft.id));
    const first = (await settle(getDocument(draft.id)))!.analysisCompletesAt;
    vi.advanceTimersByTime(5_000);
    const again = await settle(startClientAnalysis(ORG, draft.id));
    expect(again.status).toBe("analysing");
    expect((await settle(getDocument(draft.id)))!.analysisCompletesAt).toBe(first);
  });

  it("is refused, with a reason, for every other status, and changes nothing", async () => {
    const documents = [
      await screenedDocument(), // awaiting_payment
      await releasedDocument(), // pending_review
      await claimedDocument(), // under_review
      await signedOffDocument(), // settled
    ];
    for (const doc of documents) {
      const before = (await settle(getDocument(doc.id)))!;
      const reason = await refusal(startClientAnalysis(ORG, doc.id));
      expect(reason, `${before.status} should be refused`).not.toBe("");
      const after = (await settle(getDocument(doc.id)))!;
      expect([after.status, after.version]).toEqual([before.status, before.version]);
    }
  });
});
