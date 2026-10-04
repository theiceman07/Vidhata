import { describe, expect, it } from "vitest";
import {
  lookupCitation,
  normaliseCitation,
  recheckCitation,
  recheckFindings,
} from "./citations";
import type { Citation, Finding } from "./types";

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

const citation = (overrides: Partial<Citation>): Citation => ({
  id: "cite-x",
  text: S27,
  status: "verified",
  corpusRef: "ica-1872-s27",
  withdrawn: null,
  ...overrides,
});

describe("running the gate again on the record", () => {
  it("leaves a verified citation verified", () => {
    const result = recheckCitation(citation({}));
    expect(result).toEqual(citation({}));
  });

  it("verifies a blocked citation only by matching the corpus", () => {
    const result = recheckCitation(
      citation({ id: "cite-late", status: "blocked", corpusRef: null, text: S27.toLowerCase() }),
    );
    expect(result.status).toBe("verified");
    expect(result.corpusRef).toBe("ica-1872-s27");
    expect(result.text).toBe(S27);
    expect(result.id).toBe("cite-late");
  });

  it("leaves a blocked citation blocked when the corpus does not hold it", () => {
    const placeholder = citation({
      status: "blocked",
      corpusRef: null,
      text: "PLACEHOLDER · reference typed by the advocate, not in the corpus",
    });
    expect(recheckCitation(placeholder)).toEqual(placeholder);
  });

  it("blocks a verified citation the corpus no longer matches", () => {
    const result = recheckCitation(
      citation({ text: "Indian Contract Act, 1872, s.999", corpusRef: "ica-1872-s999" }),
    );
    expect(result.status).toBe("blocked");
    expect(result.corpusRef).toBeNull();
    expect(result.text).toBe("Indian Contract Act, 1872, s.999");
  });

  it("keeps a withdrawal, which is the advocate's decision and not the gate's", () => {
    const withdrawn = { note: "Not relied on.", at: "2026-09-16T07:00:00.000Z", by: "Farhan Sheikh" };
    const result = recheckCitation(
      citation({ status: "blocked", corpusRef: null, text: "No such case", withdrawn }),
    );
    expect(result.status).toBe("blocked");
    expect(result.withdrawn).toEqual(withdrawn);
  });

  it("changes only the citations on a finding, and not the input", () => {
    const finding = {
      findingId: "find-x",
      source: "advocate",
      layer: 6,
      severity: "low",
      clauseReference: "Clause 1.1",
      clauseText: "text",
      description: "description",
      ruleApplied: "RULE",
      remedySuggested: "remedy",
      citations: [citation({ status: "blocked", corpusRef: null, text: MSMED15.toLowerCase() })],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    } satisfies Finding;
    const before = structuredClone(finding);

    const [after] = recheckFindings([finding]);

    expect(after.citations[0].status).toBe("verified");
    expect({ ...after, citations: [] }).toEqual({ ...finding, citations: [] });
    expect(finding).toEqual(before);
  });
});
