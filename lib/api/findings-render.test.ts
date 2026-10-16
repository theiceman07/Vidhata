import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CitationBlock } from "@/components/document/citation-block";
import { FindingDetail } from "@/components/document/finding-detail";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import { R1_FINDINGS, R1_FINDING_IDS } from "@/lib/mock/r1-findings.fixtures";
import { linkFindingsToClauses, mapReviewFindings } from "./findings";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

/** What a finding that came in as R1 looks like on the screen. */

const findings = mapReviewFindings(R1_FINDINGS);
const byId = (id: string) => findings.find((f) => f.findingId === id)!;
const base = getMockDocumentById("doc-msa-pending")!;
const doc = { ...base, findings, clauses: linkFindingsToClauses(base.clauses, findings) };

const detail = (id: string, role: "advocate" | "client" = "advocate") =>
  renderToStaticMarkup(
    createElement(FindingDetail, {
      doc,
      finding: byId(id),
      number: "01",
      role,
      canAdjudicate: false,
      onSettle: () => {},
      onReopen: () => {},
      onRequestChange: () => {},
      onWithdrawSource: () => {},
      trail: [],
    }),
  );

describe("a verified and a blocked source", () => {
  const html = (id: string) =>
    renderToStaticMarkup(createElement(CitationBlock, { citations: byId(id).citations, showWithdrawalNote: true }));

  it("look different without reading them: the blocked one carries the flagged rule and colour", () => {
    const verified = html(R1_FINDING_IDS.confirmed);
    const blocked = html(R1_FINDING_IDS.overridden);
    expect(blocked).toContain("border-flagged");
    expect(blocked).toContain("text-flagged");
    expect(verified).not.toContain("border-flagged");
    expect(verified).not.toContain("text-flagged");
  });
  it("say which they are in words as well", () => {
    expect(html(R1_FINDING_IDS.confirmed)).toContain("Verified");
    expect(html(R1_FINDING_IDS.overridden)).toContain("Blocked");
    expect(html(R1_FINDING_IDS.overridden)).toContain("No match in the approved corpus");
  });
  it("show every source on a finding that has several, the blocked one set apart from the verified", () => {
    const out = html(R1_FINDING_IDS.pending);
    expect(out).toContain("Indian Contract Act, 1872");
    expect(out).toContain("Purported High Court ruling");
    // The verified source (listed first) comes before any flagged styling; the blocked one carries it.
    expect(out.indexOf("Verified")).toBeLessThan(out.indexOf("border-flagged"));
    expect(out.indexOf("border-flagged")).toBeLessThan(out.indexOf("Purported High Court ruling"));
  });
});

describe("the finding screen", () => {
  it("shows the rule, the severity, the clause and the status to the advocate", () => {
    const out = detail(R1_FINDING_IDS.pending);
    expect(out).toContain("ICA-S27-NONCOMPETE-V2");
    expect(out).toContain("High");
    expect(out).toContain("Clause 7.2");
    expect(out).toContain("Open");
  });
  it("shows a settled finding as settled", () => {
    expect(detail(R1_FINDING_IDS.confirmed)).toContain("Settled");
    expect(detail(R1_FINDING_IDS.overridden)).toContain("Settled");
  });
  it("shows an added finding as settled and as the advocate's, with no pipeline rule named", () => {
    const out = detail(R1_FINDING_IDS.added);
    expect(out).toContain("Settled");
    expect(out).toContain("Added by advocate");
    expect(out).toContain("No pipeline rule is behind it");
  });
  it("keeps the rule behind the advocate's side", () => {
    expect(detail(R1_FINDING_IDS.pending, "client")).not.toContain("ICA-S27-NONCOMPETE-V2");
  });
  it("draws a finding that carries only what R1 requires, without a blank passage or remedy", () => {
    const out = detail(R1_FINDING_IDS.sparse);
    expect(out).toContain("A defined term is used before it is defined.");
    expect(out).toContain("No remedy was suggested.");
    expect(out).not.toContain("Passage");
    expect(out).not.toContain("Clause Whole document");
    expect(out).toContain("Whole document");
  });
});
