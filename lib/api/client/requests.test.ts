import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { NewFinding } from "@/lib/types";
import { addFinding, requestChange } from "../documents";
import { advocate, claimedDocument, settle } from "../testing";
import { getClientRequest } from "./requests";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const VENDOR = "doc-vendor-revision";
const read = (org: string, documentId: string, number: string) =>
  settle(getClientRequest(org, documentId, number));

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

/**
 * A client answers a request by naming the finding by its number. What comes
 * back for a number they were not asked about must be exactly what comes back
 * for a number that is nothing at all, so the number cannot be used to find out
 * what exists.
 */
describe("a request addressed to a client, found by its number", () => {
  it("is found for the client it was addressed to, with what they may read and nothing else", async () => {
    // find-4 carries the advocate's request, and the client reads it as 02.
    const found = await read(ORG, VENDOR, "02");
    expect(found).not.toBeNull();
    expect(found!.number).toBe("02");
    expect(found!.request?.request).toMatch(/MSME/);
    // Before sign-off: the passage behind the request, and no decision, no source, no rule.
    expect(found!.clauseText).toEqual(expect.any(String));
    expect(found!.detail).toBeNull();
    expect(Object.keys(found!.request!).sort()).toEqual(["request", "requestedAt", "respondedAt", "response"]);
    // Not the advocate's name, in the request or anywhere in what is handed over.
    expect(JSON.stringify(found)).not.toMatch(/Farhan|Sheikh|requestedBy|find-4|ruleApplied|layer/);
  });

  it("is the same nothing for a number that does not exist, a finding with no request to the client, one the client has not been shown, another client's document, and a document that is not there", async () => {
    const nothingAtAll = await read(ORG, VENDOR, "99");

    // find-8 is a pipeline finding the client knows of, with no request addressed to them (03).
    const noRequest = await read(ORG, VENDOR, "03");
    // find-9 and find-10 were added by the advocate and no request is addressed to the client.
    // They are 04 and 05 to the advocate and have no number for the client at all.
    const hiddenByAdvocateNumber = await Promise.all(["04", "05"].map((n) => read(ORG, VENDOR, n)));
    // Another organisation's document, asked about with a number that is real there.
    const anotherClients = await read(ORG, "doc-msa-pending", "01");
    // The right document, asked as the wrong client.
    const wrongClient = await read("org-bharosa-fintech", VENDOR, "02");
    const noSuchDocument = await read(ORG, "no-such-document", "02");
    const malformed = await Promise.all(["", " ", "2", "../02", "02 ", "0x2", "-1"].map((n) => read(ORG, VENDOR, n)));

    const all = [noRequest, ...hiddenByAdvocateNumber, anotherClients, wrongClient, noSuchDocument, ...malformed];
    expect(nothingAtAll).toBeNull();
    for (const answer of all) {
      expect(answer).toBeNull();
      expect(JSON.stringify(answer)).toBe(JSON.stringify(nothingAtAll));
    }
  });

  it("is found only once a request is addressed to the client, and then by the number the client was given", async () => {
    const claimed = await claimedDocument();
    const shown = claimed.findings.length;
    const pad = (n: number) => String(n).padStart(2, "0");
    await settle(addFinding(claimed.id, raised("hidden"), advocate.id));
    await settle(addFinding(claimed.id, raised("asked"), advocate.id));

    // Nothing is addressed yet: neither number gets anywhere.
    for (const n of [pad(shown + 1), pad(shown + 2)]) expect(await read(ORG, claimed.id, n)).toBeNull();

    await settle(requestChange(claimed.id, "asked", "Please confirm.", advocate));
    // The finding is the document's (shown + 2) and the client's (shown + 1). The client's number finds it.
    const found = await read(ORG, claimed.id, pad(shown + 1));
    expect(found?.request?.request).toBe("Please confirm.");
    // The document's own number for it finds nothing, and neither does the next: the
    // finding that was kept back stays exactly as absent as a number never given.
    expect(await read(ORG, claimed.id, pad(shown + 2))).toBeNull();
    expect(await read(ORG, claimed.id, pad(shown + 3))).toBeNull();
  });
});
