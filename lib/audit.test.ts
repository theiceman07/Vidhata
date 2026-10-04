import { describe, expect, it } from "vitest";
import { buildAuditTrail, clientAuditTrail } from "./audit";
import { mockDocuments } from "./mock/documents.mock";
import type { ContractDocument } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;

// The vendor head: the advocate revised Clause 6.1, and the only request to
// the client is about Clause 5.3.
const revisions = (trail: ReturnType<typeof buildAuditTrail>) =>
  trail.filter((e) => e.action === "Clause wording revised" || e.action === "Advocate revised the draft");

describe("the activity trail before sign-off", () => {
  it("tells the client the draft was revised without saying where", () => {
    const entries = revisions(clientAuditTrail(vendor));
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("Advocate revised the draft");
    expect(entries[0].ref).toBeNull();
    expect(JSON.stringify(clientAuditTrail(vendor))).not.toContain("6.1");
  });

  it("keeps the clause when a request to the client is about it", () => {
    const addressed: ContractDocument = {
      ...vendor,
      clauses: vendor.clauses.map((c) =>
        c.number === "5.3" ? { ...c, revisedAt: "2026-09-16T07:35:00.000Z" } : c,
      ),
    };
    const entries = revisions(clientAuditTrail(addressed));
    expect(entries.find((e) => e.ref === "Clause 5.3")?.action).toBe("Clause wording revised");
    expect(entries.find((e) => e.ref === "Clause 6.1")).toBeUndefined();
  });

  it("gives the advocate the clause every time", () => {
    const entries = revisions(buildAuditTrail(vendor));
    expect(entries).toEqual([
      expect.objectContaining({ action: "Clause wording revised", ref: "Clause 6.1" }),
    ]);
  });
});

describe("the fee in the trail", () => {
  it("records that it was paid, and never the amount", () => {
    const entry = buildAuditTrail(vendor).find((e) => e.action === "Fee paid")!;
    expect(entry.at).toBe(vendor.payment!.paidAt);
    expect(JSON.stringify(entry)).not.toMatch(/₹|amount|4,?999/);
    expect(clientAuditTrail(vendor).some((e) => e.action === "Fee paid")).toBe(true);
  });

  it("says nothing of it for a document with no payment", () => {
    const unpaid: ContractDocument = { ...vendor, payment: undefined };
    expect(buildAuditTrail(unpaid).some((e) => e.action === "Fee paid")).toBe(false);
  });
});

describe("the claim", () => {
  const declared = "Declared no conflict of interest with either party";

  it("records the conflict declaration beside the claim, as a decision", () => {
    const trail = buildAuditTrail(vendor);
    const claim = trail.find((e) => e.action === "Claimed for review")!;
    const entry = trail.find((e) => e.action === declared)!;
    expect(entry.at).toBe(claim.at);
    expect(entry.kind).toBe("decision");
  });

  it("says nothing of it for a document claimed without one", () => {
    const old: ContractDocument = { ...vendor, conflictDeclaredAt: undefined };
    expect(buildAuditTrail(old).some((e) => e.action === declared)).toBe(false);
  });
});

describe("the revision limit in the trail", () => {
  const logged = "Revision limit reached · case logged for corpus review";
  const atLimit: ContractDocument = { ...vendor, corpusReviewLoggedAt: "2026-09-17T08:00:00.000Z" };

  it("is in the advocate's record, as the log's own entry", () => {
    const entry = buildAuditTrail(atLimit).find((e) => e.action === logged)!;
    expect(entry.actor).toBe("Corpus review log");
    expect(entry.at).toBe("2026-09-17T08:00:00.000Z");
  });

  it("is never in the client's, before sign-off or after it", () => {
    expect(clientAuditTrail(atLimit).some((e) => e.action === logged)).toBe(false);
    expect(
      clientAuditTrail({ ...atLimit, status: "settled" }).some((e) => e.action === logged),
    ).toBe(false);
  });

  it("is not there when the limit was not reached", () => {
    expect(buildAuditTrail(vendor).some((e) => e.action === logged)).toBe(false);
  });
});

describe("the activity trail after sign-off", () => {
  it("is the full record, clause references included", () => {
    const settled: ContractDocument = { ...vendor, status: "settled" };
    expect(revisions(clientAuditTrail(settled))).toEqual([
      expect.objectContaining({ action: "Clause wording revised", ref: "Clause 6.1" }),
    ]);
  });
});
