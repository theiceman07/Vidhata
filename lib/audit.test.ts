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

describe("the activity trail after sign-off", () => {
  it("is the full record, clause references included", () => {
    const settled: ContractDocument = { ...vendor, status: "settled" };
    expect(revisions(clientAuditTrail(settled))).toEqual([
      expect.objectContaining({ action: "Clause wording revised", ref: "Clause 6.1" }),
    ]);
  });
});
