import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { getDelivery } from "../delivery";
import { getSettledSummary } from "../summaries";
import { refusal, settle } from "../testing";
import { getClientDelivery, getClientSummary } from "./delivery";
import { leaked, markersFor } from "./markers";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const doc = (id: string) => mockDocuments.find((d) => d.id === id)!;
const settled = doc("doc-nda-settled");
const notSignedOff = ["doc-vendor-revision", "doc-employment-rereview"].map(doc);
// Another organisation's document, with nothing about it for this client to find.
const theirs = mockDocuments.find((d) => d.orgId !== ORG)!;

describe("the delivery, asked for by a client's own organisation", () => {
  it("is the delivery of their signed-off document", async () => {
    const result = await settle(getClientDelivery(ORG, settled.id));
    expect(result).toEqual(await settle(getDelivery(settled.id)));
    expect(result.state).toBe("ready");
  });

  it("is only that it is not available before sign-off, with nothing of the document in it", async () => {
    for (const d of notSignedOff) {
      const result = await settle(getClientDelivery(ORG, d.id));
      expect(result, d.id).toEqual({ state: "not_available" });
    }
  });

  it("is the same refusal for another organisation's document as for one that is not there", async () => {
    expect(theirs).toBeDefined();
    const wrong = await refusal(getClientDelivery(ORG, theirs.id));
    const missing = await refusal(getClientDelivery(ORG, "no-such-document"));
    expect([wrong, missing]).toEqual(["Document not found.", "Document not found."]);
  });

  it("hands over none of the machinery", async () => {
    const result = await settle(getClientDelivery(ORG, settled.id));
    expect(leaked(result, markersFor(settled).machinery)).toEqual([]);
  });
});

describe("the summary, asked for by a client's own organisation", () => {
  it("is the summary of their settled document, with its title", async () => {
    const result = await settle(getClientSummary(ORG, settled.id));
    expect(result.result).toEqual(await settle(getSettledSummary(settled.id)));
    expect(result.title).toBe(settled.title);
  });

  it("says only that it is not available before sign-off, without the title", async () => {
    for (const d of notSignedOff) {
      const result = await settle(getClientSummary(ORG, d.id));
      expect(result, d.id).toEqual({ title: null, result: { state: "not_available" } });
    }
  });

  it("is the same refusal for another organisation's document as for one that is not there", async () => {
    const wrong = await refusal(getClientSummary(ORG, theirs.id));
    const missing = await refusal(getClientSummary(ORG, "no-such-document"));
    expect([wrong, missing]).toEqual(["Document not found.", "Document not found."]);
  });
});
