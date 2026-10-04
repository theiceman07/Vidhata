import { describe, expect, it } from "vitest";
import type { CitationAttempt } from "@/lib/api/citations";
import type { ContractDocument, Finding } from "@/lib/types";
import {
  BLOCKED_REASON_WORDS,
  additionRatio,
  blockedAttempts,
  fabricationRatio,
  overrideRatio,
  percent,
} from "./metrics";

const finding = (over: Partial<Finding>): Finding => ({
  findingId: "f",
  source: "pipeline",
  layer: 2,
  severity: "medium",
  clauseReference: "Clause 1.1",
  clauseText: "",
  description: "",
  ruleApplied: "SOME-RULE-V1",
  remedySuggested: "",
  citations: [],
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
  ...over,
});
const doc = (findings: Finding[]) => ({ findings }) as unknown as ContractDocument;

const attempt = (over: Partial<CitationAttempt>): CitationAttempt => ({
  id: "a",
  at: "2026-10-04T10:00:00.000Z",
  documentId: "d",
  advocateId: "adv",
  input: "",
  outcome: "verified",
  corpusRef: null,
  reason: null,
  ...over,
});

describe("a percentage", () => {
  it("is nothing to show when there is nothing to divide, never 0%", () => {
    expect(percent({ numerator: 0, denominator: 0 })).toBeNull();
    expect(percent({ numerator: 0, denominator: 4 })).toBe("0%");
  });

  it("is rounded to a whole number", () => {
    expect(percent({ numerator: 1, denominator: 3 })).toBe("33%");
    expect(percent({ numerator: 2, denominator: 3 })).toBe("67%");
    expect(percent({ numerator: 4, denominator: 4 })).toBe("100%");
  });
});

describe("the override rate", () => {
  it("is overridden over decided, among the findings the first pass raised", () => {
    const docs = [
      doc([
        finding({ disposition: "confirmed" }),
        finding({ disposition: "overridden" }),
        finding({ disposition: "confirmed" }),
        finding({ disposition: "pending" }),
      ]),
      doc([finding({ disposition: "overridden" })]),
    ];
    expect(overrideRatio(docs)).toEqual({ numerator: 2, denominator: 4 });
  });

  it("leaves out a finding the advocate added, and one still open", () => {
    const docs = [
      doc([
        finding({ source: "advocate", disposition: "overridden" }),
        finding({ source: "advocate", disposition: "confirmed" }),
        finding({ disposition: "pending" }),
      ]),
    ];
    expect(overrideRatio(docs)).toEqual({ numerator: 0, denominator: 0 });
  });

  it("reads who raised a finding from its source, and never from its rule id", () => {
    const docs = [
      doc([
        // A rule id that looks like an advocate's, on a finding the first pass raised.
        finding({ ruleApplied: "MANUAL-ADVOCATE-ADDED", source: "pipeline", disposition: "overridden" }),
        // A pipeline-looking rule id, on a finding an advocate added.
        finding({ ruleApplied: "ICA-S27-NONCOMPETE-V2", source: "advocate", disposition: "overridden" }),
      ]),
    ];
    expect(overrideRatio(docs)).toEqual({ numerator: 1, denominator: 1 });
    expect(additionRatio(docs)).toEqual({ numerator: 1, denominator: 2 });
  });
});

describe("the addition rate", () => {
  it("is the findings an advocate added over every finding on the record, decided or not", () => {
    const docs = [
      doc([finding({}), finding({ disposition: "confirmed" })]),
      doc([finding({ source: "advocate" })]),
    ];
    expect(additionRatio(docs)).toEqual({ numerator: 1, denominator: 3 });
  });

  it("is nothing to show with no findings", () => {
    expect(additionRatio([doc([])])).toEqual({ numerator: 0, denominator: 0 });
  });
});

describe("the pre-gate fabrication rate", () => {
  it("is blocked attempts over every attempt", () => {
    const attempts = [
      attempt({ outcome: "verified" }),
      attempt({ outcome: "blocked", reason: "not_in_corpus" }),
      attempt({ outcome: "blocked", reason: "empty" }),
      attempt({ outcome: "verified" }),
    ];
    expect(fabricationRatio(attempts)).toEqual({ numerator: 2, denominator: 4 });
    expect(fabricationRatio([])).toEqual({ numerator: 0, denominator: 0 });
  });
});

describe("the blocked-citation log", () => {
  it("holds only the blocked attempts, newest first, as they were typed", () => {
    const attempts = [
      attempt({ id: "1", outcome: "blocked", input: "  Indian Contract Act 1872 s.27 ", reason: "not_in_corpus" }),
      attempt({ id: "2", outcome: "verified" }),
      attempt({ id: "3", outcome: "blocked", input: "", reason: "empty" }),
    ];
    const log = blockedAttempts(attempts);
    expect(log.map((a) => a.id)).toEqual(["3", "1"]);
    expect(log[1].input).toBe("  Indian Contract Act 1872 s.27 ");
  });

  it("says why in words for every reason there is", () => {
    expect(Object.keys(BLOCKED_REASON_WORDS).sort()).toEqual(["empty", "not_in_corpus"]);
    for (const words of Object.values(BLOCKED_REASON_WORDS)) expect(words.length).toBeGreaterThan(5);
  });

  it("does not change the list it is given", () => {
    const attempts = [attempt({ id: "1", outcome: "blocked" }), attempt({ id: "2", outcome: "blocked" })];
    blockedAttempts(attempts);
    expect(attempts.map((a) => a.id)).toEqual(["1", "2"]);
  });
});
