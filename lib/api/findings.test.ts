import { describe, expect, it } from "vitest";
import { findingState } from "@/lib/findings";
import { msaClauses } from "@/lib/mock/clauses.mock";
import { BACKEND_EXAMPLE_FINDING } from "@/lib/mock/r1-backend-example.fixture";
import { R1_FINDINGS, R1_FINDING_IDS } from "@/lib/mock/r1-findings.fixtures";
import { FindingsError, linkFindingsToClauses, mapReviewFindings, skippedNotice } from "./findings";

const uuid = "11111111-1111-4111-8111-111111111111";
const wire = (over: Record<string, unknown> = {}) => ({
  finding_id: uuid,
  layer: "STATUTORY",
  severity: "high",
  clause_reference: "Clause 7.2",
  description: "x",
  rule_applied: "ICA_S27_NONCOMPETE_V2",
  remedy_suggested: "Narrow it.",
  citation: "Indian Contract Act, 1872, s.27",
  status: "pending",
  ...over,
});
const one = (over: Record<string, unknown> = {}) => mapReviewFindings([wire(over)]).findings[0];

describe("mapping a finding", () => {
  it("renames the R1 fields to the screen's", () => {
    const f = one({ status: "overridden", clause_text: "The span.", override_note: "Because." });
    expect(f).toMatchObject({
      findingId: uuid,
      layer: 2,
      severity: "high",
      ruleApplied: "ICA_S27_NONCOMPETE_V2",
      clauseReference: "Clause 7.2",
      clauseText: "The span.",
      description: "x",
      remedySuggested: "Narrow it.",
      citation: "Indian Contract Act, 1872, s.27",
      overrideNote: "Because.",
      disposition: "overridden",
      source: "pipeline",
      changeRequest: null,
      resolvedAt: null,
      clientNumber: null,
    });
  });

  it("leaves the quoted span and the note empty when the API sends neither", () => {
    const f = one();
    expect(f.clauseText).toBe("");
    expect(f.overrideNote).toBeNull();
  });

  it("carries no verified or blocked state, only the citation", () => {
    const f = one();
    expect(f).not.toHaveProperty("citations");
    expect(f.citation).toBe("Indian Contract Act, 1872, s.27");
  });
});

describe("the layer", () => {
  it.each([
    ["INTAKE", 0],
    ["COMPLETENESS", 1],
    ["STATUTORY", 2],
    ["CONSISTENCY", 3],
    ["RISK_ASYMMETRY", 4],
    ["CITATION_GATE", 5],
    ["TRIAGE", 6],
  ])("reads the name %s as layer %i", (name, index) => {
    expect(one({ layer: name }).layer).toBe(index);
  });

  it("reads a layer given as an integer", () => {
    expect(one({ layer: 4 }).layer).toBe(4);
    expect(one({ layer: 0 }).layer).toBe(0);
  });

  it("skips a finding whose layer name is not one of the seven", () => {
    const { findings, skipped } = mapReviewFindings([wire({ layer: "NOT_A_LAYER" })]);
    expect(findings).toEqual([]);
    expect(skipped).toBe(1);
  });

  it("skips a finding whose layer integer is outside 0 to 6", () => {
    expect(mapReviewFindings([wire({ layer: 7 })]).skipped).toBe(1);
    expect(mapReviewFindings([wire({ layer: -1 })]).skipped).toBe(1);
  });
});

describe("severity", () => {
  it.each(["low", "medium", "high", "critical"] as const)("keeps severity %s", (severity) => {
    expect(one({ severity }).severity).toBe(severity);
  });

  it("keeps critical as critical, not quietly lowered to high", () => {
    expect(one({ severity: "critical" }).severity).toBe("critical");
  });

  it("skips a severity the backend does not have", () => {
    expect(mapReviewFindings([wire({ severity: "info" })]).skipped).toBe(1);
  });
});

describe("status to disposition", () => {
  it.each(["pending", "confirmed", "overridden"] as const)("%s stays %s, and is the pipeline's", (status) => {
    const f = one({ status });
    expect(f.disposition).toBe(status);
    expect(f.source).toBe("pipeline");
  });
  it("shows added as confirmed and marks it advocate-added", () => {
    const f = one({ status: "added" });
    expect(f.disposition).toBe("confirmed");
    expect(f.source).toBe("advocate");
    expect(findingState(f)).toBe("settled");
  });
  it("is pending when the backend says nothing", () => {
    const withoutStatus: Record<string, unknown> = wire();
    delete withoutStatus.status;
    const f = mapReviewFindings([withoutStatus]).findings[0];
    expect(f.disposition).toBe("pending");
    expect(findingState(f)).toBe("open");
  });
});

describe("keys the schema does not name", () => {
  it("are dropped, not refused", () => {
    const { findings, skipped } = mapReviewFindings([wire({ advocate_action: "confirm", surprise: { nested: true } })]);
    expect(skipped).toBe(0);
    expect(findings).toHaveLength(1);
    expect(findings[0]).not.toHaveProperty("advocate_action");
    expect(findings[0]).not.toHaveProperty("surprise");
  });

  it("do not stand in for the old R1 names", () => {
    const { findings, skipped } = mapReviewFindings([wire({ citation: undefined, citations: [{ text: "x", verified: true }] })]);
    expect(findings).toEqual([]);
    expect(skipped).toBe(1);
  });
});

describe("numbering", () => {
  it("numbers findings by position, or by the numbers it is given", () => {
    const second = "22222222-2222-4222-8222-222222222222";
    const list = [wire({ finding_id: uuid }), wire({ finding_id: second })];
    expect(mapReviewFindings(list).findings.map((f) => f.number)).toEqual(["01", "02"]);
    expect(mapReviewFindings(list, { numbers: { [second]: "07" } }).findings.map((f) => f.number)).toEqual(["01", "07"]);
  });

  it("leaves a gap where a finding was skipped, rather than renumbering the ones after it", () => {
    const third = "33333333-3333-4333-8333-333333333333";
    const { findings } = mapReviewFindings([wire(), wire({ layer: 99 }), wire({ finding_id: third })]);
    expect(findings.map((f) => f.number)).toEqual(["01", "03"]);
  });
});

describe("one bad finding among good ones", () => {
  const second = "22222222-2222-4222-8222-222222222222";
  const third = "33333333-3333-4333-8333-333333333333";

  it("is skipped and counted, and the good ones are kept in order", () => {
    const { findings, skipped } = mapReviewFindings([
      wire(),
      wire({ finding_id: second, citation: "" }),
      wire({ finding_id: third, severity: "critical" }),
    ]);
    expect(skipped).toBe(1);
    expect(findings.map((f) => f.findingId)).toEqual([uuid, third]);
  });

  it("does not throw for anything that is not a finding at all", () => {
    const { findings, skipped } = mapReviewFindings([wire(), null, "text", 3, {}, wire({ finding_id: second })]);
    expect(findings.map((f) => f.findingId)).toEqual([uuid, second]);
    expect(skipped).toBe(4);
  });

  it("skips every finding when every one is bad, and is still not an error", () => {
    expect(mapReviewFindings([wire({ layer: "NOPE" }), wire({ description: "" })])).toEqual({ findings: [], skipped: 2 });
  });

  it("is worded plainly, singular and plural, and not at all when nothing was skipped", () => {
    expect(skippedNotice(0)).toBeNull();
    expect(skippedNotice(1)).toBe("1 finding couldn't be shown");
    expect(skippedNotice(3)).toBe("3 findings couldn't be shown");
  });
});

describe("what it will not accept", () => {
  it("refuses a payload that is not a list, because then there is nothing to keep", () => {
    expect(() => mapReviewFindings({ findings: [] })).toThrow(FindingsError);
    expect(() => mapReviewFindings(null)).toThrow(FindingsError);
  });
});

describe("the R1 fixtures", () => {
  const { findings: mapped, skipped } = mapReviewFindings(R1_FINDINGS);
  const byId = (id: string) => mapped.find((f) => f.findingId === id)!;

  it("map without a skip, one per status", () => {
    expect(skipped).toBe(0);
    expect(mapped).toHaveLength(5);
    expect(byId(R1_FINDING_IDS.pending).disposition).toBe("pending");
    expect(byId(R1_FINDING_IDS.confirmed).disposition).toBe("confirmed");
    expect(byId(R1_FINDING_IDS.overridden).disposition).toBe("overridden");
    expect(byId(R1_FINDING_IDS.added)).toMatchObject({ disposition: "confirmed", source: "advocate", layer: 0 });
  });

  it("include a critical finding", () => {
    expect(byId(R1_FINDING_IDS.critical).severity).toBe("critical");
  });

  it("give every finding its one citation string", () => {
    for (const f of mapped) expect(f.citation.length).toBeGreaterThan(0);
  });
});

describe("the backend's own example finding", () => {
  it("maps without a skip, with its name layer, its citation as sent and its status", () => {
    const { findings, skipped } = mapReviewFindings([BACKEND_EXAMPLE_FINDING]);
    expect(skipped).toBe(0);
    expect(findings[0]).toMatchObject({
      findingId: "3f6c2a9e-8b1d-4c7a-9e52-1d0b7f4a6c83",
      layer: 1,
      severity: "high",
      ruleApplied: "NDA_GOVERNING_LAW_MISSING",
      citation: "Code of Civil Procedure, 1908, s. 20; Indian Contract Act, 1872, s. 28 (Exception 1)",
      disposition: "pending",
    });
  });
});

describe("linking findings to clauses", () => {
  const { findings: mapped } = mapReviewFindings(R1_FINDINGS);
  const linked = linkFindingsToClauses(msaClauses, mapped);
  const idsOn = (n: string) => linked.find((c) => c.number === n)!.findingIds;

  it("puts each finding on the clause its reference names", () => {
    expect(idsOn("7.2")).toEqual([R1_FINDING_IDS.pending]);
    expect(idsOn("4.1")).toEqual([R1_FINDING_IDS.confirmed]);
    expect(idsOn("11.4")).toEqual([R1_FINDING_IDS.overridden]);
    expect(idsOn("8.1")).toEqual([R1_FINDING_IDS.added]);
    expect(idsOn("6.1")).toEqual([R1_FINDING_IDS.critical]);
  });
  it("leaves a finding whose reference names no clause on none, and other clauses empty", () => {
    const missing = mapReviewFindings([BACKEND_EXAMPLE_FINDING]).findings;
    const out = linkFindingsToClauses(msaClauses, missing);
    expect(out.flatMap((c) => c.findingIds)).toEqual([]);
    expect(idsOn("1.1")).toEqual([]);
  });
  it("does not change the clauses it was given", () => {
    expect(msaClauses.find((c) => c.number === "7.2")!.findingIds).not.toContain(R1_FINDING_IDS.pending);
  });
});
