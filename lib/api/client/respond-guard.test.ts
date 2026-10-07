import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { getDocument, getDocumentVersions, requestChange, respondToChanges } from "../documents";
import {
  advocate,
  claimedDocument,
  refusal,
  releasedDocument,
  settle,
  signedOffDocument,
} from "../testing";
import { respondToClientRequests } from "./documents";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;

/** What an answer must leave alone when it is refused: the status, the version and the drafts. */
async function standing(id: string) {
  const doc = (await settle(getDocument(id)))!;
  const drafts = await settle(getDocumentVersions(id));
  return { status: doc.status, version: doc.version, drafts: drafts.length };
}

/** A document sent back to the client with one request, so it is in `revision`. */
async function inRevision() {
  const claimed = await claimedDocument();
  const first = claimed.findings[0];
  await settle(requestChange(claimed.id, first.findingId, "Please confirm the delivery terms.", advocate));
  return { id: claimed.id, number: first.clientNumber!, findingId: first.findingId };
}

describe("an answer is taken only while the document is waiting on one", () => {
  it("does not move a signed-off document, whatever the client sends", async () => {
    const settled = await signedOffDocument();
    const before = await standing(settled.id);
    expect(before.status).toBe("settled");

    expect(await refusal(respondToClientRequests(ORG, settled.id, {}))).not.toBe("");
    expect(await refusal(respondToChanges(settled.id, {}))).not.toBe("");
    expect(await standing(settled.id)).toEqual(before);
  });

  it("does not move a document that is with the advocate and has no request outstanding", async () => {
    const claimed = await claimedDocument();
    const before = await standing(claimed.id);
    expect(before.status).toBe("under_review");

    expect(await refusal(respondToClientRequests(ORG, claimed.id, {}))).not.toBe("");
    expect(await refusal(respondToChanges(claimed.id, {}))).not.toBe("");
    expect(await standing(claimed.id)).toEqual(before);
  });

  it("does not move a paid document that no advocate has claimed", async () => {
    const released = await releasedDocument();
    const before = await standing(released.id);
    expect(before.status).toBe("pending_review");

    expect(await refusal(respondToClientRequests(ORG, released.id, {}))).not.toBe("");
    expect(await refusal(respondToChanges(released.id, {}))).not.toBe("");
    expect(await standing(released.id)).toEqual(before);
  });

  it("takes no empty answer, and a document in revision stays in revision with nothing recorded", async () => {
    const { id } = await inRevision();
    const before = await standing(id);
    expect(before.status).toBe("revision");

    expect(await refusal(respondToClientRequests(ORG, id, {}))).not.toBe("");
    expect(await refusal(respondToChanges(id, {}))).not.toBe("");
    expect(await standing(id)).toEqual(before);
  });

  it("takes no answer that is only blank, and records nothing", async () => {
    const { id, number } = await inRevision();
    const before = await standing(id);

    expect(await refusal(respondToClientRequests(ORG, id, { [number]: "   " }))).not.toBe("");
    expect(await standing(id)).toEqual(before);
    const doc = (await settle(getDocument(id)))!;
    expect(doc.findings.every((f) => !f.changeRequest?.response)).toBe(true);
  });

  it("still takes a real answer to the request, and hands the document back to the advocate", async () => {
    const { id, number } = await inRevision();
    const answered = await settle(respondToClientRequests(ORG, id, { [number]: "Delivery is at our dock." }));
    expect(answered.status).toBe("under_review");
  });

  it("refuses a second answer once the first has handed the document back", async () => {
    const { id, number } = await inRevision();
    await settle(respondToClientRequests(ORG, id, { [number]: "Delivery is at our dock." }));
    const after = await standing(id);

    expect(await refusal(respondToClientRequests(ORG, id, { [number]: "Delivery is at our dock." }))).not.toBe("");
    expect(await standing(id)).toEqual(after);
  });
});
