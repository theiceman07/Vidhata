import type { Clause, DocumentVersion, Finding } from "@/lib/types";
import {
  employmentClauses,
  EMPLOYMENT_PLACE_OF_WORK_FIRST_DRAFTED,
  ndaClauses,
  vendorClauses,
} from "./clauses.mock";
import { getMockDocumentById } from "./documents.mock";

/**
 * The history behind doc-vendor-revision, whose live head is draft 4.
 *
 * Snapshots are written at hand-off points only, so these are the drafts as
 * they were handed on, and the head may move ahead of the last one. Every
 * round is two hand-offs: the advocate sends it back (an advocate's revision)
 * and the client answers (the client's answers). Two rounds, the second still
 * open, make four drafts. The advocate's re-review of a round reads its round
 * as revisionCount + 1, so this one is Round 3.
 *
 *   Draft 1 · first pass · 8 Sep
 *     Finding 7 (the court named is in another state from where the supply
 *     is delivered) and finding 4 (the 90-day payment term). Finding 4's
 *     citation is blocked: the corpus held no match on this run.
 *   Draft 2 · advocate's revision · 10 Sep (round 1 sent back)
 *     The wording is unchanged. The pipeline ran again and finding 4's source
 *     now verifies. A request is out on finding 4, about the counterparty's
 *     MSME registration.
 *   Draft 3 · client's answers · 12 Sep
 *     Clauses 3.2 and 8.1 changed. Finding 7 is gone because Clause 8.1
 *     changed. Finding 4 is carried over, with the client's answer on it.
 *     Finding 8 is new, raised against the reworded Clause 3.2.
 *   Draft 4 · advocate's revision · 16 Sep (round 2 sent back; the head, as
 *   it was handed on)
 *     Clause 6.1 revised. Finding 8 settled by the advocate. Finding 4 still
 *     open, with a second request to the client. Findings 9 and 10 added by
 *     the advocate, one with a verified source and one with a blocked one.
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
  number: "01",
  clientNumber: "01",
  source: "pipeline",
  layer: 3,
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

// The advocate's first request, about the same finding, sent back after the
// first pass. The head's request (a second round) replaces it on the finding.
const FIRST_ROUND_REQUEST = {
  request:
    "Please confirm that Ganesh Packaging Works is a registered MSME, and send its registration number if you have it.",
  requestedAt: "2026-09-10T08:15:00.000Z",
  requestedBy: "Farhan Sheikh",
};

// Draft 2: the finding as the advocate sent it back, after the pipeline ran
// again. The corpus matched this time, so the citation verifies, and the
// first request is out and unanswered.
const paymentTermDraft2: Finding = (() => {
  const finding = headFinding("find-4");
  finding.changeRequest = {
    ...FIRST_ROUND_REQUEST,
    response: null,
    respondedAt: null,
  };
  return finding;
})();

// Draft 3: the same finding once the client has answered that request.
const paymentTermDraft3: Finding = (() => {
  const finding = headFinding("find-4");
  finding.changeRequest = {
    ...FIRST_ROUND_REQUEST,
    response: "Yes, they are a registered MSME. The Udyam number is on file with our accounts team.",
    respondedAt: "2026-09-12T09:05:00.000Z",
  };
  return finding;
})();

// Draft 3: the finding as it was raised, before the advocate decided it.
const lateReplacementDraft3: Finding = (() => {
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

// The advocate's first send-back. The wording is unchanged from draft 1, and
// the pipeline has run again, so finding 4's source now verifies.
const draft2: DocumentVersion = {
  documentId: DOCUMENT_ID,
  number: 2,
  createdAt: "2026-09-10T08:20:00.000Z",
  createdBy: "advocate_revision",
  pipelineRunAt: "2026-09-10T08:19:00.000Z",
  clauses: draft1.clauses.map((c) => ({ ...c })),
  findings: [courtMismatch, paymentTermDraft2],
};

const draft3: DocumentVersion = {
  documentId: DOCUMENT_ID,
  number: 3,
  createdAt: "2026-09-12T09:12:00.000Z",
  createdBy: "client_response",
  pipelineRunAt: "2026-09-12T09:11:00.000Z",
  clauses: draftClauses({
    "cl-ven-4": { findingIds: ["find-8"] },
    "cl-ven-6": { findingIds: ["find-4"] },
    "cl-ven-7": { body: WARRANTY_BEFORE_REVISION },
  }),
  findings: [paymentTermDraft3, lateReplacementDraft3],
};

// The head as it was handed to the client on 16 Sep, with the request on
// finding 4.
const draft4: DocumentVersion = {
  documentId: DOCUMENT_ID,
  number: 4,
  createdAt: "2026-09-16T07:40:00.000Z",
  createdBy: "advocate_revision",
  pipelineRunAt: "2026-09-16T07:31:00.000Z",
  clauses: structuredClone(head.clauses),
  findings: structuredClone(head.findings),
};

/**
 * The history behind doc-nda-settled, a document the advocate has signed
 * off, so the client may read all of it.
 *
 *   Draft 1 · first pass · 2 Aug
 *     Clause 4.1 gave the term as thirty six months, and the first pass
 *     flagged that it did not match the 24 months on the deal file.
 *   Draft 2 · advocate's revision · 4 Aug (the head, as signed off)
 *     The advocate corrected Clause 4.1 and settled that finding, and added
 *     a finding of their own on Clause 6.1, which they then overrode.
 */
const NDA_ID = "doc-nda-settled";

const ndaHead = getMockDocumentById(NDA_ID);
if (!ndaHead) {
  throw new Error(`Fixture ${NDA_ID} is missing, so its history has no head.`);
}

const ndaTerm = ndaClauses.find((c) => c.id === "cl-nda-6")?.body ?? "";
if (!ndaTerm.includes("twenty four (24)")) {
  throw new Error("The NDA term clause has drifted from what its history rewords.");
}
const NDA_TERM_DRAFT_1 = ndaTerm.replace("twenty four (24)", "thirty six (36)");

const termMismatchDraft1: Finding = (() => {
  const finding = structuredClone(
    ndaHead.findings.find((f) => f.findingId === "find-n1"),
  );
  if (!finding) throw new Error("Finding find-n1 is missing from the NDA head.");
  // As the first pass raised it: quoting the wording it was raised against,
  // and not yet decided.
  finding.clauseText = NDA_TERM_DRAFT_1;
  finding.disposition = "pending";
  finding.overrideNote = null;
  finding.resolvedAt = null;
  return finding;
})();

const ndaDraft1: DocumentVersion = {
  documentId: NDA_ID,
  number: 1,
  createdAt: "2026-08-02T09:40:00.000Z",
  createdBy: "first_pass",
  pipelineRunAt: "2026-08-02T09:39:00.000Z",
  clauses: ndaClauses.map((c) => ({
    ...c,
    findingIds: c.id === "cl-nda-6" ? ["find-n1"] : [],
    revisedAt: null,
    body: c.id === "cl-nda-6" ? NDA_TERM_DRAFT_1 : c.body,
  })),
  findings: [termMismatchDraft1],
};

const ndaDraft2: DocumentVersion = {
  documentId: NDA_ID,
  number: 2,
  createdAt: "2026-08-04T12:30:00.000Z",
  createdBy: "advocate_revision",
  pipelineRunAt: "2026-08-04T12:11:00.000Z",
  clauses: structuredClone(ndaHead.clauses),
  findings: structuredClone(ndaHead.findings),
};

/**
 * The history behind doc-employment-rereview, which the current advocate
 * holds and whose live head is draft 3 (round 2).
 *
 *   Draft 1 · first pass · 22 Sep
 *     Findings 1, 2, 3 and 5, none decided.
 *   Draft 2 · advocate's revision · 24 Sep
 *     The advocate decided finding 1 and sent the document back, with a
 *     request on finding 2 (can the Employee be moved to another city, and
 *     on what notice) and one on finding 3 (what the cost to company is made
 *     up of). The wording is unchanged: a send-back is a hand-off.
 *   Draft 3 · client's answers · 30 Sep (the head, as it was handed on)
 *     The client answered by rewording Clause 4.1, so finding 2 is gone, and
 *     the re-run raised finding 4 on the new wording. Finding 3 is answered
 *     and still open. Finding 5 was undecided here; the advocate has decided
 *     it since, which is how the head is ahead of this snapshot.
 */
const REREVIEW_ID = "doc-employment-rereview";

const rereviewHead = getMockDocumentById(REREVIEW_ID);
if (!rereviewHead) {
  throw new Error(`Fixture ${REREVIEW_ID} is missing, so its history has no head.`);
}

function rereviewFinding(findingId: string): Finding {
  const finding = rereviewHead!.findings.find((f) => f.findingId === findingId);
  if (!finding) throw new Error(`Finding ${findingId} is missing from the head.`);
  return structuredClone(finding);
}

const undecided = (finding: Finding): Finding => ({
  ...finding,
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
});

const unanswered = (finding: Finding): Finding => ({ ...finding, changeRequest: null });

// The employment clauses as first drafted, with the findings raised against
// them.
function rereviewFirstDraftClauses(findingClauses: Record<string, string[]>): Clause[] {
  return employmentClauses.map((c) => ({
    ...c,
    findingIds: findingClauses[c.id] ?? [],
    revisedAt: null,
  }));
}

// Raised against the wording the client later changed, so the new draft does
// not raise it again.
const remoteWorkDraft: Finding = {
  findingId: "find-e2",
  number: "02",
  clientNumber: "02",
  source: "pipeline",
  layer: 3,
  severity: "low",
  clauseReference: "Clause 4.1",
  clauseText: EMPLOYMENT_PLACE_OF_WORK_FIRST_DRAFTED,
  description:
    "The Employee can be directed to work elsewhere, or remotely, with no notice period stated.",
  ruleApplied: "WORK-LOCATION-NOTICE-V1",
  remedySuggested: "State how much notice the Employee is given before a change of place of work.",
  citations: [],
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
};

const rereviewRequest = (finding: Finding, request: string): Finding => ({
  ...finding,
  changeRequest: {
    request,
    requestedAt: "2026-09-24T09:25:00.000Z",
    requestedBy: rereviewHead!.advocate?.name ?? "",
    response: null,
    respondedAt: null,
  },
});

const rereviewDraft1: DocumentVersion = {
  documentId: REREVIEW_ID,
  number: 1,
  createdAt: "2026-09-22T10:05:00.000Z",
  createdBy: "first_pass",
  pipelineRunAt: "2026-09-22T10:04:00.000Z",
  clauses: rereviewFirstDraftClauses({
    "cl-emp-2": ["find-e1"],
    "cl-emp-4": ["find-e3"],
    "cl-emp-6": ["find-e2"],
    "cl-emp-9": ["find-e5"],
  }),
  findings: [
    undecided(rereviewFinding("find-e1")),
    remoteWorkDraft,
    unanswered(rereviewFinding("find-e3")),
    undecided(rereviewFinding("find-e5")),
  ],
};

const rereviewDraft2: DocumentVersion = {
  documentId: REREVIEW_ID,
  number: 2,
  createdAt: "2026-09-24T09:30:00.000Z",
  createdBy: "advocate_revision",
  pipelineRunAt: "2026-09-24T09:29:00.000Z",
  clauses: rereviewDraft1.clauses.map((c) => ({ ...c })),
  findings: [
    rereviewFinding("find-e1"),
    rereviewRequest(
      remoteWorkDraft,
      "Please confirm whether the Employee may be asked to work from another city, and how much notice they would be given.",
    ),
    rereviewRequest(
      unanswered(rereviewFinding("find-e3")),
      "Please tell me what the annual cost to company of Rs 24,00,000 is made up of: fixed pay, variable pay and any benefits, and when each is paid. I will have Clause 3.1 say so.",
    ),
    undecided(rereviewFinding("find-e5")),
  ],
};

const rereviewDraft3: DocumentVersion = {
  documentId: REREVIEW_ID,
  number: 3,
  createdAt: "2026-09-30T08:35:00.000Z",
  createdBy: "client_response",
  pipelineRunAt: "2026-09-30T08:34:00.000Z",
  clauses: structuredClone(rereviewHead.clauses),
  // The head as it came back: finding 5 was not yet decided.
  findings: [
    rereviewFinding("find-e1"),
    rereviewFinding("find-e3"),
    rereviewFinding("find-e4"),
    undecided(rereviewFinding("find-e5")),
  ],
};

export const mockVersions: DocumentVersion[] = [
  draft1,
  draft2,
  draft3,
  draft4,
  ndaDraft1,
  ndaDraft2,
  rereviewDraft1,
  rereviewDraft2,
  rereviewDraft3,
];
