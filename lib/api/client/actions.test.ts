import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { NewFinding } from "@/lib/types";
import { addFinding, getDocument, requestChange } from "../documents";
import { advocate, claimedDocument, refusal, screenedDocument, settle } from "../testing";
import { getClientDocument, payClientFee, respondToClientRequests, startClientAnalysis } from "./documents";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const OTHER = "org-bharosa-fintech";

const raised = (id: string): NewFinding => ({
  findingId: id,
  source: "advocate",
  layer: 0,
  severity: "medium",
  clauseReference: "Clause 4.1",
  clauseText: "Payment shall be made within sixty (60) days of receipt of a valid invoice.",
  description: "The first pass missed this.",
  ruleApplied: "MANUAL-ADVOCATE-ADDED",
  remedySuggested: "Advocate judgment.",
  citations: [],
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
});

/** A document with one request addressed to the client, a finding the client knows of, and one kept from them. */
async function withARequest() {
  const claimed = await claimedDocument();
  const first = claimed.findings[0];
  await settle(requestChange(claimed.id, first.findingId, "Please confirm the delivery terms.", advocate));
  await settle(addFinding(claimed.id, raised("kept-back"), advocate.id));
  const doc = (await settle(getDocument(claimed.id)))!;
  return { id: claimed.id, requested: first.clientNumber!, noRequest: claimed.findings[1]?.clientNumber ?? null, doc };
}

describe("answering a request, by the number the client reads it by", () => {
  it("records the answer on the finding it names, for the client it was addressed to", async () => {
    const { id, requested } = await withARequest();
    const answered = await settle(respondToClientRequests(ORG, id, { [requested]: "Delivery is at our dock, within 14 days." }));
    const finding = answered.findingList.find((f) => f.number === requested)!;
    expect(finding.request?.response).toBe("Delivery is at our dock, within 14 days.");
    expect(finding.request?.respondedAt).toEqual(expect.any(String));
    // The answer is a hand-off: the document goes back to the advocate.
    expect(answered.status).toBe("under_review");
  });

  it("is the same refusal for a number never given, a finding kept from the client, and one with no request to them", async () => {
    const { id, noRequest, doc } = await withARequest();
    const kept = doc.findings.find((f) => f.findingId === "kept-back")!;
    // The kept-back finding is the document's, and has no number for the client.
    expect(kept.clientNumber).toBeNull();
    const tries = ["99", kept.number, "", "../01", ...(noRequest ? [noRequest] : [])];
    const refusals = await Promise.all(tries.map((n) => refusal(respondToClientRequests(ORG, id, { [n]: "An answer." }))));
    expect(new Set(refusals)).toEqual(new Set(["Request not found."]));
  });

  it("changes nothing when it refuses, even if some of the answers were to real requests", async () => {
    const { id, requested } = await withARequest();
    const before = await settle(getClientDocument(ORG, id));
    const message = await refusal(
      respondToClientRequests(ORG, id, { [requested]: "A real answer.", "99": "An answer to nothing." }),
    );
    expect(message).toBe("Request not found.");
    expect(await settle(getClientDocument(ORG, id))).toEqual(before);
  });

  it("is the same refusal for another organisation's document as for one that is not there", async () => {
    const { id, requested } = await withARequest();
    const before = await settle(getClientDocument(ORG, id));
    const wrongClient = await refusal(respondToClientRequests(OTHER, id, { [requested]: "An answer." }));
    const missing = await refusal(respondToClientRequests(ORG, "no-such-document", { [requested]: "An answer." }));
    expect(wrongClient).toBe("Document not found.");
    expect(missing).toBe(wrongClient);
    expect(await settle(getClientDocument(ORG, id))).toEqual(before);
  });

  it("is not read through a finding's id: the document's own ids and numbers answer nothing", async () => {
    const { id, doc } = await withARequest();
    const requested = doc.findings.find((f) => f.changeRequest)!;
    const message = await refusal(respondToClientRequests(ORG, id, { [requested.findingId]: "An answer." }));
    expect(message).toBe("Request not found.");
  });
});

describe("the client's other writes", () => {
  it("refuse another organisation's document exactly as a missing one, and change nothing", async () => {
    const screened = await screenedDocument();
    const wrong = await refusal(payClientFee(OTHER, screened.id));
    const missing = await refusal(payClientFee(ORG, "no-such-document"));
    expect([wrong, missing]).toEqual(["Document not found.", "Document not found."]);
    expect((await settle(getClientDocument(ORG, screened.id)))?.paidAt).toBeNull();

    const wrongStart = await refusal(startClientAnalysis(OTHER, screened.id));
    expect(wrongStart).toBe("Document not found.");
  });

  it("pays once for the client's own document, however often it is pressed, and says only that it was paid", async () => {
    const screened = await screenedDocument();
    const first = await settle(payClientFee(ORG, screened.id));
    const again = await settle(payClientFee(ORG, screened.id));
    expect(first.status).toBe("pending_review");
    expect(first.paidAt).toEqual(expect.any(String));
    expect(again.paidAt).toBe(first.paidAt);
    expect(JSON.stringify(first)).not.toMatch(/amount|payment/i);
  });
});
