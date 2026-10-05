import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { acceptConsultation, answerConsultation } from "../consultations";
import { refusal, settle } from "../testing";
import {
  listClientConsultations,
  payClientConsultation,
  requestClientConsultation,
} from "./consultations";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const OTHER = "org-bharosa-fintech";
const RHEA = "adv-1";
// Settled by Rhea Kapoor, and the client's own. The vendor agreement is not signed off.
const settled = "doc-nda-settled";
const unsigned = "doc-vendor-revision";
// Another organisation's document.
const theirs = "doc-msa-pending";

describe("asking the advocate who settled a document, as the client's own organisation", () => {
  it("is handed back as the client's own request, without the ids of the advocate and the organisation", async () => {
    const made = await settle(requestClientConsultation(ORG, settled, "Can the term be extended?"));
    expect(made).toMatchObject({
      documentId: settled,
      advocateName: "Rhea Kapoor",
      question: "Can the term be extended?",
      status: "requested",
      fee: null,
      paidAt: null,
      answer: null,
    });
    expect(Object.keys(made).sort()).toEqual([
      "acceptedAt",
      "advocateName",
      "answer",
      "answeredAt",
      "declinedAt",
      "documentId",
      "documentTitle",
      "fee",
      "id",
      "paidAt",
      "question",
      "requestedAt",
      "status",
    ]);
    const text = JSON.stringify(made);
    expect(text).not.toContain(ORG);
    expect(text).not.toContain(RHEA);
  });

  it("is the same refusal for another organisation's document as for one that is not there, and makes nothing", async () => {
    const before = await settle(listClientConsultations(ORG, settled));
    const wrong = await refusal(requestClientConsultation(ORG, theirs, "A question."));
    const missing = await refusal(requestClientConsultation(ORG, "no-such-document", "A question."));
    const otherOrg = await refusal(requestClientConsultation(OTHER, settled, "A question."));
    expect([wrong, missing, otherOrg]).toEqual([
      "Document not found.",
      "Document not found.",
      "Document not found.",
    ]);
    expect(await settle(listClientConsultations(ORG, settled))).toEqual(before);
  });

  it("is refused on a document that has not been signed off, and makes nothing", async () => {
    const message = await refusal(requestClientConsultation(ORG, unsigned, "A question."));
    expect(message).toMatch(/opens once the document is signed off/);
    expect(await settle(listClientConsultations(ORG, unsigned))).toEqual([]);
  });
});

describe("the client's list of requests", () => {
  it("is the requests on their own document, shaped for the client", async () => {
    const made = await settle(requestClientConsultation(ORG, settled, "What does clause 4.1 cover?"));
    const list = await settle(listClientConsultations(ORG, settled));
    expect(list.map((c) => c.id)).toContain(made.id);
    for (const c of list) {
      expect(Object.keys(c)).not.toContain("advocateId");
      expect(Object.keys(c)).not.toContain("orgId");
      expect(Object.keys(c)).not.toContain("clientName");
    }
  });

  it("is the same refusal for another organisation's document as for one that is not there", async () => {
    const wrong = await refusal(listClientConsultations(ORG, theirs));
    const missing = await refusal(listClientConsultations(ORG, "no-such-document"));
    const otherOrg = await refusal(listClientConsultations(OTHER, settled));
    expect([wrong, missing, otherOrg]).toEqual([
      "Document not found.",
      "Document not found.",
      "Document not found.",
    ]);
  });
});

describe("paying a consultation fee, as the client's own organisation", () => {
  async function accepted() {
    const made = await settle(requestClientConsultation(ORG, settled, "Is this enforceable in Delhi?"));
    await settle(acceptConsultation(RHEA, made.id));
    return made.id;
  }

  it("pays an accepted request once, and the answer is the client's to read only then", async () => {
    const id = await accepted();
    const unpaid = (await settle(listClientConsultations(ORG, settled))).find((c) => c.id === id)!;
    expect(unpaid.answer).toBeNull();
    expect(unpaid.paidAt).toBeNull();

    const paid = await settle(payClientConsultation(ORG, id));
    expect(paid.paidAt).toEqual(expect.any(String));
    const again = await settle(payClientConsultation(ORG, id));
    expect(again.paidAt).toBe(paid.paidAt);

    await settle(answerConsultation(RHEA, id, "Yes, in the ordinary way."));
    const answered = (await settle(listClientConsultations(ORG, settled))).find((c) => c.id === id)!;
    expect(answered.answer).toBe("Yes, in the ordinary way.");
  });

  it("is the same refusal for another organisation's request as for one that is not there, and pays nothing", async () => {
    const id = await accepted();
    const wrong = await refusal(payClientConsultation(OTHER, id));
    const missing = await refusal(payClientConsultation(ORG, "consultation-9999"));
    expect([wrong, missing]).toEqual(["Request not found.", "Request not found."]);
    const mine = (await settle(listClientConsultations(ORG, settled))).find((c) => c.id === id)!;
    expect(mine.paidAt).toBeNull();
  });

  it("hands over nothing of the advocate's id or the organisation's", async () => {
    const id = await accepted();
    const paid = await settle(payClientConsultation(ORG, id));
    const text = JSON.stringify(paid);
    expect(text).not.toContain(ORG);
    expect(text).not.toContain(RHEA);
  });
});
