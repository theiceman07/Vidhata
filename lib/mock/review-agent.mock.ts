import type { ContractDocument, Finding, ReviewAgentReply } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";
import {
  findingNumbers,
  findingState,
  signOffBlockers,
  unsettledFindings,
} from "@/lib/findings";

/**
 * The review agent's replies, until the real agent lands.
 *
 * It works the advocate's side of the document: what stands before
 * sign-off, what the first pass raised and on what source, what a clause
 * says. Everything it says is read from the document itself (the fixture
 * text, the findings, their citations), never composed into a new legal
 * claim. It does not decide. A question about settling, overriding or
 * signing off is handed back with the evidence, because that call is the
 * advocate's and is recorded against their name.
 */

export const REVIEW_SUGGESTIONS = [
  "What stands before sign-off?",
  "Walk me through the findings",
  "Which sources do the findings cite?",
];

const DECISION = /\b(should i|shall i|do i|accept|approve|override|reject|dismiss|sign it off|ok to|okay to|is it fine|safe to)\b|\bsettle (it|this|finding)/i;
const BLOCKERS = /sign[- ]?off|stand|blocker|left|remaining|before|outstanding/i;
const SOURCES = /source|citation|cite|statute/i;
const FINDINGS = /finding|walk|through|summar|overview|issues|raised|first pass/i;

const SEVERITY: Record<Finding["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function sourceLine(finding: Finding): string {
  return finding.citation.trim() || "No source cited";
}

function findingRef(doc: ContractDocument, f: Finding) {
  return {
    label: `Finding ${findingNumbers(doc)[f.findingId]} · ${f.clauseReference}`,
    findingId: f.findingId,
    clauseNumber: null,
  };
}

function clauseNamed(text: string, doc: ContractDocument) {
  const lower = text.toLowerCase();
  const byNumber = lower.match(/\b(?:clause\s*)?(\d+\.\d+)\b/);
  if (byNumber) {
    const hit = doc.clauses.find((c) => c.number === byNumber[1]);
    if (hit) return hit;
  }
  return doc.clauses.find(
    (c) =>
      lower.includes(c.heading.toLowerCase()) ||
      c.heading
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.length > 5 && lower.includes(word)),
  );
}

export function getReviewReply(
  question: string,
  doc: ContractDocument,
  advocateId: string,
): ReviewAgentReply {
  const numbers = findingNumbers(doc);
  const open = unsettledFindings(doc);
  const clause = clauseNamed(question, doc);
  const onClause = clause
    ? doc.findings.filter((f) => clauseNumberFromReference(f.clauseReference) === clause.number)
    : [];

  // Hand the decision back, with what it rests on.
  if (DECISION.test(question)) {
    const subject = onClause[0] ?? open[0];
    return {
      decision: true,
      text: subject
        ? `That is your call, and it is recorded against your name. What the first pass has on ${subject.clauseReference}: ${subject.description} Source: ${sourceLine(subject)}.`
        : "That is your call, and it is recorded against your name. There is no open finding for me to set out.",
      refs: subject ? [findingRef(doc, subject)] : [],
    };
  }

  if (clause) {
    const raised =
      onClause.length === 0
        ? "The first pass raised nothing on it."
        : `The first pass raised ${onClause.length === 1 ? "one finding" : `${onClause.length} findings`} on it. ${onClause
            .map((f) => `${numbers[f.findingId]} · ${SEVERITY[f.severity]}: ${f.description}`)
            .join(" ")}`;
    return {
      decision: false,
      text: `Clause ${clause.number}, ${clause.heading}, reads: "${clause.body.split("\n\n")[0]}" ${raised}`,
      refs: [
        { label: `Clause ${clause.number}`, findingId: null, clauseNumber: clause.number },
        ...onClause.map((f) => findingRef(doc, f)),
      ],
    };
  }

  if (SOURCES.test(question)) {
    const cited = open.filter((f) => f.citation.trim() !== "");
    if (cited.length === 0) {
      return { decision: false, text: "No open finding cites a source.", refs: [] };
    }
    return {
      decision: false,
      text: `${cited.length === 1 ? "One open finding cites" : `${cited.length} open findings cite`} a source: ${cited
        .map((f) => `${f.citation}, for finding ${numbers[f.findingId]} on ${f.clauseReference}`)
        .join("; ")}.`,
      refs: cited.map((f) => findingRef(doc, f)),
    };
  }

  if (BLOCKERS.test(question)) {
    const blockers = signOffBlockers(doc, advocateId);
    if (blockers.length === 0) {
      return {
        decision: false,
        text: "Nothing stands before sign-off. Every finding is settled. Signing off is yours to do.",
        refs: [],
      };
    }
    return {
      decision: false,
      text: `${blockers.length === 1 ? "One thing stands" : `${blockers.length} things stand`} before sign-off: ${blockers
        .map((b) => b.label)
        .join("; ")}.`,
      refs: blockers
        .filter((b) => b.findingId)
        .map((b) => ({ label: b.label, findingId: b.findingId, clauseNumber: null })),
    };
  }

  if (FINDINGS.test(question)) {
    if (open.length === 0) {
      return { decision: false, text: "Every finding on this document is settled.", refs: [] };
    }
    return {
      decision: false,
      text: open
        .map(
          (f) =>
            `${numbers[f.findingId]} · ${SEVERITY[f.severity]} · ${f.clauseReference}${
              findingState(f) === "with_client" ? " (with the client)" : ""
            }. ${f.description} Source: ${sourceLine(f)}.`,
        )
        .join("\n\n"),
      refs: open.map((f) => findingRef(doc, f)),
    };
  }

  return {
    decision: false,
    text: "I can set out what stands before sign-off, walk through the findings and their sources, list the sources they cite, or read you a clause by its number or heading.",
    refs: [],
  };
}
