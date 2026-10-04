import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientAuditTrail } from "@/lib/audit";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { mockDocuments } from "@/lib/mock/documents.mock";
import type { ContractDocument } from "@/lib/types";
import { settle } from "../testing";
import { leaked, markersFor } from "./markers";
import { shapeClientFindings } from "./shape-findings";
import { shapeClientTrail } from "./shape-trail";
import { getClientTrail } from "./trail";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const doc = (id: string) => mockDocuments.find((d) => d.id === id)!;
const vendor = doc("doc-vendor-revision");
const nda = doc("doc-nda-settled");

describe("the client's activity trail, before sign-off", () => {
  const trail = shapeClientTrail(vendor);

  it("says what was done, and by whom only as 'Advocate'", () => {
    const advocateActs = trail.filter((e) => /advocate/i.test(e.actor));
    expect(advocateActs.length).toBeGreaterThan(0);
    for (const e of advocateActs) expect(e.actor).toBe("Advocate");
    expect(leaked(trail, markersFor(vendor).advocate)).toEqual([]);
  });

  it("says nothing of what the advocate decided, or of their own declaration", () => {
    const text = trail.map((e) => `${e.action} ${e.actor}`).join("\n");
    expect(text).not.toMatch(/settled|withdrawn|conflict|overrid/i);
    // The old trail told a client a finding with a request had been settled.
    expect(trail.some((e) => e.kind === "decision" && e.findingNumber !== null)).toBe(false);
  });

  it("names a finding by the number the client was given, in the text and in the entry", () => {
    const given = shapeClientFindings(vendor).map((f) => f.number);
    const about = trail.filter((e) => e.findingNumber !== null);
    expect(about.length).toBeGreaterThan(0);
    for (const e of about) {
      expect(given).toContain(e.findingNumber);
      expect(e.ref).toMatch(new RegExp(`^Finding ${e.findingNumber} · `));
    }
  });

  it("is about only findings a request is addressed to the client about", () => {
    const addressed = shapeClientFindings(vendor)
      .filter((f) => f.request !== null)
      .map((f) => f.number);
    for (const e of trail) {
      if (e.findingNumber !== null) expect(addressed).toContain(e.findingNumber);
    }
  });

  it("names exactly what an entry carries, and never an internal id", () => {
    for (const e of trail) {
      const keys = Object.keys(e).sort();
      expect(keys.filter((k) => !["clause"].includes(k))).toEqual([
        "action",
        "actor",
        "at",
        "findingNumber",
        "kind",
        "ref",
      ]);
    }
  });

  it("reads the same whatever the advocate decided", () => {
    const flip = (decided: boolean): ContractDocument => ({
      ...vendor,
      findings: vendor.findings.map((f) => ({
        ...f,
        disposition: decided ? "overridden" : "pending",
        overrideNote: decided ? "Private reasoning." : null,
        resolvedAt: decided ? "2026-09-17T08:00:00.000Z" : null,
      })),
    });
    expect(shapeClientTrail(flip(true))).toEqual(shapeClientTrail(flip(false)));
  });

  it("never carries the revision-limit log", () => {
    const logged = { ...vendor, corpusReviewLoggedAt: "2026-09-18T08:00:00.000Z" };
    expect(JSON.stringify(shapeClientTrail(logged))).not.toMatch(/corpus|limit/i);
  });
});

describe("the client's activity trail, after sign-off", () => {
  const trail = shapeClientTrail(nda);

  it("is the record, with the advocate's name and the decisions", () => {
    expect(trail.some((e) => e.action.startsWith("Signed off") && e.actor.includes(nda.advocate!.name))).toBe(true);
    expect(trail.some((e) => /Finding settled/.test(e.action))).toBe(true);
  });

  it("matches the old client trail entry for entry, apart from how a finding is numbered", () => {
    const old = clientAuditTrail(nda);
    expect(trail.map((e) => [e.at, e.actor, e.action, e.kind])).toEqual(
      old.map((e) => [e.at, e.actor, e.action, e.kind]),
    );
  });

  it("names a finding by its number and never by an id", () => {
    for (const e of trail) {
      expect(e).not.toHaveProperty("findingId");
      expect(e).not.toHaveProperty("advocateOnly");
      expect(e).not.toHaveProperty("afterSignOff");
    }
    expect(JSON.stringify(trail)).not.toMatch(/find-n/);
  });
});

describe("a document that says it is signed off without the record to show for it", () => {
  it("is read as before sign-off: no decisions, no names", () => {
    const trail = shapeClientTrail({ ...nda, advocate: null, settledAt: null });
    expect(trail.map((e) => e.action).join("\n")).not.toMatch(/settled|Signed off/i);
  });
});

describe("what a client is handed of a document's trail, over every fixture", () => {
  it("holds none of the machinery, and no advocate's name before sign-off", () => {
    for (const d of mockDocuments) {
      const trail = shapeClientTrail(d);
      const markers = markersFor(d);
      expect(leaked(trail, markers.machinery), d.id).toEqual([]);
      const signedOff = d.status === "settled" || d.status === "executed";
      if (!signedOff) expect(leaked(trail, markers.advocate), d.id).toEqual([]);
    }
  });
});

describe("reading a client's trail through the API", () => {
  it("returns the client's own", async () => {
    expect(await settle(getClientTrail(ORG, vendor.id))).toEqual(shapeClientTrail(vendor));
  });

  it("returns the same nothing for another organisation's document, as another organisation, and for one that is not there", async () => {
    const results = await Promise.all([
      settle(getClientTrail(ORG, "doc-msa-pending")),
      settle(getClientTrail("org-bharosa-fintech", vendor.id)),
      settle(getClientTrail(ORG, "no-such-document")),
    ]);
    expect(results).toEqual([null, null, null]);
  });
});
