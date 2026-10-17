import { describe, expect, it } from "vitest";
import type { ContractDocument, Finding } from "@/lib/types";
import { additionRatio, overrideRatio, percent } from "./metrics";

const finding = (over: Partial<Finding>): Finding => ({
  findingId: "f",
  number: "01",
  clientNumber: "01",
  source: "pipeline",
  layer: 2,
  severity: "medium",
  clauseReference: "Clause 1.1",
  clauseText: "",
  description: "",
  ruleApplied: "SOME-RULE-V1",
  remedySuggested: "",
  citation: "Indian Contract Act, 1872, s.27",
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
  ...over,
});
const doc = (findings: Finding[]) => ({ findings }) as unknown as ContractDocument;

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
