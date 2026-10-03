import { describe, expect, it } from "vitest";
import { signOffBlockers } from "./findings";
import { mockDocuments } from "./mock/documents.mock";
import { mockVersions } from "./mock/versions.mock";
import { noLongerRaisedLabel, reviewScope, scopeNote, scopeTagLabel } from "./reviewScope";
import type { Clause, ContractDocument, DocumentVersion, Finding } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;
const nda = mockDocuments.find((d) => d.id === "doc-nda-settled")!;
const vendorVersions = mockVersions.filter((v) => v.documentId === vendor.id);
const ndaVersions = mockVersions.filter((v) => v.documentId === nda.id);

/** What sign-off checks, as the holder sees it. */
const blockerIds = (doc: ContractDocument) =>
  signOffBlockers(doc, doc.advocate!.id).flatMap((b) => (b.findingId ? [b.findingId] : []));

describe("the scope of the vendor agreement's re-review", () => {
  const scope = reviewScope(vendor, vendorVersions)!;

  it("compares the live draft with the one before it, not with its own snapshot", () => {
    // Draft 3's own snapshot is written at hand-off and equals the live
    // document, so against it nothing would show.
    expect([scope.baseline, scope.head]).toEqual([2, 3]);
    expect([scope.baselineLabel, scope.headLabel]).toEqual(["Draft 2", "Draft 3"]);
  });

  it("says which round it is from how many times it was sent back", () => {
    expect(vendor.revisionCount).toBe(2);
    expect(scope.round).toBe(3);
  });

  it("lists the clauses that changed", () => {
    expect(scope.changedClauses.map((c) => `${c.number} ${c.kind}`)).toEqual(["6.1 changed"]);
  });

  it("tags each finding by what it is this round", () => {
    expect(scope.tags).toEqual({
      "find-4": "carried_over",
      "find-8": "resolved_settled",
      "find-9": "new",
      "find-10": "new",
    });
  });

  it("has a fresh decision to make on what is new or still open", () => {
    expect(scope.needsDecision).toEqual(["find-4", "find-9", "find-10"]);
    expect(scope.carriedForward).toEqual([]);
    expect(scope.inScope).toEqual(["find-4", "find-8", "find-9", "find-10"]);
  });

  it("needs a decision on exactly what sign-off is waiting for", () => {
    expect(new Set(scope.needsDecision)).toEqual(new Set(blockerIds(vendor)));
  });
});

describe("the scope of the settled NDA", () => {
  const scope = reviewScope(nda, ndaVersions)!;

  it("shows the corrected clause, one finding decided and one added and decided", () => {
    expect(scope.changedClauses.map((c) => `${c.number} ${c.kind}`)).toEqual(["4.1 changed"]);
    expect(scope.tags).toEqual({ "find-n1": "resolved_settled", "find-n2": "new" });
    expect(scope.needsDecision).toEqual([]);
  });
});

describe("with no earlier draft", () => {
  it("has no scope, so the whole review is the scope", () => {
    expect(reviewScope({ ...vendor, version: 1 }, vendorVersions)).toBeNull();
    expect(reviewScope(vendor, [])).toBeNull();
    expect(reviewScope(vendor, vendorVersions.filter((v) => v.number === 3))).toBeNull();
  });
});

// The fixtures have no finding that was decided in an earlier round and still
// stands, so this builds a document with every kind at once.
const clause = (number: string, body: string): Clause => ({
  id: `cl-${number}`,
  number,
  heading: `Heading ${number}`,
  body,
  findingIds: [],
  revisedAt: null,
});

const finding = (id: string, clauseReference: string, overrides: Partial<Finding> = {}): Finding => ({
  findingId: id,
  source: "pipeline",
  layer: 2,
  severity: "medium",
  clauseReference,
  clauseText: "text",
  description: `${id} description`,
  ruleApplied: "RULE",
  remedySuggested: "remedy",
  citations: [],
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
  ...overrides,
});

const decided: Partial<Finding> = {
  disposition: "confirmed",
  overrideNote: "Settled on judgment.",
  resolvedAt: "2026-09-01T00:00:00.000Z",
};

describe("a round with every kind of finding", () => {
  // Earlier draft: F1 decided, F2 open, F3 decided, F4 open (on 2.1), F5 open.
  const earlier: DocumentVersion = {
    documentId: "doc-synthetic",
    number: 2,
    createdAt: "2026-09-01T00:00:00.000Z",
    createdBy: "client_response",
    pipelineRunAt: "2026-09-01T00:00:00.000Z",
    clauses: [clause("1.1", "alpha"), clause("2.1", "beta")],
    findings: [
      finding("F1", "Clause 1.1", decided),
      finding("F2", "Clause 1.1"),
      finding("F3", "Clause 1.1", decided),
      finding("F4", "Clause 2.1"),
      finding("F5", "Clause 1.1"),
    ],
  };
  // Now: F1 still decided, F2 still open, F3 reopened, F4 gone (its clause was
  // reworded), F5 decided since, F6 new and open, F7 new and already decided.
  const doc: ContractDocument = {
    ...vendor,
    id: "doc-synthetic",
    version: 3,
    revisionCount: 2,
    advocate: { id: "adv-1", name: "Rhea Kapoor", bar: "D/1842/2016" },
    clauses: [clause("1.1", "alpha"), clause("2.1", "beta, reworded")],
    findings: [
      finding("F1", "Clause 1.1", decided),
      finding("F2", "Clause 1.1"),
      finding("F3", "Clause 1.1"),
      finding("F5", "Clause 1.1", decided),
      finding("F6", "Clause 1.1"),
      finding("F7", "Clause 1.1", decided),
    ],
  };
  const scope = reviewScope(doc, [earlier])!;

  it("leaves what was decided in an earlier round out of what needs a decision", () => {
    expect(scope.tags.F1).toBe("carried_forward");
    expect(scope.carriedForward).toEqual(["F1"]);
    expect(scope.needsDecision).not.toContain("F1");
    expect(scope.inScope).not.toContain("F1");
  });

  it("puts what is still open, reopened or new in what needs a decision", () => {
    expect(scope.tags.F2).toBe("carried_over");
    expect(scope.tags.F3).toBe("carried_over"); // decided before, open again
    expect(scope.tags.F6).toBe("new");
    expect(scope.needsDecision).toEqual(["F2", "F3", "F6"]);
  });

  it("keeps what was decided this round in scope but not in what needs a decision", () => {
    expect(scope.tags.F5).toBe("resolved_settled");
    expect(scope.tags.F7).toBe("new");
    expect(scope.inScope).toEqual(["F2", "F3", "F5", "F6", "F7"]);
    expect(scope.needsDecision).not.toContain("F5");
    expect(scope.needsDecision).not.toContain("F7");
  });

  it("says a finding is gone because its clause changed", () => {
    expect(scope.noLongerRaised).toEqual([
      expect.objectContaining({ findingId: "F4", reason: "clause_changed" }),
    ]);
    expect(scope.tags.F4).toBeUndefined();
    expect(scope.changedClauses.map((c) => c.number)).toEqual(["2.1"]);
  });

  it("counts what needs a decision exactly as sign-off checks it", () => {
    expect(scope.needsDecision).toEqual(blockerIds(doc));
  });

  it("never leaves a finding that needs a decision out of the scoped view", () => {
    for (const id of scope.needsDecision) expect(scope.inScope).toContain(id);
  });
});

describe("the words an advocate reads", () => {
  it("names what a finding is this round", () => {
    expect(scopeTagLabel("new")).toBe("New this round");
    expect(scopeTagLabel("carried_over")).toBe("Carried over, still open");
    expect(scopeTagLabel("resolved_settled")).toBe("Resolved: settled");
    expect(scopeTagLabel("carried_forward")).toBe("Decided in an earlier round");
  });

  it("says whether a finding went because its clause changed or because it was settled", () => {
    expect(noLongerRaisedLabel("clause_changed")).toBe("Resolved: clause changed");
    expect(noLongerRaisedLabel("settled")).toBe("Resolved: settled");
  });

  it("says plainly which findings need a fresh decision and which carry forward", () => {
    expect(scopeNote("new", false)).toBe("Needs a fresh decision this round.");
    expect(scopeNote("carried_over", false)).toBe("Needs a fresh decision this round.");
    expect(scopeNote("carried_forward", true)).toContain("disposition carries forward");
    expect(scopeNote("carried_forward", true)).toContain("needs no new decision");
    expect(scopeNote("new", true)).toBe("New this round, and already decided.");
    expect(scopeNote("resolved_settled", true)).toContain("Nothing more to decide");
  });
});
