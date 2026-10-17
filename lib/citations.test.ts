import { describe, expect, it } from "vitest";
import { lookupCitation, normaliseCitation } from "./citations";

const S27 = "Indian Contract Act, 1872, s.27";
const MSMED15 = "Micro, Small and Medium Enterprises Development Act, 2006, s.15";

describe("the citation lookup", () => {
  it("verifies an exact label", () => {
    expect(lookupCitation(S27)).toEqual({
      status: "verified",
      text: S27,
      corpusRef: "ica-1872-s27",
      reason: null,
    });
  });

  it("verifies a corpus ref", () => {
    expect(lookupCitation("msmed-2006-s15")).toEqual({
      status: "verified",
      text: MSMED15,
      corpusRef: "msmed-2006-s15",
      reason: null,
    });
  });

  it("ignores letter case, and answers with the corpus's own wording", () => {
    for (const typed of [S27.toLowerCase(), S27.toUpperCase(), "iNdIaN cOnTrAcT aCt, 1872, S.27"]) {
      const result = lookupCitation(typed);
      expect(result.status).toBe("verified");
      expect(result.text).toBe(S27);
      expect(result.corpusRef).toBe("ica-1872-s27");
    }
  });

  it("ignores spacing: padding, runs of spaces, tabs, newlines, non-breaking spaces", () => {
    for (const typed of [
      `   ${S27}   `,
      "Indian   Contract  Act,   1872,   s.27",
      "Indian\tContract Act,\n1872,\r\ns.27",
      "Indian Contract Act, 1872, s.27",
    ]) {
      expect(lookupCitation(typed).status).toBe("verified");
    }
  });

  it("blocks a near-miss, every one of them", () => {
    const nearMisses = [
      "Indian Contract Act, 1872 s.27", // a comma short
      "Indian Contract Act, 1872, s. 27", // a space inside the section
      "Indian Contract Act 1872, s.27",
      "Indian Contract Act, 1872, s.27A",
      "Indian Contract Act, 1872, s.29", // a section the corpus does not hold
      "Indian Contract Act, 1872, section 27",
      "The Indian Contract Act, 1872, s.27",
      "Indian Contract Act, 1872, s.27.", // a full stop on the end
      "Indian Contract Act, 1872, s.27 and s.28",
      "ICA s.27",
      "s.27",
      "Indian Contract Act",
    ];
    for (const typed of nearMisses) {
      const result = lookupCitation(typed);
      expect(result.status, typed).toBe("blocked");
      expect(result.corpusRef, typed).toBeNull();
      expect(result.reason, typed).toBe("not_in_corpus");
    }
  });

  it("keeps what was typed on a blocked result, with the spacing tidied", () => {
    expect(lookupCitation("  Some   made up   case  ").text).toBe("Some made up case");
  });

  it("blocks empty input", () => {
    for (const typed of ["", "   ", "\n\t "]) {
      expect(lookupCitation(typed)).toEqual({
        status: "blocked",
        text: "",
        corpusRef: null,
        reason: "empty",
      });
    }
  });

  it("blocks a ref the corpus does not hold", () => {
    for (const typed of ["ica-1872-s99", "ica-1872-s27-v2", "msmed-2006-s17", "stamp-1899"]) {
      const result = lookupCitation(typed);
      expect(result.status, typed).toBe("blocked");
      expect(result.corpusRef, typed).toBeNull();
    }
  });

  it("normalises whitespace and case and touches nothing else", () => {
    expect(normaliseCitation("  A,  B. ")).toBe("a, b.");
    expect(normaliseCitation("s.27")).toBe("s.27");
  });
});
