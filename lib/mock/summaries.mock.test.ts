import { describe, expect, it } from "vitest";
import { mockDocuments } from "./documents.mock";
import { mockSummaries } from "./summaries.mock";

// A summary is a reading of the settled text and nothing more. These hold every
// line to the clauses of the document it summarises, so the fixture cannot say
// what the text does not.

const docOf = (id: string) => mockDocuments.find((d) => d.id === id)!;
const clauseText = (docId: string, numbers: string[]) =>
  docOf(docId)
    .clauses.filter((c) => numbers.includes(c.number))
    .map((c) => c.body)
    .join("\n")
    .toLowerCase();
const allText = (docId: string) =>
  docOf(docId)
    .clauses.map((c) => c.body)
    .join("\n");

describe("the summary fixtures", () => {
  it("are for signed-off documents, at the draft the document is on", () => {
    for (const s of mockSummaries) {
      const doc = docOf(s.documentId);
      expect(doc, s.documentId).toBeDefined();
      expect(["settled", "executed"]).toContain(doc.status);
      expect(s.draft, s.documentId).toBe(doc.version);
    }
  });

  it("cite only clauses the document has", () => {
    for (const s of mockSummaries) {
      const numbers = new Set(docOf(s.documentId).clauses.map((c) => c.number));
      for (const item of s.items) {
        for (const n of item.clauses) expect(numbers.has(n), `${s.documentId} ${item.label} ${n}`).toBe(true);
      }
    }
  });

  // What each line states has to be in the clauses it cites. The phrases are
  // the settled text's own words for the figures and terms the line gives.
  const evidence: Record<string, string[]> = {
    "Who it is between": ["each party may disclose confidential information to the other"],
    "What counts as confidential": [
      "reasonable person would understand to be confidential",
      "technical specifications, pricing, customer lists, manufacturing processes and business plans",
    ],
    "What does not": [
      "publicly available through no act or omission",
      "lawfully in the receiving party's possession",
      "lawfully received from a third party",
      "independently developed",
    ],
    Term: ["twenty four (24) months", "date of last signature"],
    Termination: ["thirty (30) days written notice"],
    "After it ends": ["three (3) years", "trade secret"],
    "Returning materials": ["return or destroy", "one copy"],
    Liability: ["remains responsible for any breach by such persons"],
    "Governing law": ["laws of india", "courts at new delhi have exclusive jurisdiction"],
  };

  it("state only what the clauses they cite say", () => {
    for (const s of mockSummaries) {
      for (const item of s.items) {
        const needed = evidence[item.label];
        if (!needed) continue;
        const text = clauseText(s.documentId, item.clauses);
        for (const phrase of needed) {
          expect(text, `${s.documentId} · ${item.label} · "${phrase}"`).toContain(phrase);
        }
      }
    }
  });

  it("name the parties the document names", () => {
    for (const s of mockSummaries) {
      const doc = docOf(s.documentId);
      const line = s.items.find((i) => i.label === "Who it is between")!;
      expect(line.text).toContain(doc.clientName);
      expect(line.text).toContain(doc.counterpartyName);
    }
  });

  it("say a thing is absent only where it is absent from the whole text", () => {
    for (const s of mockSummaries) {
      const text = allText(s.documentId);
      const payment = s.items.find((i) => i.label === "Payment")!;
      expect(payment.clauses).toEqual([]);
      expect(text).not.toMatch(/payment|payable|\bfees?\b|invoice|consideration/i);

      const liability = s.items.find((i) => i.label === "Liability")!;
      expect(liability.text).toMatch(/no cap on liability and has no indemnity/);
      expect(text).not.toMatch(/liabil|indemn|damages/i);
    }
  });

  it("cover the terms a reader looks for first", () => {
    for (const s of mockSummaries) {
      const labels = s.items.map((i) => i.label);
      for (const wanted of ["Who it is between", "Term", "Payment", "Termination", "Liability"]) {
        expect(labels, s.documentId).toContain(wanted);
      }
    }
  });

  it("carry no statute, section, case name, advice or em dash", () => {
    for (const s of mockSummaries) {
      const text = s.items.map((i) => `${i.label} ${i.text}`).join("\n");
      expect(text).not.toMatch(/\bsection\b|\bs\.\s?\d|\b[A-Z][a-z]+ Act\b|\bv\.\s|\bvs\b/);
      expect(text).not.toMatch(/\bshould\b|\bmust\b|recommend|advise|\byou need\b|\bwe suggest\b/i);
      expect(text).not.toMatch(/—/);
    }
  });
});
