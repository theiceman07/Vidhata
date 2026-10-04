import { describe, expect, it } from "vitest";
import { diffVersions, type DiffSide } from "./diff";
import type { Clause, Finding } from "./types";

function clause(number: string, body: string): Clause {
  return {
    id: `cl-${number}`,
    number,
    heading: `Heading ${number}`,
    body,
    findingIds: [],
    revisedAt: null,
  };
}

function finding(findingId: string, overrides: Partial<Finding> = {}): Finding {
  return {
    findingId,
    number: "01",
    clientNumber: "01",
    source: "pipeline",
    layer: 2,
    severity: "medium",
    clauseReference: "Clause 1.1",
    clauseText: "text",
    description: "description",
    ruleApplied: "RULE",
    remedySuggested: "remedy",
    citations: [],
    disposition: "pending",
    overrideNote: null,
    resolvedAt: null,
    changeRequest: null,
    ...overrides,
  };
}

function side(
  number: number,
  clauses: Clause[] = [],
  findings: Finding[] = [],
): DiffSide {
  return { number, clauses, findings };
}

const settled = { disposition: "confirmed", resolvedAt: "2026-09-16T00:00:00.000Z" } as const;

describe("diffVersions: clauses", () => {
  it("marks a clause only the later draft has as added", () => {
    const diff = diffVersions(side(1, [clause("1.1", "a")]), side(2, [clause("1.1", "a"), clause("2.1", "b")]));
    expect(diff.clauses.find((c) => c.number === "2.1")).toMatchObject({
      kind: "added",
      before: null,
      after: "b",
    });
  });

  it("marks a clause the later draft dropped as removed", () => {
    const diff = diffVersions(side(1, [clause("1.1", "a"), clause("2.1", "b")]), side(2, [clause("1.1", "a")]));
    expect(diff.clauses.find((c) => c.number === "2.1")).toMatchObject({
      kind: "removed",
      before: "b",
      after: null,
    });
  });

  it("marks a clause whose wording differs as changed, with both texts", () => {
    const diff = diffVersions(side(1, [clause("5.3", "within 90 days")]), side(2, [clause("5.3", "within 45 days")]));
    expect(diff.clauses).toEqual([
      expect.objectContaining({ kind: "changed", number: "5.3", before: "within 90 days", after: "within 45 days" }),
    ]);
  });

  it("marks a clause with the same wording as unchanged, ignoring spacing", () => {
    const diff = diffVersions(side(1, [clause("1.1", "one  two")]), side(2, [clause("1.1", "one\ntwo ")]));
    expect(diff.clauses[0].kind).toBe("unchanged");
  });
});

describe("diffVersions: findings", () => {
  it("marks a finding the earlier draft did not have as new", () => {
    const diff = diffVersions(side(1), side(2, [], [finding("f-new")]));
    expect(diff.findings).toEqual([
      expect.objectContaining({ kind: "new", findingId: "f-new", before: null }),
    ]);
  });

  it("keeps the id of a carried-over finding and marks it unresolved", () => {
    const diff = diffVersions(
      side(1, [], [finding("f-1", { severity: "medium" })]),
      side(2, [], [finding("f-1", { severity: "high" })]),
    );
    expect(diff.findings).toHaveLength(1);
    const [change] = diff.findings;
    expect(change.kind).toBe("unresolved");
    expect(change.findingId).toBe("f-1");
    expect(change.before?.severity).toBe("medium");
    expect(change.after?.severity).toBe("high");
    expect(change.resolvedReason).toBeNull();
  });

  it("marks a finding the advocate settled as resolved because it was settled", () => {
    const diff = diffVersions(
      side(1, [], [finding("f-1"), finding("f-old", settled)]),
      side(2, [], [finding("f-1", settled), finding("f-old", settled)]),
    );
    // f-old was already decided on the earlier draft, so it is not listed.
    expect(diff.findings).toEqual([
      expect.objectContaining({ kind: "resolved", findingId: "f-1", resolvedReason: "settled" }),
    ]);
  });

  it("marks a finding the later draft no longer raises as resolved because the clause changed", () => {
    const diff = diffVersions(side(1, [], [finding("f-1")]), side(2, [], []));
    expect(diff.findings).toEqual([
      expect.objectContaining({ kind: "resolved", findingId: "f-1", after: null, resolvedReason: "clause_changed" }),
    ]);
  });
});
