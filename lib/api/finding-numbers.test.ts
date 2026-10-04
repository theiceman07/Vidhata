import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextNumber } from "@/lib/numbering";
import type { Finding, NewFinding } from "@/lib/types";
import { addFinding, getDocument, getDocumentVersions, requestChange, signOffDocument } from "./documents";
import { advocate, claimedDocument, screenedDocument, settle, settleEverything } from "./testing";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const pad = (n: number) => String(n).padStart(2, "0");

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

const byId = (findings: Finding[], id: string) => findings.find((f) => f.findingId === id)!;

describe("the next number", () => {
  it("is one more than the highest the document has ever used, so a retired one keeps its place", () => {
    expect(nextNumber([])).toBe("01");
    expect(nextNumber(["01", "02"])).toBe("03");
    expect(nextNumber(["01", "07", "03"])).toBe("08");
    expect(nextNumber(["09"])).toBe("10");
    expect(nextNumber(["99"])).toBe("100");
  });
});

describe("numbering a finding the first pass raised", () => {
  it("numbers them in order, for the advocate and for the client alike", async () => {
    const doc = await screenedDocument();
    expect(doc.findings.length).toBeGreaterThan(0);
    const expected = doc.findings.map((_, i) => pad(i + 1));
    expect(doc.findings.map((f) => f.number)).toEqual(expected);
    expect(doc.findings.map((f) => f.clientNumber)).toEqual(expected);
  });

  it("carries the same numbers into the first pass's snapshot", async () => {
    const doc = await screenedDocument();
    const [first] = await settle(getDocumentVersions(doc.id));
    expect(first.findings.map((f) => [f.findingId, f.number, f.clientNumber])).toEqual(
      doc.findings.map((f) => [f.findingId, f.number, f.clientNumber]),
    );
  });
});

describe("numbering a finding the advocate adds", () => {
  it("gives it the next number and no client number, and takes no word of the caller's", async () => {
    const claimed = await claimedDocument();
    const n = claimed.findings.length;
    const sent = { ...raised("added-1"), number: "99", clientNumber: "99" };
    const doc = await settle(addFinding(claimed.id, sent, advocate.id));
    const added = byId(doc.findings, "added-1");
    expect(added.number).toBe(pad(n + 1));
    expect(added.clientNumber).toBeNull();
    // Everything already there is untouched.
    expect(doc.findings.slice(0, n)).toEqual(claimed.findings);
  });

  it("numbers each one after the last", async () => {
    const claimed = await claimedDocument();
    const n = claimed.findings.length;
    await settle(addFinding(claimed.id, raised("added-1"), advocate.id));
    const doc = await settle(addFinding(claimed.id, raised("added-2"), advocate.id));
    expect([byId(doc.findings, "added-1").number, byId(doc.findings, "added-2").number]).toEqual([
      pad(n + 1),
      pad(n + 2),
    ]);
  });
});

describe("numbering a finding for the client", () => {
  it("gives an advocate-added finding a client number when a request is addressed to them, and keeps it", async () => {
    const claimed = await claimedDocument();
    const shown = claimed.findings.length;
    await settle(addFinding(claimed.id, raised("added-1"), advocate.id));
    const first = await settle(requestChange(claimed.id, "added-1", "Please confirm.", advocate));
    expect(byId(first.findings, "added-1").clientNumber).toBe(pad(shown + 1));
    const again = await settle(requestChange(claimed.id, "added-1", "Please confirm, again.", advocate));
    expect(byId(again.findings, "added-1").clientNumber).toBe(pad(shown + 1));
  });

  it("numbers what the client is shown one after another, so a hidden finding leaves no gap", async () => {
    const claimed = await claimedDocument();
    const shown = claimed.findings.length;
    await settle(addFinding(claimed.id, raised("hidden-first"), advocate.id));
    await settle(addFinding(claimed.id, raised("asked-about"), advocate.id));
    const doc = await settle(requestChange(claimed.id, "asked-about", "Please confirm.", advocate));
    // The finding the client was asked about is the next they are shown. The one
    // raised before it, and not asked about, is not in the count.
    expect(byId(doc.findings, "asked-about").number).toBe(pad(shown + 2));
    expect(byId(doc.findings, "asked-about").clientNumber).toBe(pad(shown + 1));
    expect(byId(doc.findings, "hidden-first").clientNumber).toBeNull();
  });

  it("gives the rest theirs at sign-off, in the order they were raised, and changes none already given", async () => {
    const claimed = await claimedDocument();
    const shown = claimed.findings.length;
    await settle(addFinding(claimed.id, raised("a"), advocate.id));
    await settle(addFinding(claimed.id, raised("b"), advocate.id));
    await settle(addFinding(claimed.id, raised("c"), advocate.id));
    await settle(requestChange(claimed.id, "b", "Please confirm.", advocate));
    await settleEverything(claimed.id);
    const signed = await settle(signOffDocument(claimed.id, advocate.id));
    expect(signed.status).toBe("settled");
    expect(signed.findings.map((f) => f.clientNumber)).toEqual([
      ...claimed.findings.map((f) => f.clientNumber),
      pad(shown + 2), // a
      pad(shown + 1), // b, shown when it was asked about
      pad(shown + 3), // c
    ]);
  });

  it("never reuses a number: everything the client has been shown is one run, with no gap", async () => {
    const claimed = await claimedDocument();
    await settle(addFinding(claimed.id, raised("a"), advocate.id));
    await settle(addFinding(claimed.id, raised("b"), advocate.id));
    await settle(requestChange(claimed.id, "b", "Please confirm.", advocate));
    await settleEverything(claimed.id);
    await settle(signOffDocument(claimed.id, advocate.id));
    const doc = (await settle(getDocument(claimed.id)))!;
    const versions = await settle(getDocumentVersions(claimed.id));
    const shown = [...doc.findings, ...versions.flatMap((v) => v.findings)]
      .map((f) => f.clientNumber)
      .filter((n): n is string => n !== null);
    const distinct = [...new Set(shown)].sort();
    expect(distinct).toEqual(distinct.map((_, i) => pad(i + 1)));
  });
});
