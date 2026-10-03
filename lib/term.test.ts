import { describe, expect, it } from "vitest";
import { mockDocuments } from "./mock/documents.mock";
import { termLabel } from "./term";

describe("the term on the deal on file", () => {
  it("says so when no term is stated, instead of showing zero", () => {
    expect(termLabel(0)).toBe("Not specified");
    expect(termLabel(Number.NaN)).toBe("Not specified");
  });

  it("is a number of months otherwise, singular for one", () => {
    expect(termLabel(1)).toBe("1 month");
    expect(termLabel(12)).toBe("12 months");
  });

  it("hides no real zero-month contract: only the documents with no stated term are zero", () => {
    // Intake requires at least one month, so a zero is only ever "no term".
    const zero = mockDocuments.filter((d) => d.durationMonths === 0);
    expect(zero.map((d) => d.type)).toEqual(["employment", "employment"]);
    for (const d of mockDocuments.filter((d) => d.durationMonths > 0)) {
      expect(termLabel(d.durationMonths)).toMatch(/^\d+ months?$/);
    }
  });
});
