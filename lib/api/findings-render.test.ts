import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CitationBlock } from "@/components/document/citation-block";
import { FindingDetail } from "@/components/document/finding-detail";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import { BACKEND_EXAMPLE_FINDING } from "@/lib/mock/r1-backend-example.fixture";
import { R1_FINDINGS, R1_FINDING_IDS } from "@/lib/mock/r1-findings.fixtures";
import { linkFindingsToClauses, mapReviewFindings } from "./findings";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

/** What a finding that came in as R1 looks like on the screen. */

const { findings } = mapReviewFindings(R1_FINDINGS);
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
      trail: [],
    }),
  );

describe("the citation", () => {
  const html = (id: string) => renderToStaticMarkup(createElement(CitationBlock, { citation: byId(id).citation }));

  it("is shown as the one string the backend sent", () => {
    expect(html(R1_FINDING_IDS.pending)).toContain("Indian Contract Act, 1872, s.27");
    expect(html(R1_FINDING_IDS.confirmed)).toContain(
      "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
    );
  });
  it("carries no verified, blocked or withdrawn mark, and no flagged colour", () => {
    for (const id of Object.values(R1_FINDING_IDS)) {
      const out = html(id);
      expect(out).not.toMatch(/Verified|Blocked|Withdrawn|corpus/i);
      expect(out).not.toContain("flagged");
    }
  });
  it("sits under Source on the finding screen, for either portal", () => {
    for (const role of ["advocate", "client"] as const) {
      const out = detail(R1_FINDING_IDS.pending, role);
      expect(out).toContain("Source");
      expect(out).toContain("Indian Contract Act, 1872, s.27");
      expect(out).not.toMatch(/Verified|Blocked|Withdraw source/);
    }
  });
});

describe("a critical finding", () => {
  it("is drawn as Critical on the finding screen", () => {
    const out = detail(R1_FINDING_IDS.critical);
    expect(out).toContain("Critical");
    expect(out).toContain("CONFIDENTIALITY_TERM_MISSING");
  });
  it("is told apart from a high one by more than its word: not the high colour", () => {
    const critical = detail(R1_FINDING_IDS.critical);
    const high = detail(R1_FINDING_IDS.pending);
    expect(critical).toContain("bg-ink");
    expect(critical).not.toContain("bg-blocked");
    expect(high).toContain("bg-blocked");
  });
});

describe("the finding screen", () => {
  it("shows the rule, the severity, the clause and the status to the advocate", () => {
    const out = detail(R1_FINDING_IDS.pending);
    expect(out).toContain("ICA_S27_NONCOMPETE_V2");
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
    expect(detail(R1_FINDING_IDS.pending, "client")).not.toContain("ICA_S27_NONCOMPETE_V2");
  });
  it("draws a finding the backend example describes, a clause that is missing, without a blank passage", () => {
    const [example] = mapReviewFindings([BACKEND_EXAMPLE_FINDING]).findings;
    const out = renderToStaticMarkup(
      createElement(FindingDetail, {
        doc,
        finding: example,
        number: "01",
        role: "advocate",
        canAdjudicate: false,
        onSettle: () => {},
        onReopen: () => {},
        onRequestChange: () => {},
        trail: [],
      }),
    );
    expect(out).toContain("NDA_GOVERNING_LAW_MISSING");
    expect(out).toContain("Code of Civil Procedure, 1908, s. 20");
    expect(out).not.toContain("Passage");
    expect(out).toContain("Missing (expected after Clause 9, Term and Termination)");
  });
});

describe("Reopen on a settled finding", () => {
  const render = (id: string, onReopen?: () => void) =>
    renderToStaticMarkup(
      createElement(FindingDetail, {
        doc,
        finding: byId(id),
        number: "01",
        role: "advocate",
        canAdjudicate: true,
        onSettle: () => {},
        onReopen,
        onRequestChange: () => {},
        trail: [],
      }),
    );
  const ids = Object.values(R1_FINDING_IDS);

  it("is offered when the screen can reopen, so there is something to hide", () => {
    expect(ids.some((id) => render(id, () => {}).includes("Reopen"))).toBe(true);
  });

  it("is not offered when no handler is passed (backend mode), whatever the finding's state", () => {
    for (const id of ids) expect(render(id)).not.toContain("Reopen");
  });
});
