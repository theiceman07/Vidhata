import type { ContractDocument, Finding, ReviewAgentReply } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";
import {
  blockingCitations,
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
  "Which sources are blocked?",
];

const DECISION = /\b(should i|shall i|do i|accept|approve|override|reject|dismiss|sign it off|ok to|okay to|is it fine|safe to)\b|\bsettle (it|this|finding)/i;
const BLOCKERS = /sign[- ]?off|stand|blocker|left|remaining|before|outstanding/i;
const SOURCES = /source|citation|cite|statute|verified|corpus|blocked/i;
const FINDINGS = /finding|walk|through|summar|overview|issues|raised|first pass/i;

const SEVERITY: Record<Finding["severity"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function sourceLine(finding: Finding): string {
  if (finding.citations.length === 0) return "No source cited";
  return finding.citations
    .map((c) => {
      if (c.withdrawn) return `${c.text} (withdrawn)`;
      return `${c.text} (${c.status === "verified" ? "verified" : "blocked, no corpus match"})`;
    })
    .join("; ");
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
        ? `That is your call, and it is recorded against your name. What the first pass has on ${subject.clauseReference}: ${subject.description} Source: ${sourceLine(subject)}.${
            blockingCitations(subject).length > 0
              ? " A blocked source has to be withdrawn, with your note, before this finding can be settled."
              : ""
          }`
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
    const blocked = doc.findings.flatMap((f) =>
      blockingCitations(f).map((c) => ({ f, c })),
    );
    if (blocked.length === 0) {
      return {
        decision: false,
        text: "No source is blocked. Every citation the open findings rely on matched the corpus, or has been withdrawn with a note.",
        refs: [],
      };
    }
    return {
      decision: false,
      text: `${blocked.length === 1 ? "One source is" : `${blocked.length} sources are`} blocked: ${blocked
        .map(({ f, c }) => `${c.text}, cited by finding ${numbers[f.findingId]} on ${f.clauseReference}`)
        .join("; ")}. A blocked source found no match in the corpus, so the finding cannot rest on it. You can withdraw it with a note; it is never re-labelled verified.`,
      refs: blocked.map(({ f }) => findingRef(doc, f)),
    };
  }

  if (BLOCKERS.test(question)) {
    const blockers = signOffBlockers(doc, advocateId);
    if (blockers.length === 0) {
      return {
        decision: false,
        text: "Nothing stands before sign-off. Every finding is settled and no source it relies on is blocked. Signing off is yours to do.",
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
    text: "I can set out what stands before sign-off, walk through the findings and their sources, list blocked sources, or read you a clause by its number or heading.",
    refs: [],
  };
}
