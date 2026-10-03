import type {
  Clause,
  ContractDocument,
  DocumentVersion,
  ExecutionStep,
  Finding,
  ReviewTier,
  VersionCreatedBy,
} from "@/lib/types";
import { PIPELINE_DURATION_MS, clauseNumberFromReference } from "@/lib/types";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { mockVersions } from "@/lib/mock/versions.mock";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { recheckFindings } from "@/lib/citations";
import { declaredConflictWith } from "@/lib/conflicts";
import { revisionBlockedReason, revisionCycle } from "@/lib/revisions";
import { assignReviewTier } from "@/lib/triage";
import { declaredConflictNames } from "./advocate";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";

// QA 7.3: tier ordering used to sort the advocate queue, so the pricing
// page's "Priority turnaround" claim (Enhanced/Senior tiers) is backed by
// real routing behaviour instead of being decorative copy.
const TIER_PRIORITY: Record<ReviewTier, number> = {
  senior: 0,
  enhanced: 1,
  standard: 2,
};

// A document with no tier has not been screened, so it is not in the queue
// yet; it sorts last rather than ahead of work that is.
export function getQueuePriority(doc: ContractDocument): number {
  return doc.tier ? TIER_PRIORITY[doc.tier] : Object.keys(TIER_PRIORITY).length;
}

// Illustrative flat stamp duty figures for the demo pipeline's output —
// not legal advice, mirrors the pattern already used in the settled NDA
// fixture (lib/mock/documents.mock.ts).
const STAMP_DUTY_BY_STATE: Record<string, string> = {
  Delhi: "Rs 100",
  Maharashtra: "Rs 500",
  Karnataka: "Rs 200",
  "Tamil Nadu": "Rs 100",
  Telangana: "Rs 100",
  Gujarat: "Rs 300",
  "West Bengal": "Rs 150",
  Haryana: "Rs 200",
  "Uttar Pradesh": "Rs 100",
  Kerala: "Rs 200",
};

function buildExecutionSteps(doc: ContractDocument): ExecutionStep[] {
  const stampDuty = STAMP_DUTY_BY_STATE[doc.stateOfExecution] ?? "Rs 100";
  const requiresRegistration =
    doc.type === "msa" && doc.transactionValue > 1000000;

  return [
    {
      kind: "stamping",
      applicable: true,
      headline: `Stamp duty: ${stampDuty} (${doc.stateOfExecution})`,
      detail: `Flat-rate stamp duty for a ${doc.type.toUpperCase()} executed in ${doc.stateOfExecution}.`,
      reason: `Documents of this kind executed in ${doc.stateOfExecution} attract a flat stamp duty.`,
      instructions: [
        "Purchase e-stamp paper via SHCIL or an authorised vendor.",
        "Print the settled document on the stamp paper.",
        "Have both signatories sign on the last page.",
      ],
      complete: false,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
    {
      kind: "registration",
      applicable: requiresRegistration,
      headline: requiresRegistration
        ? "Registration: required"
        : "Registration: not required",
      detail: requiresRegistration
        ? "File the document with the local Sub-Registrar."
        : "No registration filing needed.",
      reason: requiresRegistration
        ? "High-value MSAs are compulsorily registrable under Section 17 of the Registration Act, 1908."
        : "This document type is not compulsorily registrable under Section 17 of the Registration Act, 1908.",
      instructions: requiresRegistration
        ? [
            "Book an appointment with the Sub-Registrar's office.",
            "Carry two witnesses and original identity proof.",
          ]
        : [],
      complete: false,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
    {
      kind: "esignature",
      applicable: true,
      headline: "e-signature: valid under the IT Act",
      detail: `Aadhaar-based e-sign satisfies Section 5 of the IT Act, 2000, for a document governed by ${doc.governingLaw}.`,
      reason:
        "This document type is not among the classes excluded from electronic execution.",
      instructions: [
        "Both signatories complete Aadhaar e-sign via the settlement portal.",
        "Download the signed PDF with the embedded audit trail.",
      ],
      complete: false,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
  ];
}

// In-memory mutable store so adjudication/claim/sign-off actions persist
// for the duration of the tab. Resets on reload — there is no backend yet.
let store: ContractDocument[] = structuredClone(mockDocuments);

// Snapshots of drafts as they were handed on. They are written at hand-off
// points only (see DocumentVersion), never on every edit, and kept apart from
// the documents so list and queue reads stay light. Documents seeded before
// snapshots existed have none.
const versionStore: DocumentVersion[] = structuredClone(mockVersions);

function recordVersion(doc: ContractDocument, createdBy: VersionCreatedBy): void {
  if (versionStore.some((v) => v.documentId === doc.id && v.number === doc.version)) {
    return;
  }
  // The citation gate runs again on every draft: each citation on the record
  // is resolved against the corpus afresh, on the working copy and in the
  // snapshot alike, so the two agree at the moment of hand-off. A blocked
  // citation becomes verified only by matching the corpus, and a verified
  // one that no longer matches becomes blocked. The other layers do not run
  // here: this mock has no drafting or screening logic of its own.
  doc.findings = recheckFindings(doc.findings);

  const now = new Date().toISOString();
  versionStore.push({
    documentId: doc.id,
    number: doc.version,
    createdAt: now,
    createdBy,
    pipelineRunAt: now,
    clauses: structuredClone(doc.clauses),
    findings: structuredClone(doc.findings),
  });
}

// QA 4.5: analysis used to complete via a setTimeout owned by the document
// detail page component, cleared on unmount — a document left "analysing"
// stayed that way forever if the user navigated away before the timer
// fired. Reconciling against a stored analysisCompletesAt on every read
// makes the state durable regardless of what's mounted, the same shape a
// real background job would have.
function reconcileAnalysis(doc: ContractDocument): void {
  if (doc.status !== "analysing" || !doc.analysisCompletesAt) return;
  if (Date.now() < new Date(doc.analysisCompletesAt).getTime()) return;

  doc.status = "pending_review";
  doc.analysisCompletesAt = null;
  // Screening assigns the review tier from the deal facts; the client does
  // not choose it.
  doc.tier = assignReviewTier(doc);
  // Demo-only: the pipeline has no real drafting/screening logic to run,
  // so a freshly analysed document is seeded with the same representative
  // finding set used in the pending_review fixture (high non-compete,
  // medium MSMED, low blocked-citation) rather than staying empty.
  doc.findings = structuredClone(
    mockDocuments.find((d) => d.id === "doc-msa-pending")?.findings ?? [],
  ).map((f, i) => ({ ...f, findingId: `${doc.id}-finding-${i}` }));

  // A finding is a note in the margin of a clause, so the join has to hold
  // in both directions. buildClauses drafts the three clauses these
  // findings quote; attach each finding to its clause, and drop any
  // finding whose clause is not in this document rather than leaving it
  // pointing at nothing.
  const byNumber = new Map(doc.clauses.map((c) => [c.number, c]));
  doc.clauses.forEach((c) => {
    c.findingIds = [];
  });
  doc.findings = doc.findings.filter((f) => {
    const clause = byNumber.get(clauseNumberFromReference(f.clauseReference));
    if (!clause) return false;
    clause.findingIds.push(f.findingId);
    return true;
  });

  // The first pass is handed to the advocate queue: that is a hand-off.
  recordVersion(doc, "first_pass");
}

function reconcileAll(): void {
  store.forEach(reconcileAnalysis);
}

/**
 * @param orgId When provided, scopes the result to that org only (QA 3.5 —
 *   every client used to see every tenant's documents on one dashboard).
 *   Omitted for the advocate queue, which is intentionally cross-org: an
 *   advocate must see documents from every client company.
 */
export async function listDocuments(
  orgId?: string,
): Promise<ContractDocument[]> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your documents.");
  }
  reconcileAll();
  const scoped = orgId ? store.filter((d) => d.orgId === orgId) : store;
  return structuredClone(scoped);
}

export async function getDocument(
  id: string,
): Promise<ContractDocument | null> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load this document.");
  }
  const doc = store.find((d) => d.id === id);
  if (!doc) return null;
  reconcileAnalysis(doc);
  return structuredClone(doc);
}

/**
 * The drafts of one document as they were handed on, oldest first. This is a
 * detail-page read: the head is the working copy and may be ahead of the
 * last snapshot.
 */
export async function getDocumentVersions(
  id: string,
): Promise<DocumentVersion[]> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load the version history.");
  }
  return structuredClone(
    versionStore
      .filter((v) => v.documentId === id)
      .sort((a, b) => a.number - b.number),
  );
}

export interface IntakeInput {
  title: string;
  type: ContractDocument["type"];
  clientName: string;
  counterpartyName: string;
  stateOfExecution: string;
  transactionValue: number;
  counterpartyIsMsme: boolean;
  durationMonths: number;
  governingLaw: string;
  keyTerms: string;
}

// A drafted document needs a body, or the workspace has nothing to
// annotate. The pipeline's clause drafting layer (layer 1) would assemble
// these from the curated corpus; here they are a standard skeleton with
// the intake facts interpolated. Contract language only, never statute.
function buildClauses(input: IntakeInput): Clause[] {
  const counterparty = input.counterpartyName || "the Counterparty";
  const term = input.durationMonths
    ? `continues for ${input.durationMonths} months`
    : "continues until terminated in accordance with this Agreement";

  return [
    {
      id: "cl-1",
      number: "1.1",
      heading: "Parties",
      body: `This Agreement is made between ${input.clientName} and ${counterparty}, and is executed in ${input.stateOfExecution}.`,
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-2",
      number: "2.1",
      heading: "Scope",
      body:
        input.keyTerms.trim() ||
        "The scope of this Agreement is as described in the Schedule, which forms part of this Agreement.",
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-3",
      number: "3.1",
      heading: "Consideration",
      body: input.transactionValue
        ? `The total consideration payable under this Agreement is Rs ${input.transactionValue.toLocaleString("en-IN")}, payable in accordance with Clause 4.1.`
        : "No monetary consideration is payable under this Agreement; the mutual covenants set out below constitute sufficient consideration.",
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-4",
      number: "4.1",
      heading: "Payment terms",
      body: "Payment shall be made within sixty (60) days of receipt of a valid invoice.",
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-5",
      number: "5.1",
      heading: "Confidentiality",
      body: "Each party shall keep confidential all information of the other party that is designated as confidential or that ought reasonably to be regarded as confidential, and shall not use it other than for the performance of this Agreement.",
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-6",
      number: "6.1",
      heading: "Term",
      body: `This Agreement commences on the date of last signature and ${term}.`,
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-7",
      number: "6.2",
      heading: "Termination",
      body: "Either party may terminate this Agreement on thirty (30) days written notice, or immediately on written notice if the other party commits a material breach that it fails to remedy within thirty (30) days of being required to do so.",
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-8",
      number: "7.2",
      heading: "Non-compete",
      body: "The Service Provider shall not, for a period of three (3) years following termination, engage in any business activity within India that competes with the Client.",
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-9",
      number: "11.1",
      heading: "Governing law",
      body: `This Agreement is governed by the ${input.governingLaw}.`,
      findingIds: [],
      revisedAt: null,
    },
    {
      id: "cl-10",
      number: "11.4",
      heading: "Dispute resolution",
      body: "Any dispute arising under this Agreement shall be resolved by arbitration seated in Singapore.",
      findingIds: [],
      revisedAt: null,
    },
  ];
}

export async function createDraftDocument(
  input: IntakeInput,
): Promise<ContractDocument> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not create the draft.");
  }
  const doc: ContractDocument = {
    id: `doc-${Date.now()}`,
    title: input.title,
    type: input.type,
    status: "draft",
    tier: null,
    // The mock layer only ever authenticates one client identity, so every
    // document a client creates belongs to that identity's org regardless
    // of the "your company name" text entered in the wizard (that field is
    // display text on the contract, not a tenant selector).
    orgId: MOCK_CLIENT_ORG.id,
    clientName: input.clientName,
    counterpartyName: input.counterpartyName,
    stateOfExecution: input.stateOfExecution,
    transactionValue: input.transactionValue,
    counterpartyIsMsme: input.counterpartyIsMsme,
    durationMonths: input.durationMonths,
    governingLaw: input.governingLaw,
    keyTerms: input.keyTerms.trim() ? input.keyTerms.trim() : null,
    createdAt: new Date().toISOString(),
    version: 1,
    revisionCount: 0,
    claimedAt: null,
    settledAt: null,
    analysisCompletesAt: null,
    advocate: null,
    clauses: buildClauses(input),
    findings: [],
    executionSteps: [],
  };
  store = [doc, ...store];
  return structuredClone(doc);
}

export async function startAnalysis(id: string): Promise<ContractDocument> {
  await randomDelay(200, 400);
  const doc = store.find((d) => d.id === id);
  if (!doc) throw new MockApiError("Document not found.");
  if (doc.status === "draft") {
    doc.status = "analysing";
    doc.analysisCompletesAt = new Date(
      Date.now() + PIPELINE_DURATION_MS,
    ).toISOString();
  }
  return structuredClone(doc);
}

/**
 * What an advocate affirms when they claim: no conflict of interest with
 * either party. A claim is refused without it, whatever the screen did.
 */
export interface ConflictDeclaration {
  noConflictWithEitherParty: true;
}

export async function claimDocument(
  id: string,
  advocate: { id: string; name: string; bar: string },
  declaration: ConflictDeclaration,
): Promise<ContractDocument> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not claim this document.");
  }
  const doc = store.find((d) => d.id === id);
  if (!doc) throw new MockApiError("Document not found.");
  // Claiming is exclusive. A second advocate cannot take a document out
  // of the hands of the one already reviewing it.
  if (doc.advocate && doc.advocate.id !== advocate.id) {
    throw new MockApiError(
      `${doc.advocate.name} has already claimed this document.`,
    );
  }
  // Already theirs: nothing to claim, and nothing to reset.
  if (doc.advocate?.id === advocate.id) return structuredClone(doc);

  if (!declaration?.noConflictWithEitherParty) {
    throw new MockApiError(
      "Declare that you have no conflict of interest with either party before you claim.",
    );
  }
  // A name the advocate has declared a conflict with is one they cannot
  // then declare clear of. The declaration is theirs to correct on their
  // profile, not to override here.
  const conflict = declaredConflictWith(
    [doc.clientName, doc.counterpartyName],
    declaredConflictNames(),
  );
  if (conflict) {
    throw new MockApiError(
      `Your profile lists ${conflict.declared} as a declared conflict, which matches ${conflict.party}. You cannot claim this document.`,
    );
  }
  const now = new Date().toISOString();
  doc.status = "under_review";
  doc.advocate = advocate;
  doc.claimedAt = now;
  doc.conflictDeclaredAt = now;
  return structuredClone(doc);
}

function findFinding(docId: string, findingId: string) {
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  const finding = doc.findings.find((f) => f.findingId === findingId);
  if (!finding) throw new MockApiError("Finding not found.");
  return { doc, finding };
}

/**
 * Ask the client for something before a finding can be settled. The
 * document goes back to the client at once: whatever else the advocate
 * is still working through, the client can start on this now.
 */
export async function requestChange(
  docId: string,
  findingId: string,
  request: string,
  advocateName: string,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send this request.");
  }
  const { doc, finding } = findFinding(docId, findingId);
  // The limit holds whatever the screen offered (FR-20). It stops a round
  // being started past it; it never stops sign-off.
  const blocked = revisionBlockedReason(revisionCycle(doc));
  if (blocked) throw new MockApiError(blocked);

  const now = new Date().toISOString();
  finding.changeRequest = {
    request,
    requestedAt: now,
    requestedBy: advocateName,
    response: null,
    respondedAt: null,
  };
  // Sending it back is what the cycle count counts, so a second request in
  // the same round does not add another.
  if (doc.status !== "revision") doc.revisionCount += 1;
  doc.status = "revision";
  // The round that uses the last of them logs the case, once.
  if (revisionCycle(doc).reached && !doc.corpusReviewLoggedAt) {
    doc.corpusReviewLoggedAt = now;
  }
  return structuredClone(doc);
}

/**
 * The client's answers go back to the advocate as one submission, which
 * is what makes the next draft a draft rather than a stream of edits.
 */
export async function respondToChanges(
  docId: string,
  responses: Record<string, string>,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send your responses.");
  }
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  const now = new Date().toISOString();
  doc.findings.forEach((f) => {
    const answer = responses[f.findingId]?.trim();
    if (f.changeRequest && !f.changeRequest.response && answer) {
      f.changeRequest.response = answer;
      f.changeRequest.respondedAt = now;
    }
  });
  const stillWaiting = doc.findings.some(
    (f) => f.disposition === "pending" && f.changeRequest && !f.changeRequest.response,
  );
  if (!stillWaiting) {
    doc.status = doc.advocate ? "under_review" : "pending_review";
    doc.version += 1;
    // The client's answers complete a round and the next draft goes back to
    // the advocate: that is a hand-off.
    recordVersion(doc, "client_response");
  }
  return structuredClone(doc);
}

/**
 * A blocked source is never re-labelled verified. Withdrawing it records
 * that the finding no longer relies on it, with the advocate's reasoning,
 * and the citation stays on the record as blocked.
 */
export async function withdrawCitation(
  docId: string,
  findingId: string,
  citationId: string,
  note: string,
  advocateName: string,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not withdraw this source.");
  }
  const { doc, finding } = findFinding(docId, findingId);
  const citation = finding.citations.find((c) => c.id === citationId);
  if (!citation) throw new MockApiError("Citation not found.");
  if (citation.status !== "blocked") {
    throw new MockApiError("Only a blocked source can be withdrawn.");
  }
  citation.withdrawn = {
    note,
    at: new Date().toISOString(),
    by: advocateName,
  };
  return structuredClone(doc);
}

export async function updateFinding(
  docId: string,
  findingId: string,
  patch: Pick<Finding, "disposition" | "overrideNote">,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not save this finding.");
  }
  const { doc, finding } = findFinding(docId, findingId);
  if (
    patch.disposition !== "pending" &&
    finding.citations.some((c) => c.status === "blocked" && !c.withdrawn)
  ) {
    throw new MockApiError(
      "This finding's source is blocked. Withdraw it or resolve it before settling.",
    );
  }
  finding.disposition = patch.disposition;
  finding.overrideNote = patch.overrideNote;
  finding.resolvedAt =
    patch.disposition === "pending" ? null : new Date().toISOString();
  return structuredClone(doc);
}

export async function addFinding(
  docId: string,
  finding: Finding,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not add this finding.");
  }
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  doc.findings = [...doc.findings, finding];

  // Attach it to the clause it names, so an advocate-added finding is a
  // margin note like any other rather than floating free of the document.
  // If the reference names no clause in this contract the finding still
  // stands; the workspace lists it separately instead of losing it.
  const clause = doc.clauses.find(
    (c) => c.number === clauseNumberFromReference(finding.clauseReference),
  );
  if (clause && !clause.findingIds.includes(finding.findingId)) {
    clause.findingIds.push(finding.findingId);
  }

  return structuredClone(doc);
}

export async function signOffDocument(
  docId: string,
): Promise<ContractDocument> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not complete sign-off.");
  }
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  if (!doc.advocate) {
    throw new MockApiError("A document must be claimed before it is signed off.");
  }
  if (doc.findings.some((f) => f.disposition === "pending")) {
    throw new MockApiError("Every finding must be settled before sign-off.");
  }
  // A citation is either verified or blocked, never "probably fine". The
  // sign-off screen disables its control over this too, but the rule
  // belongs here as well: a UI-only guard is not a guard.
  if (
    doc.findings.some((f) =>
      f.citations.some((c) => c.status === "blocked" && !c.withdrawn),
    )
  ) {
    throw new MockApiError(
      "A citation on this document is blocked. Resolve the source before sign-off.",
    );
  }
  doc.status = "settled";
  doc.settledAt = new Date().toISOString();
  if (doc.executionSteps.length === 0) {
    doc.executionSteps = buildExecutionSteps(doc);
  }
  return structuredClone(doc);
}

/**
 * A tick on a legal execution step says who and when, and can be taken
 * back. Undoing it clears both rather than leaving a stale name behind.
 */
export async function toggleExecutionStep(
  docId: string,
  kind: ExecutionStep["kind"],
  complete: boolean,
  actorName: string,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not update the checklist.");
  }
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  const step = doc.executionSteps.find((s) => s.kind === kind);
  if (step) {
    step.complete = complete;
    step.completedAt = complete ? new Date().toISOString() : null;
    step.completedBy = complete ? actorName : null;
  }
  const applicable = doc.executionSteps.filter((s) => s.applicable);
  if (doc.status === "settled" && applicable.every((s) => s.complete)) {
    doc.status = "executed";
  } else if (doc.status === "executed" && !applicable.every((s) => s.complete)) {
    doc.status = "settled";
  }
  return structuredClone(doc);
}

/** The preview keeps the file name only. Nothing is uploaded anywhere. */
export async function attachEvidence(
  docId: string,
  kind: ExecutionStep["kind"],
  fileName: string | null,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not attach this file.");
  }
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  const step = doc.executionSteps.find((s) => s.kind === kind);
  if (step) {
    step.evidence = fileName
      ? { name: fileName, attachedAt: new Date().toISOString() }
      : null;
  }
  return structuredClone(doc);
}
