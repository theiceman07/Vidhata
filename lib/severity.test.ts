import { describe, expect, it } from "vitest";
import { severityCounts, severityRank } from "./findings";
import { SEVERITY_ORDER } from "./types";

describe("severity, with critical", () => {
  it("ranks critical above high, medium and low", () => {
    expect(SEVERITY_ORDER).toEqual(["critical", "high", "medium", "low"]);
    const sorted = [...SEVERITY_ORDER].reverse().sort((a, b) => severityRank(a) - severityRank(b));
    expect(sorted).toEqual(["critical", "high", "medium", "low"]);
  });

  it("counts critical findings apart from high ones", () => {
    const counts = severityCounts([
      { severity: "critical" },
      { severity: "critical" },
      { severity: "high" },
      { severity: "low" },
    ]);
    expect(counts).toEqual({ critical: 2, high: 1, medium: 0, low: 1 });
  });
});
