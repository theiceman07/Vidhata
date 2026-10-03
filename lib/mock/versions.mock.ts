import type { Clause, DocumentVersion, Finding } from "@/lib/types";
import { vendorClauses } from "./clauses.mock";
import { getMockDocumentById } from "./documents.mock";

/**
 * The history behind doc-vendor-revision, whose live head is draft 3.
 *
 * Snapshots are written at hand-off points only, so these are the drafts as
 * they were handed on, and the head may move ahead of the last one.
 *
 *   Draft 1 · first pass · 8 Sep
 *     Finding 7 (the court named is in another state from where the supply
 *     is delivered) and finding 4 (the 90-day payment term). Finding 4's
 *     citation is blocked: the corpus held no match on this run.
 *   Draft 2 · client's answers · 12 Sep
 *     Clauses 3.2 and 8.1 changed. Finding 7 is gone because Clause 8.1
 *     changed. Finding 4 is carried over, and its citation now verifies:
 *     the pipeline ran again and the corpus matched this time. Finding 8 is
 *     new, raised against the reworded Clause 3.2.
 *   Draft 3 · advocate's revision · 16 Sep (the head, as it was handed on)
 *     Clause 6.1 revised. Finding 8 settled by the advocate. Finding 4 still
 *     open, with a request to the client. Findings 9 and 10 added by the
 *     advocate, one with a verified source and one with a blocked one.
 *
 * Fixture prose is about contract facts. It says nothing about what any
 * statute provides, and the blocked placeholder is plainly not an authority.
 */

const DOCUMENT_ID = "doc-vendor-revision";

const head = getMockDocumentById(DOCUMENT_ID);
if (!head) {
  throw new Error(`Fixture ${DOCUMENT_ID} is missing, so its history has no head.`);
}

function headClause(id: string): Clause {
  const clause = vendorClauses.find((c) => c.id === id);
  if (!clause) throw new Error(`Clause ${id} is missing from the vendor fixture.`);
  return clause;
}

function headFinding(findingId: string): Finding {
  const finding = head!.findings.find((f) => f.findingId === findingId);
  if (!finding) throw new Error(`Finding ${findingId} is missing from the head.`);
  return structuredClone(finding);
}

/** The head's wording with one phrase swapped, failing loudly if it is not there. */
function reword(id: string, from: string, to: string): string {
  const body = headClause(id).body;
  if (!body.includes(from)) {
    throw new Error(`"${from}" is not in clause ${id}; the fixture has drifted.`);
  }
  return body.replace(from, to);
}

/** The vendor clauses with no findings attached, and these changes applied. */
function draftClauses(changes: Record<string, Partial<Clause>>): Clause[] {
  return vendorClauses.map((c) => ({
    ...c,
    findingIds: [],
    revisedAt: null,
    ...changes[c.id],
  }));
}

// Drafts 1 and 2 stop at "workmanship"; the advocate's wording in draft 3
// adds the fitness-for-purpose limb.
const WARRANTY_BEFORE_REVISION =
  "The Supplier warrants that the goods will conform to the specification and will be free from defects in materials and workmanship, for a period of twelve (12) months from delivery.";

const courtMismatch: Finding = {
  findingId: "find-7",
  source: "pipeline",
  layer: 4,
  severity: "medium",
  clauseReference: "Clause 8.1",
  clauseText:
    "The courts at Mumbai have jurisdiction over any dispute arising out of or in connection with it.",
  description:
    "The supply is delivered at Tiruppur in Tamil Nadu, but the clause names the courts at Mumbai. The forum and the place of performance do not match.",
  ruleApplied: "JURIS-FORUM-MISMATCH-V1",
  remedySuggested:
    "Confirm which courts were intended. The delivery and the dealings are in Tamil Nadu.",
  citations: [],
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
};

// The payment-term finding as the first pass raised it: the citation did not
// match the corpus on that run, so it was blocked.
const paymentTermDraft1: Finding = (() => {
  const finding = headFinding("find-4");
  finding.changeRequest = null;
  finding.citations = finding.citations.map((c) => ({
    ...c,
    status: "blocked",
    corpusRef: null,
  }));
  return finding;
})();

// Draft 2: the same finding after the pipeline ran again. The corpus matched
// this time, so the citation verifies; the request has not been made yet.
const paymentTermDraft2: Finding = (() => {
  const finding = headFinding("find-4");
  finding.changeRequest = null;
  return finding;
})();

// Draft 2: the finding as it was raised, before the advocate decided it.
const lateReplacementDraft2: Finding = (() => {
  const finding = headFinding("find-8");
  finding.disposition = "pending";
  finding.overrideNote = null;
  finding.resolvedAt = null;
  return finding;
})();

const draft1: DocumentVersion = {
  documentId: DOCUMENT_ID,
  number: 1,
  createdAt: "2026-09-08T11:35:00.000Z",
  createdBy: "first_pass",
  pipelineRunAt: "2026-09-08T11:34:00.000Z",
  clauses: draftClauses({
    "cl-ven-4": {
      body: reword("cl-ven-4", "fourteen (14)", "thirty (30)"),
    },
    "cl-ven-6": { findingIds: ["find-4"] },
    "cl-ven-7": { body: WARRANTY_BEFORE_REVISION },
    "cl-ven-9": {
      body: reword("cl-ven-9", "Chennai", "Mumbai"),
      findingIds: ["find-7"],
    },
  }),
  findings: [courtMismatch, paymentTermDraft1],
};

const draft2: DocumentVersion = {
  documentId: DOCUMENT_ID,
  number: 2,
  createdAt: "2026-09-12T09:12:00.000Z",
  createdBy: "client_response",
  pipelineRunAt: "2026-09-12T09:11:00.000Z",
  clauses: draftClauses({
    "cl-ven-4": { findingIds: ["find-8"] },
    "cl-ven-6": { findingIds: ["find-4"] },
    "cl-ven-7": { body: WARRANTY_BEFORE_REVISION },
  }),
  findings: [paymentTermDraft2, lateReplacementDraft2],
};

// The head as it was handed to the client on 16 Sep, with the request on
// finding 4.
const draft3: DocumentVersion = {
  documentId: DOCUMENT_ID,
  number: 3,
  createdAt: "2026-09-16T07:40:00.000Z",
  createdBy: "advocate_revision",
  pipelineRunAt: "2026-09-16T07:31:00.000Z",
  clauses: structuredClone(head.clauses),
  findings: structuredClone(head.findings),
};

export const mockVersions: DocumentVersion[] = [draft1, draft2, draft3];
