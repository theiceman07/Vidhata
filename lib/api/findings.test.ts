import { describe, expect, it } from "vitest";
import { findingState } from "@/lib/findings";
import { R1_FINDINGS, R1_FINDING_IDS } from "@/lib/mock/r1-findings.fixtures";
import { msaClauses } from "@/lib/mock/clauses.mock";
import { FALLBACK, FindingsError, linkFindingsToClauses, mapReviewFindings } from "./findings";

const uuid = "11111111-1111-4111-8111-111111111111";
const wire = (over: Record<string, unknown> = {}) => ({ finding_id: uuid, layer: 2, severity: "high", description: "x", ...over });
const one = (over: Record<string, unknown> = {}) => mapReviewFindings([wire(over)])[0];

describe("mapping a finding", () => {
  it("renames the R1 fields to the screen's", () => {
    const f = one({
      rule_applied: "ICA-S27-NONCOMPETE-V2",
      clause_reference: "Clause 7.2",
      clause_text: "The span.",
      remedy_suggested: "Narrow it.",
      override_note: "Because.",
      status: "overridden",
    });
    expect(f).toMatchObject({
      findingId: uuid,
      layer: 2,
      severity: "high",
      ruleApplied: "ICA-S27-NONCOMPETE-V2",
      clauseReference: "Clause 7.2",
      clauseText: "The span.",
      description: "x",
      remedySuggested: "Narrow it.",
      overrideNote: "Because.",
      disposition: "overridden",
      source: "pipeline",
      changeRequest: null,
      resolvedAt: null,
      clientNumber: null,
    });
  });

  it.each(["low", "medium", "high"] as const)("keeps severity %s", (severity) => {
    expect(one({ severity }).severity).toBe(severity);
  });

  it("has no way to carry critical: it is refused, not quietly lowered", () => {
    expect(() => one({ severity: "critical" })).toThrow(FindingsError);
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
  it("is pending when R1 says nothing", () => {
    expect(one().disposition).toBe("pending");
    expect(findingState(one())).toBe("open");
  });
});

describe("citations", () => {
  it("maps a verified citation with its corpus reference", () => {
    const [c] = one({ citations: [{ text: " Indian Contract Act, 1872, s.27 ", verified: true, corpus_ref: "ica-1872-s27" }] }).citations;
    expect(c).toMatchObject({ text: "Indian Contract Act, 1872, s.27", status: "verified", corpusRef: "ica-1872-s27", withdrawn: null });
  });
  it("maps a blocked citation with no corpus reference", () => {
    const [c] = one({ citations: [{ text: "Made-up s.9", verified: false }] }).citations;
    expect(c).toMatchObject({ status: "blocked", corpusRef: null, withdrawn: null });
  });
  it("keeps several citations on one finding, in order, each with its own id", () => {
    const { citations } = one({
      citations: [
        { text: "ICA s.27", verified: true, corpus_ref: "ica-s27" },
        { text: "Unknown ruling", verified: false },
        { text: "ICA s.28", verified: true, corpus_ref: "ica-s28" },
      ],
    });
    expect(citations.map((c) => c.status)).toEqual(["verified", "blocked", "verified"]);
    expect(citations.map((c) => c.text)).toEqual(["ICA s.27", "Unknown ruling", "ICA s.28"]);
    expect(new Set(citations.map((c) => c.id)).size).toBe(3);
  });
  it("is an empty list when the finding rests on judgment alone", () => {
    expect(one().citations).toEqual([]);
    expect(one({ citations: [] }).citations).toEqual([]);
  });
  it("refuses a citation that breaks verified-iff-corpus_ref", () => {
    expect(() => one({ citations: [{ text: "x", verified: true }] })).toThrow(FindingsError);
    expect(() => one({ citations: [{ text: "x", verified: false, corpus_ref: "r" }] })).toThrow(FindingsError);
  });
});

describe("what R1 leaves out", () => {
  it("fills every optional field with something the screens can show", () => {
    const f = one();
    expect(f.clauseReference).toBe(FALLBACK.clauseReference);
    expect(f.ruleApplied).toBe(FALLBACK.ruleApplied);
    expect(f.clauseText).toBe("");
    expect(f.remedySuggested).toBe("");
    expect(f.overrideNote).toBeNull();
    expect(f.citations).toEqual([]);
  });
  it("treats blank strings as missing", () => {
    const f = one({ clause_reference: "  ", rule_applied: "", override_note: "   " });
    expect(f.clauseReference).toBe(FALLBACK.clauseReference);
    expect(f.ruleApplied).toBe(FALLBACK.ruleApplied);
    expect(f.overrideNote).toBeNull();
  });
  it("numbers findings by position, or by the numbers it is given", () => {
    const second = "22222222-2222-4222-8222-222222222222";
    const list = [wire({ finding_id: uuid }), wire({ finding_id: second })];
    expect(mapReviewFindings(list).map((f) => f.number)).toEqual(["01", "02"]);
    expect(mapReviewFindings(list, { numbers: { [second]: "07" } }).map((f) => f.number)).toEqual(["01", "07"]);
  });
});

describe("what it will not accept", () => {
  it("refuses a list that is not a list", () => {
    expect(() => mapReviewFindings({ findings: [] })).toThrow(FindingsError);
  });
  it("refuses the whole list when one finding breaks R1, and says which, but not on screen", () => {
    let caught: FindingsError | undefined;
    try {
      mapReviewFindings([wire(), wire({ layer: 9 })]);
    } catch (e) {
      caught = e as FindingsError;
    }
    expect(caught).toBeInstanceOf(FindingsError);
    expect(caught!.message).toBe("The findings could not be read.");
    expect(caught!.detail).toMatch(/finding 2/);
  });
  it("does not read the old R1 names", () => {
    const f = one({ rule_id: "OLD-RULE", citation: { text: "x", verified: false } });
    expect(f.ruleApplied).toBe(FALLBACK.ruleApplied);
    expect(f.citations).toEqual([]);
  });
});

describe("the R1 fixtures", () => {
  const mapped = mapReviewFindings(R1_FINDINGS);
  const byId = (id: string) => mapped.find((f) => f.findingId === id)!;

  it("map without error, one per status", () => {
    expect(mapped).toHaveLength(5);
    expect(byId(R1_FINDING_IDS.pending).disposition).toBe("pending");
    expect(byId(R1_FINDING_IDS.confirmed).disposition).toBe("confirmed");
    expect(byId(R1_FINDING_IDS.overridden).disposition).toBe("overridden");
    expect(byId(R1_FINDING_IDS.added)).toMatchObject({ disposition: "confirmed", source: "advocate" });
  });
  it("include a blocked citation, and a finding with a verified and a blocked one", () => {
    expect(byId(R1_FINDING_IDS.pending).citations.map((c) => c.status)).toEqual(["verified", "blocked"]);
    expect(byId(R1_FINDING_IDS.overridden).citations.map((c) => c.status)).toEqual(["blocked"]);
  });
  it("include one that carries only what R1 requires", () => {
    expect(byId(R1_FINDING_IDS.sparse)).toMatchObject({ clauseReference: FALLBACK.clauseReference, ruleApplied: FALLBACK.ruleApplied, clauseText: "" });
  });
});

describe("linking findings to clauses", () => {
  const mapped = mapReviewFindings(R1_FINDINGS);
  const linked = linkFindingsToClauses(msaClauses, mapped);
  const idsOn = (n: string) => linked.find((c) => c.number === n)!.findingIds;

  it("puts each finding on the clause its reference names", () => {
    expect(idsOn("7.2")).toEqual([R1_FINDING_IDS.pending]);
    expect(idsOn("4.1")).toEqual([R1_FINDING_IDS.confirmed]);
    expect(idsOn("11.4")).toEqual([R1_FINDING_IDS.overridden]);
    expect(idsOn("8.1")).toEqual([R1_FINDING_IDS.added]);
  });
  it("leaves a finding with no clause reference on no clause, and other clauses empty", () => {
    expect(linked.flatMap((c) => c.findingIds)).not.toContain(R1_FINDING_IDS.sparse);
    expect(idsOn("1.1")).toEqual([]);
  });
  it("does not change the clauses it was given", () => {
    expect(msaClauses.find((c) => c.number === "7.2")!.findingIds).not.toContain(R1_FINDING_IDS.pending);
  });
});
