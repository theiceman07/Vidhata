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
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { recheckCitation, recheckFindings } from "@/lib/citations";
import { declaredConflictWith } from "@/lib/conflicts";
import { blockingCitations, settleNeedsNote } from "@/lib/findings";
import { esignatureStep } from "@/lib/config/esign";
import { TIER_PRICING } from "@/lib/config/pricing";
import { revisionBlockedReason, revisionCycle } from "@/lib/revisions";
import { assignReviewTier } from "@/lib/triage";
import { declaredConflictNames } from "./advocate";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { register, restored } from "./state";

// QA 7.3: tier ordering used to sort the advocate queue, so the pricing
// page's "Priority turnaround" claim (Enhanced/Senior tiers) is backed by
// real routing behaviour instead of being decorative copy.
const TIER_PRIORITY: Record<ReviewTier, number> = {
  senior: 0,
  enhanced: 1,
  standard: 2,
};

/**
 * Whether a document has been released to the advocate side: screened and
 * paid for. Everything an advocate can read (the queue, a link to a review,
 * a claim) goes through this, so an unpaid or unscreened document is not
 * there for them, and is no part of any count built from the queue.
 */
export function isReleased(doc: Pick<ContractDocument, "status">): boolean {
  return (
    doc.status !== "draft" &&
    doc.status !== "analysing" &&
    doc.status !== "awaiting_payment"
  );
}

// A document with no tier has not been screened, so it is not in the queue
// yet; it sorts last rather than ahead of work that is.
export function getQueuePriority(doc: ContractDocument): number {
  return doc.tier ? TIER_PRIORITY[doc.tier] : Object.keys(TIER_PRIORITY).length;
}

// The checklist of a generated document carries no figure and no rule. Stamp
// duty varies by state and instrument, and registration turns on rules that
// have not been built from an audited schedule, so neither is stated here: the
// advocate confirms both. The e-signature step is the same for a generated
// document and a fixture, and it is built in one place (lib/config/esign.ts).
// A figure appears only on a fixture an advocate has confirmed.
function buildExecutionSteps(doc: ContractDocument): ExecutionStep[] {
  return [
    {
      kind: "stamping",
      applicable: true,
      headline: "Stamp duty: confirmed by your advocate",
      detail:
        "Stamp duty depends on the state of execution and the instrument. Your advocate confirms the amount before you sign.",
      reason: `Stamp duty depends on the state of execution (${doc.stateOfExecution}) and the instrument.`,
      instructions: [
        "Your advocate confirms the amount before you sign.",
        "Pay it as your advocate confirms, and attach the certificate here as proof.",
        "Have both signatories sign the settled document.",
      ],
      complete: false,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
    {
      kind: "registration",
      applicable: true,
      headline: "Registration: confirmed by your advocate",
      detail: "Your advocate confirms whether registration applies.",
      reason: "Whether registration applies is confirmed by your advocate.",
      instructions: [
        "Your advocate confirms whether registration applies.",
        "If it does, complete it as your advocate directs and attach the receipt here.",
        "Mark this step complete when your advocate has confirmed it and, if it applies, it is done.",
      ],
      complete: false,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
    esignatureStep(doc.type),
  ];
}

// In-memory mutable store so adjudication/claim/sign-off actions persist
// for the duration of the tab. Resets on reload — there is no backend yet.
let store: ContractDocument[] = restored("documents");
register("documents", () => store);

// Snapshots of drafts as they were handed on. They are written at hand-off
// points only (see DocumentVersion), never on every edit, and kept apart from
// the documents so list and queue reads stay light. Documents seeded before
// snapshots existed have none.
const versionStore: DocumentVersion[] = restored("versions");
register("versions", () => versionStore);

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

  // Screening is done and the tier is known, so the client now pays the fixed
  // fee. Only a paid document is released to the advocate queue.
  doc.status = "awaiting_payment";
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
 *   every client used to see every tenant's documents on one dashboard), and
 *   returns every document the client has, whatever its state.
 *   Omitted for the advocate queue, which is intentionally cross-org: an
 *   advocate must see documents from every client company, and only the ones
 *   released to the queue. A document still awaiting payment is not in any
 *   advocate-facing read, so it is in no count or metric built from one.
 */
export async function listDocuments(
  orgId?: string,
): Promise<ContractDocument[]> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your documents.");
  }
  reconcileAll();
  const scoped = orgId
    ? store.filter((d) => d.orgId === orgId)
    : store.filter(isReleased);
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
 * A document as an advocate may read it. One that is missing and one that has
 * not been released to the queue both come back as null, so an advocate who
 * follows a link to an unpaid document cannot tell it exists.
 */
export async function getDocumentForReview(
  id: string,
): Promise<ContractDocument | null> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load this document.");
  }
  const doc = store.find((d) => d.id === id);
  if (!doc) return null;
  reconcileAnalysis(doc);
  return isReleased(doc) ? structuredClone(doc) : null;
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
 * The client pays the fixed fee, and the document is released to the advocate
 * queue. The fee is one flat amount for the tier screening assigned, before
 * GST, and it covers every revision round.
 *
 * Paying twice is not possible: a document that has been paid for comes back
 * as it is, so a double click makes one payment. A failure leaves the
 * document awaiting payment, nothing recorded, and the client can try again.
 */
export async function payFee(id: string): Promise<ContractDocument> {
  await randomDelay(400, 800);
  const doc = store.find((d) => d.id === id);
  if (!doc) throw new MockApiError("Document not found.");
  if (doc.payment) return structuredClone(doc);
  if (doc.status !== "awaiting_payment" || !doc.tier) {
    throw new MockApiError("This document is not awaiting payment.");
  }
  if (shouldSimulateFailure()) {
    throw new MockApiError("The payment did not go through. Nothing was charged. Try again.");
  }
  doc.payment = {
    amount: TIER_PRICING[doc.tier].amount,
    paidAt: new Date().toISOString(),
  };
  doc.status = "pending_review";
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

  // Only a released document can be claimed. An unpaid one is refused as if
  // it were not there, so a claim cannot show that it exists.
  if (!isReleased(doc)) throw new MockApiError("Document not found.");

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

/**
 * The one gate every advocate write goes through.
 *
 * An unreleased document is refused exactly as a missing one is, so a write
 * cannot show that it exists. Then the caller must be the advocate who holds
 * the claim: the screen shows decision controls only to the holder, and that
 * is not a guard, so it is held here as well.
 */
function heldDocument(docId: string, advocateId: string): ContractDocument {
  const doc = store.find((d) => d.id === docId);
  if (!doc || !isReleased(doc)) throw new MockApiError("Document not found.");
  if (!doc.advocate) {
    throw new MockApiError("Claim this document before you decide anything on it.");
  }
  if (doc.advocate.id !== advocateId) {
    throw new MockApiError(`${doc.advocate.name} holds this document.`);
  }
  return doc;
}

function findFinding(docId: string, findingId: string, advocateId: string) {
  const doc = heldDocument(docId, advocateId);
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
  advocate: { id: string; name: string },
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send this request.");
  }
  const { doc, finding } = findFinding(docId, findingId, advocate.id);
  // The limit holds whatever the screen offered (FR-20). It stops a round
  // being started past it; it never stops sign-off.
  const blocked = revisionBlockedReason(revisionCycle(doc));
  if (blocked) throw new MockApiError(blocked);

  const now = new Date().toISOString();
  finding.changeRequest = {
    request,
    requestedAt: now,
    requestedBy: advocate.name,
    response: null,
    respondedAt: null,
  };
  // Sending it back is what the cycle count counts, so a second request in
  // the same round does not add another.
  const startsRound = doc.status !== "revision";
  if (startsRound) doc.revisionCount += 1;
  doc.status = "revision";
  // The round that uses the last of them logs the case, once.
  if (revisionCycle(doc).reached && !doc.corpusReviewLoggedAt) {
    doc.corpusReviewLoggedAt = now;
  }
  // Sending a draft back is a hand-off, so it is a snapshot: the draft as the
  // advocate handed it on, with every decision made so far and the request.
  // Without it a finding decided before the send-back is in no snapshot, and
  // the next review could not tell it from one decided since. A second
  // request in the same round is not another hand-off.
  if (startsRound) {
    doc.version += 1;
    recordVersion(doc, "advocate_revision");
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
  advocate: { id: string; name: string },
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not withdraw this source.");
  }
  const { doc, finding } = findFinding(docId, findingId, advocate.id);
  const citation = finding.citations.find((c) => c.id === citationId);
  if (!citation) throw new MockApiError("Citation not found.");
  if (citation.status !== "blocked") {
    throw new MockApiError("Only a blocked source can be withdrawn.");
  }
  // A withdrawal is a decision about the finding, and it is on the record with
  // its reasoning. Without the reasoning there is nothing to record.
  const reasoning = note.trim();
  if (!reasoning) throw new MockApiError("Record why the finding stands without this source.");
  citation.withdrawn = {
    note: reasoning,
    at: new Date().toISOString(),
    by: advocate.name,
  };
  return structuredClone(doc);
}

export async function updateFinding(
  docId: string,
  findingId: string,
  patch: Pick<Finding, "disposition" | "overrideNote">,
  advocateId: string,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not save this finding.");
  }
  const { doc, finding } = findFinding(docId, findingId, advocateId);
  const note = patch.overrideNote?.trim() || null;
  if (patch.disposition !== "pending") {
    if (blockingCitations(finding).length > 0) {
      throw new MockApiError(
        "This finding's source is blocked. Withdraw it or resolve it before settling.",
      );
    }
    // A finding without a verified source is an opinion. An advocate's judgment
    // is the product, so it can be settled, but only with the reasoning written
    // down.
    if (settleNeedsNote(finding) && !note) {
      throw new MockApiError(
        "No verified source remains, so settling needs your reasoning on the record.",
      );
    }
  }
  finding.disposition = patch.disposition;
  finding.overrideNote = patch.disposition === "pending" ? null : note;
  finding.resolvedAt =
    patch.disposition === "pending" ? null : new Date().toISOString();
  return structuredClone(doc);
}

export async function addFinding(
  docId: string,
  finding: Finding,
  advocateId: string,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not add this finding.");
  }
  const doc = heldDocument(docId, advocateId);
  if (doc.findings.some((f) => f.findingId === finding.findingId)) {
    throw new MockApiError("This finding is already on the record.");
  }

  // What the caller says about a citation's standing, or about the finding's
  // own, is not taken. The corpus decides each citation's status, a withdrawal
  // is the advocate's decision on a finding that is already on the record, and
  // a finding added in review enters it open and marked as added by an advocate.
  const entered: Finding = {
    ...finding,
    source: "advocate",
    disposition: "pending",
    overrideNote: null,
    resolvedAt: null,
    changeRequest: null,
    citations: finding.citations.map((c) => recheckCitation({ ...c, withdrawn: null })),
  };
  doc.findings = [...doc.findings, entered];

  // Attach it to the clause it names, so an advocate-added finding is a
  // margin note like any other rather than floating free of the document.
  // If the reference names no clause in this contract the finding still
  // stands; the workspace lists it separately instead of losing it.
  const clause = doc.clauses.find(
    (c) => c.number === clauseNumberFromReference(entered.clauseReference),
  );
  if (clause && !clause.findingIds.includes(entered.findingId)) {
    clause.findingIds.push(entered.findingId);
  }

  return structuredClone(doc);
}

export async function signOffDocument(
  docId: string,
  advocateId: string,
): Promise<ContractDocument> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not complete sign-off.");
  }
  const doc = heldDocument(docId, advocateId);
  // Signed off once. A second press changes nothing, and the date stays.
  if (doc.status === "settled" || doc.status === "executed") return structuredClone(doc);

  // The gate runs once more on every citation on the record, so what is signed
  // off is what the corpus says now, not what it said when each was last
  // looked at. A withdrawal is the advocate's decision and survives it.
  doc.findings = recheckFindings(doc.findings);
  if (doc.findings.some((f) => f.disposition === "pending")) {
    throw new MockApiError("Every finding must be settled before sign-off.");
  }
  // A citation is either verified or blocked, never "probably fine". The
  // sign-off screen disables its control over this too, but the rule
  // belongs here as well: a UI-only guard is not a guard.
  if (doc.findings.some((f) => blockingCitations(f).length > 0)) {
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
    doc.executedAt = new Date().toISOString();
  } else if (doc.status === "executed" && !applicable.every((s) => s.complete)) {
    doc.status = "settled";
    doc.executedAt = null;
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
