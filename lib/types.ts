import type { AuditEntry } from "@/lib/audit";
import type { ClauseChangeKind, FindingChangeKind } from "@/lib/diff";

export type DocumentStatus =
  | "draft" // intake done, pipeline not run
  | "analysing" // pipeline running
  | "awaiting_payment" // screened and tiered; the client has not paid the fee
  | "pending_review" // in the advocate queue (paid)
  | "under_review" // an advocate has picked it up
  | "revision" // advocate asked for changes
  | "settled" // signed off
  | "executed"; // client confirmed stamping and signature

export type ReviewTier = "standard" | "enhanced" | "senior";
export type Severity = "high" | "medium" | "low";
export type FindingSource = "pipeline" | "advocate";
export type PipelineLayer = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Citation {
  id: string;
  text: string; // "Indian Contract Act, 1872, s.27"
  status: "verified" | "blocked";
  corpusRef: string | null; // null when blocked
  /**
   * A blocked citation stays blocked: it is never promoted to verified by
   * anything but a corpus match. An advocate may instead withdraw it, which
   * records that the finding no longer relies on it. The citation remains
   * on the record with the reasoning attached.
   */
  withdrawn: { note: string; at: string; by: string } | null;
}

/**
 * An advocate asking the client for something before a finding can be
 * settled: a confirmation, a document, a commercial decision. This is what
 * "changes requested" means, so the client always sees exactly what was
 * asked, on which clause, and by whom.
 */
export interface ChangeRequest {
  request: string;
  requestedAt: string;
  requestedBy: string;
  response: string | null;
  respondedAt: string | null;
}

/**
 * A numbered clause of the contract. The document body exists so that a
 * finding can be what it actually is — a note in the margin of a clause —
 * rather than a tile in a dashboard.
 *
 * Backend note: clauses are a detail-page concern. List and queue
 * endpoints must not return them. See Dashboard_Data_Spec.md.
 */
export interface Clause {
  id: string;
  /** "7.1". Joins to Finding.clauseReference ("Clause 7.1"). */
  number: string;
  heading: string; // "Termination"
  /** Full prose. Paragraphs are separated by a blank line. */
  body: string;
  /** Finding.findingId values raised against this clause. */
  findingIds: string[];
  /** ISO timestamp, set when an advocate revises the wording. */
  revisedAt: string | null;
}

/** "Clause 7.1" -> "7.1". The join between a finding and its clause. */
export function clauseNumberFromReference(reference: string): string {
  return reference.replace(/^clause\s+/i, "").trim();
}

export interface Finding {
  findingId: string;
  /**
   * The document's own number for this finding ("04"), given by the API when
   * the finding is raised: one more than the highest the document has ever
   * numbered, in any draft. Unique within the document, kept across its drafts
   * and never reused. It is stored and not worked out from the finding's place
   * in a list, so filtering or reordering a list cannot move it.
   */
  number: string;
  /**
   * The number a client reads this finding by, given by the API when the
   * client first may know of it: a pipeline finding when the first pass is
   * handed on, an advocate-added one when a request is addressed to them or
   * at sign-off. Null until then. It counts only what the client has been
   * shown, so there is never a gap that says something was kept from them, and
   * it never changes once given. A client names a finding by this, and by
   * nothing else.
   */
  clientNumber: string | null;
  /**
   * Who raised it. "advocate" is a finding the first pass missed, added in
   * review. The addition and override metrics read this, so it is a field
   * and never inferred from the rule id.
   */
  source: FindingSource;
  layer: PipelineLayer;
  severity: Severity;
  clauseReference: string; // "Clause 7.2"
  clauseText: string; // the quoted span
  description: string;
  ruleApplied: string; // "ICA-S27-NONCOMPETE-V2"
  remedySuggested: string;
  citations: Citation[];
  disposition: "pending" | "confirmed" | "overridden";
  overrideNote: string | null;
  /** ISO timestamp of the advocate's decision. Null while open. */
  resolvedAt: string | null;
  changeRequest: ChangeRequest | null;
}

/**
 * A finding as an advocate adds it. Its numbers are not the caller's to give:
 * the API numbers it (lib/numbering.ts), so what is sent has none.
 */
export type NewFinding = Omit<Finding, "number" | "clientNumber">;

export interface ExecutionStep {
  kind: "stamping" | "registration" | "esignature";
  applicable: boolean;
  headline: string; // "Stamp duty: confirmed by your advocate"; a figure only on a fixture
  detail: string;
  reason: string; // why it does or does not apply
  instructions: string[];
  complete: boolean;
  /** Set together with complete, so a tick always says who and when. */
  completedAt: string | null;
  completedBy: string | null;
  /** The file the client attached as proof. Name only in the preview. */
  evidence: { name: string; attachedAt: string } | null;
}

/**
 * One line of a settled document's plain-language summary.
 *
 * It says what the settled text says and nothing about what the reader should
 * do. `clauses` are the clause numbers it rests on, so a line can be checked
 * against the text it explains. A line about something the document does not
 * contain cites no clause.
 */
export interface SummaryItem {
  label: string;
  text: string;
  clauses: string[];
}

/**
 * A summary of one settled draft. `draft` is the draft it was written from: a
 * summary is shown only while the document's head is still that draft.
 */
export interface SettledSummary {
  documentId: string;
  draft: number;
  items: SummaryItem[];
}

/**
 * What a client is handed once a document is settled: the recorded sign-off,
 * the summary where one exists, and how far the execution checklist has got.
 * It exists only for a document with a recorded advocate sign-off.
 */
export interface Delivery {
  documentId: string;
  title: string;
  counterparty: string;
  status: "settled" | "executed";
  signOff: SignOffRecord;
  summary: SettledSummary | null;
  checklist: { done: number; total: number };
}

/**
 * What asking for a delivery can come back as. Before sign-off the answer is
 * only that: nothing about the document, the advocate or the summary.
 */
export type DeliveryResult = { state: "not_available" } | { state: "ready"; delivery: Delivery };

/**
 * What asking for a summary can come back as. Three states, and the first two
 * carry nothing about the content: a document that is not signed off says only
 * that, and a signed-off one with no summary says only that.
 */
export type SummaryResult =
  | { state: "not_available" }
  | { state: "none" }
  | { state: "ready"; summary: SettledSummary };

/**
 * The advocate's recorded sign-off: who, under which Bar enrolment, and when.
 * It is the only place a client meets the advocate. Before sign-off a client
 * is never told who holds their document, so no client type carries a name or
 * an enrolment anywhere else.
 */
export interface SignOffRecord {
  advocate: string;
  enrolment: string;
  at: string;
}

export interface ContractDocument {
  id: string;
  title: string;
  type: "nda" | "vendor" | "msa" | "employment";
  status: DocumentStatus;
  /**
   * Assigned by screening (lib/triage.ts) once the first pass has run, not
   * chosen by the client. Null until then.
   */
  tier: ReviewTier | null;
  // Mock-layer tenant scoping key (QA 3.5). Set from the session's org at
  // creation time; the client dashboard filters on it. Presentation-only,
  // like everything else in lib/session — a real backend must re-derive
  // this from the authenticated subject, never trust a client-sent value.
  orgId: string;
  clientName: string;
  counterpartyName: string;
  stateOfExecution: string;
  transactionValue: number;
  counterpartyIsMsme: boolean;
  durationMonths: number;
  governingLaw: string;
  keyTerms: string | null;
  createdAt: string;
  /**
   * Draft number. The first pass produces draft 1; each round of client
   * responses to requested changes produces the next.
   */
  version: number;
  /**
   * How many times the advocate has sent the document back for changes. It
   * rises when a document first enters "revision", not on every request in
   * the same round, so it is the number a cycle limit is checked against.
   */
  revisionCount: number;
  /** When the advocate claimed it. Null while unclaimed. */
  claimedAt: string | null;
  /**
   * When the advocate declared they have no conflict with either party. It
   * is made at the moment of claiming and recorded with the claim, so a
   * claim without one is not a claim the product can make.
   */
  conflictDeclaredAt?: string | null;
  /**
   * The fixed fee for this document, paid before it reaches an advocate. One
   * flat amount by tier, covering every revision round, in rupees before GST.
   * Absent until paid. A document with no payment is not released to the
   * advocate queue (isReleased in lib/api/documents.ts).
   */
  payment?: { amount: number; paidAt: string };
  /**
   * When the revision limit was reached and the case was logged for corpus
   * review (FR-20). Set once, when the last round is sent; null or absent
   * until then. Whether a limit has been reached is read from revisionCount
   * (lib/revisions.ts), and this is the record that it was logged.
   */
  corpusReviewLoggedAt?: string | null;
  /**
   * The advocate's notes to the client, one per clause at most. Held by the
   * advocate who holds the document, and the advocate's alone until sign-off
   * releases the ones marked to share. Not the working notes in the margin
   * (AdvocateNote), which are a different kind and never leave the advocate
   * portal. No client type names this field, so nothing hands it to a client:
   * the client reads what was released through lib/api/client only.
   */
  settlementNotes?: SettlementNote[];
  settledAt: string | null;
  /**
   * When the client confirmed the last applicable execution step, so the
   * document became executed. Cleared if a step is taken back. The trail reads
   * it; nothing else should infer it from the steps.
   */
  executedAt?: string | null;
  // ISO timestamp the in-flight analysis resolves at, or null when not
  // analysing. Durable across navigation (QA 4.5) — lib/api/documents.ts
  // reconciles this on every read instead of relying on a component timer.
  analysisCompletesAt: string | null;
  advocate: { id: string; name: string; bar: string } | null;
  /**
   * The document body. Required, not optional: a detail response without
   * clauses has no document to annotate, and the workspace would render
   * empty. List endpoints return a different, lighter shape.
   */
  clauses: Clause[];
  findings: Finding[];
  executionSteps: ExecutionStep[];
}

export type VersionCreatedBy =
  | "first_pass"
  | "client_response"
  | "advocate_revision";

/**
 * A draft as it stood when it was handed on.
 *
 * Snapshots are written at hand-off points only: the first pass finishes,
 * the client's answers complete a round, or the advocate sends a revision
 * back. They are immutable. ContractDocument is the working copy and moves
 * on between hand-offs (findings are added, dispositions are recorded), so
 * the head and the latest snapshot can disagree. Diffs therefore compare
 * snapshots, never the head, except the advocate's re-review
 * (lib/reviewScope.ts), which shows the head against the draft before the
 * current one. A draft's own snapshot equals the head at hand-off, so
 * comparing against the latest would show nothing.
 *
 * Backend note: like clauses, snapshots are a detail-page concern. List and
 * queue endpoints must not return them.
 */
export interface DocumentVersion {
  documentId: string;
  /** The draft number, as "Draft 2" is shown. */
  number: number;
  createdAt: string;
  createdBy: VersionCreatedBy;
  /**
   * When the full pipeline last ran for this draft. It runs again on every
   * revision, so a citation state here is what that run found, never a copy
   * of the one before.
   */
  pipelineRunAt: string;
  clauses: Clause[];
  findings: Finding[];
}

/*
 * Client-shaped types.
 *
 * PROPOSAL, not agreed with the backend team. See
 * docs/superpowers/plans/2026-10-04-client-shaped-api.md. These are what a
 * client may be handed, so a client screen cannot be given a field it may not
 * see: the type it receives does not have the field.
 *
 * They are derived with Pick, never Omit, so a field added to an internal type
 * is private to the client until someone adds it here on purpose. The test in
 * lib/clientTypes.test.ts holds the restricted keys out of every one.
 *
 * Nothing builds these yet. The shapers that do are phase 2, and no screen
 * reads them until phase 3.
 */

/** The facts of the deal, as the client stated them. */
export type ClientDeal = Pick<
  ContractDocument,
  | "clientName"
  | "counterpartyName"
  | "stateOfExecution"
  | "transactionValue"
  | "counterpartyIsMsme"
  | "durationMonths"
  | "governingLaw"
  | "keyTerms"
>;

/**
 * A clause as the client reads it. No finding ids and no revision time: a
 * client reaches a clause's findings through the clause reference.
 */
export type ClientClause = Pick<Clause, "number" | "heading" | "body">;

/**
 * An advocate's request to the client, without the advocate. Before sign-off
 * the client is told "your advocate", never a name.
 */
export type ClientChangeRequest = Pick<
  ChangeRequest,
  "request" | "requestedAt" | "response" | "respondedAt"
>;

/**
 * A source as the client reads it. Whether it was withdrawn is said; the
 * advocate's note on the withdrawal is not.
 */
export type ClientCitation = Pick<Citation, "id" | "text" | "status" | "corpusRef"> & {
  withdrawn: boolean;
};

/** What a client reads of a finding once the record is theirs, after sign-off. */
export type ClientFindingDetail = Pick<
  Finding,
  "severity" | "description" | "remedySuggested" | "disposition"
> & {
  citations: ClientCitation[];
  /**
   * Present, and true, only for a finding the advocate added, and only while
   * SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF is on. When the switch is off the field
   * is absent, so narrowing the setting never changes the type.
   */
  advocateAdded?: true;
};

/**
 * A finding as the client reads it.
 *
 * The list holds what the client may know of: the findings the first pass
 * raised, and an advocate-added one only once a request is addressed to them
 * (or, after sign-off, whatever the switch allows). Before sign-off a finding
 * is its number, its clause reference and, where a request is addressed to
 * them, its passage and that request; `detail` is null. After sign-off the
 * passage and `detail` are set. Never a rule id, a layer, a source, an override
 * note or a resolution time.
 */
export interface ClientFinding extends Pick<Finding, "clauseReference"> {
  /**
   * The quoted passage. Null before sign-off unless a request is addressed to
   * the client about it: the passage is the draft's own wording.
   */
  clauseText: string | null;
  /**
   * "04". The one reference a client has to a finding: what they read, what
   * they answer by, and what a list keys on. Unique within a document and
   * stable across its drafts. There is no second id. The server finds the
   * finding by (document, number) and checks a request was addressed to this
   * client, so a finding they were not asked about cannot be answered or
   * probed (decided 4 October, question 5 in the plan).
   */
  number: string;
  request: ClientChangeRequest | null;
  detail: ClientFindingDetail | null;
}

/**
 * A document as a client reads it.
 *
 * The advocate appears only as `signOff`. The fee appears nowhere: the document
 * describes the contract and its review state, and money belongs to invoices
 * and to the tier's price (lib/config/pricing.ts), so `paidAt` says that it was
 * paid and never how much. The list is `findingList`, not `findings`, because
 * client code must never read a document's own findings.
 */
export interface ClientDocument
  extends Pick<
    ContractDocument,
    "id" | "title" | "type" | "status" | "tier" | "version" | "createdAt" | "claimedAt" | "executedAt"
  > {
  deal: ClientDeal;
  /** When the fee was paid. Null until it is. Never the amount. */
  paidAt: string | null;
  /** Null until the advocate has signed off. */
  signOff: SignOffRecord | null;
  /**
   * Before sign-off: only the clauses behind requests addressed to the client.
   * After: every clause, read-only.
   */
  clauses: ClientClause[];
  /** Clauses not shown, only counted. Always zero after sign-off. */
  otherClauseCount: number;
  /**
   * What the first pass raised. Findings an advocate added are not counted, so
   * this reads the same whatever the advocate has done since.
   */
  findingCount: number;
  findingList: ClientFinding[];
  /** After sign-off only. Empty before. */
  executionSteps: ExecutionStep[];
  /** After sign-off only: applicable steps done, and in all. Zero before. */
  checklist: { done: number; total: number };
}

/**
 * A document as the client's list reads it. A list is not a detail page: it
 * carries no clauses, no findings and no checklist steps, only what the
 * dashboard shows of each, as counts.
 */
export interface ClientDocumentSummary
  extends Pick<
    ClientDocument,
    | "id"
    | "title"
    | "type"
    | "status"
    | "tier"
    | "version"
    | "createdAt"
    | "claimedAt"
    | "executedAt"
    | "paidAt"
    | "signOff"
    | "findingCount"
    | "checklist"
  > {
  counterpartyName: string;
  /** Requests addressed to the client that they have not yet answered. */
  openRequests: number;
  /** When the latest request to the client was sent. Null when there has been none. */
  latestRequestAt: string | null;
}

/** One draft in the client's version list. Counts only; never the draft. */
export interface ClientVersionRow {
  number: number;
  /** "Draft 3 (current)" for the latest snapshot, "Draft 2" for the rest. */
  label: string;
  current: boolean;
  createdAt: string;
  madeBy: string;
  clauseCount: number;
  /** Counted through the client's own findings, never from the raw ones. */
  findingCount: number;
}

export type ClientVersionList = ClientVersionRow[];

export interface ClientClauseRow {
  number: string;
  heading: string;
  kind: ClauseChangeKind;
  before: string | null;
  after: string | null;
}

export interface ClientFindingRow {
  /** "04", as the client's own list numbers it. */
  number: string;
  clauseReference: string;
  kind: FindingChangeKind;
  /** Plain wording for the change. */
  change: string;
  /** The first pass's own words. After sign-off only. */
  description: string | null;
  /**
   * The advocate's decision, in a word. After sign-off only. The advocate's
   * own note on it is deliberately not shown to the client. That is a
   * judgment for now, not a permanent rule: the same notes ground the chat
   * agent, so revisit whether the client may read them once that is settled.
   */
  disposition: Finding["disposition"] | null;
  /** Said only once the record is the client's to read in full, and the switch is on. */
  advocateAdded: boolean;
}

/** What changed between two drafts, for the client. */
export interface ClientDiff {
  from: number;
  to: number;
  fromLabel: string;
  toLabel: string;
  signedOff: boolean;
  /** Clauses shown with their text. */
  clauses: ClientClauseRow[];
  /** Clauses not shown, only counted. Always zero after sign-off. */
  otherClauses: Record<ClauseChangeKind, number>;
  /** Findings shown as rows. Named for what they are, not "findings". */
  findingRows: ClientFindingRow[];
  /** Over every finding the client may know about, shown or not. */
  findingCounts: { new: number; stillOpen: number; resolved: number };
}

/**
 * One line of the client's activity trail. It says that a draft was revised
 * without saying where, except for a clause a request to them is about. Before
 * sign-off the advocate is "Advocate", never a name. No entry about the
 * advocate's own working is in it.
 */
export type ClientAuditEntry = Omit<AuditEntry, "advocateOnly" | "afterSignOff" | "findingId"> & {
  /** The finding the entry concerned, by its number. Never its id. */
  findingNumber: string | null;
};

/**
 * One fee paid, as billing reads it. It is derived from the payment a
 * document carries and never stored a second time (lib/billing.ts), so it
 * cannot drift from the record. Amounts are rupees before GST.
 *
 * A document fee and a consultation fee are separate kinds with separate
 * labels: the platform's revenue is a flat technology fee, and a
 * consultation is a service by the advocate's own entity.
 */
export interface Invoice {
  /** "VID-2026-0001", numbered in the order paid. */
  number: string;
  issuedAt: string;
  kind: "document_fee" | "consultation_fee";
  documentId: string;
  /** What was paid for: the document's title. */
  description: string;
  tier: ReviewTier | null;
  amount: number;
}

/**
 * A source as the shared workspace reads it. That it was withdrawn is always
 * there. Who withdrew it, when and why are the advocate's record, so they may be
 * absent: a client is told a source was withdrawn and never by whom or why.
 */
export interface WorkspaceCitation extends Pick<Citation, "id" | "text" | "status" | "corpusRef"> {
  withdrawn: { at?: string; by?: string; note?: string } | null;
}

/**
 * A finding as the shared workspace reads it, for either portal. The advocate's
 * working (the rule and layer behind it, the override note, when it was decided
 * and who asked for a change) is optional: an advocate's record has it and a
 * client's never does, so a client's document is built without it and the type
 * does not ask for it. The workspace shows it only to an advocate.
 */
export interface WorkspaceFinding
  extends Pick<
    Finding,
    | "findingId"
    | "source"
    | "severity"
    | "clauseReference"
    | "clauseText"
    | "description"
    | "remedySuggested"
    | "disposition"
  > {
  citations: WorkspaceCitation[];
  changeRequest: (Omit<ChangeRequest, "requestedBy"> & { requestedBy?: string }) | null;
  ruleApplied?: string;
  layer?: PipelineLayer;
  overrideNote?: string | null;
  resolvedAt?: string | null;
}

/**
 * A document as the shared workspace reads it. The advocate's own record
 * (ContractDocument) satisfies it, and a client's is built to it from what a
 * client is handed (lib/client-workspace.ts), so the workspace can be given
 * nothing of the organisation, the claim or the advocate's identity by a client.
 */
export interface WorkspaceDocument
  extends Pick<
    ContractDocument,
    | "id"
    | "title"
    | "type"
    | "status"
    | "tier"
    | "clientName"
    | "counterpartyName"
    | "version"
    | "clauses"
    | "executionSteps"
  > {
  findings: WorkspaceFinding[];
  /** Named for the document, once there is one. Never carries the advocate's id. */
  advocate: { name: string; bar: string } | null;
}

/**
 * A client's request to talk to the advocate who settled their document.
 *
 * It is free to make. The advocate accepts or declines. A decline is free and
 * is never chargeable. An accept sets the fee, one flat amount before GST and
 * separate from the platform's document fee, and money moves only when the
 * client pays it. The advocate answers only after that, and the client reads
 * the answer only once it is paid for.
 *
 * The question is the client's own words and may hold sensitive facts. It is
 * for the client and the advocate only, and the advocate reads it inside the
 * request itself, never in a list. It is never put in the audit trail, a
 * notification or a title or tooltip (a test holds those files to it). The
 * client's own export carries it, deliberately, because it is their data.
 */
export interface Consultation {
  id: string;
  documentId: string;
  /** The document's title when asked, so a list need not read the document. */
  documentTitle: string;
  orgId: string;
  clientName: string;
  /** The advocate who settled the document. Never chosen by the client. */
  advocateId: string;
  advocateName: string;
  question: string;
  status: "requested" | "accepted" | "declined" | "answered";
  requestedAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  /** Rupees before GST, set when the advocate accepts. Null until then. */
  fee: number | null;
  /** When the client paid it. The advocate sees only whether this is set. */
  paidAt: string | null;
  answer: string | null;
  answeredAt: string | null;
}

/**
 * A consultation as the client who made it reads it. The request, the fee they
 * pay and their answer, with the advocate named as the one who settled the
 * document. Not the advocate's id, not the organisation's id and not the
 * client's name: the request is theirs, and asking for it already says whose.
 */
export type ClientConsultation = Pick<
  Consultation,
  | "id"
  | "documentId"
  | "documentTitle"
  | "advocateName"
  | "question"
  | "status"
  | "requestedAt"
  | "acceptedAt"
  | "declinedAt"
  | "fee"
  | "paidAt"
  | "answer"
  | "answeredAt"
>;

/**
 * One update for the client, worked out from the state of their documents and
 * consultation requests. It is derived on each read and not stored, so it
 * cannot say more than what the client's own types hold: it carries no
 * advocate's name, no count of findings, no decision, no clause, and nothing
 * of what was asked or answered (lib/notifications.ts).
 */
export interface ClientNotification {
  /** Stable for the same update, so a list can key on it. */
  id: string;
  kind:
    | "awaiting_payment"
    | "with_advocate"
    | "advocate_asked"
    | "settled"
    | "consultation_accepted"
    | "consultation_declined"
    | "consultation_answered";
  /** ISO 8601, when it happened. */
  at: string;
  documentId: string;
  text: string;
  /** Where it opens, inside the client's own portal. */
  href: string;
}

/**
 * A consultation as the advocate reads it: the status, and only whether it is
 * paid. Never the fee, the time of payment or any card or payment detail.
 */
export type AdvocateConsultation = Omit<Consultation, "fee" | "paidAt"> & { paid: boolean };

/**
 * As the advocate's list shows it. It has no question, so a list cannot show
 * one: the question is read inside the request.
 */
export type ConsultationSummary = Omit<AdvocateConsultation, "question" | "answer">;

/**
 * One consultation the advocate answered, as their payout statement lists it:
 * the document it was about, the day it was answered, and the consultation fee,
 * in rupees before GST. In the preview that is the one configured fee; who sets
 * it and who receives it is for counsel to confirm. Nothing here comes from what the platform
 * charges for the document, and there is no split. It has no question, no
 * answer and no client, and no time or detail of the client's payment.
 */
export interface PayoutLine {
  consultationId: string;
  documentId: string;
  documentTitle: string;
  /** ISO 8601. */
  answeredAt: string;
  /** Rupees before GST. */
  amount: number;
}

/** An advocate's own lines, newest first, and their sum. Nobody else's. */
export interface PayoutStatement {
  lines: PayoutLine[];
  /** Rupees before GST, the sum of the lines. */
  total: number;
}

/**
 * What an advocate confirmed at onboarding about their enrolment. It is
 * private to the advocate and the platform: nothing public, ranked, rated or
 * searchable by a client is built from it.
 */
export interface AdvocateEnrolment {
  barEnrolmentNumber: string;
  stateBarCouncil: string;
  confirmedAt: string;
}

/** One change to the client's choice about training use, with when it was made. */
export interface ConsentEntry {
  at: string;
  /** True when training use was turned on, false when it was turned off. */
  granted: boolean;
}

/**
 * An organisation's privacy choices. Training use is off until the client
 * turns it on, and every change is logged with its time. The log is the proof
 * that a revocation happened, so it is kept when the rest is deleted.
 */
export interface PrivacyState {
  trainingOptIn: boolean;
  consentLog: ConsentEntry[];
  /** When a deletion was requested, or null. A request, never an erasure. */
  deletionRequestedAt: string | null;
}

/**
 * What a client may take with them: only what they may read on screen. A
 * document not yet signed off carries the passages behind requests addressed
 * to them and nothing else of the review. A preview file, said so inside it.
 */
export interface DataExport {
  preview: true;
  generatedAt: string;
  organisation: { name: string; gstin: string | null };
  documents: {
    id: string;
    title: string;
    agreement: string;
    counterparty: string;
    status: string;
    createdAt: string;
    draft: number;
    signedOff: { advocate: string; enrolment: string; at: string } | null;
    /** The settled text, only once signed off. */
    clauses: { number: string; heading: string; body: string }[];
    /** Before sign-off, only findings with a request addressed to the client. */
    findings: {
      number: string;
      clauseReference: string;
      /** The quoted passage. Null only if the client has none to read, which no shown finding lacks. */
      passage: string | null;
      /** The first pass's own words, and the advocate's disposition: after sign-off only. */
      description: string | null;
      disposition: "confirmed" | "overridden" | "pending" | null;
      request: {
        request: string;
        requestedAt: string;
        response: string | null;
        respondedAt: string | null;
      } | null;
    }[];
  }[];
  invoices: Invoice[];
  /**
   * The client's own questions to the advocate who settled a document, and the
   * answer once it is paid for.
   */
  consultationRequests: {
    document: string;
    advocate: string;
    requestedAt: string;
    status: "requested" | "accepted" | "declined" | "answered";
    question: string;
    answer: string | null;
  }[];
  trainingOptIn: boolean;
  consentLog: ConsentEntry[];
}

/** Who an organisation's invoices are made out to. */
export interface BillingProfile {
  name: string;
  /** Kept as the client typed it, trimmed. Never checked against a register. */
  gstin: string | null;
}

export const PIPELINE_DURATION_MS = 28000; // 7 layers × 4s each

export const PIPELINE_LAYERS: Record<
  PipelineLayer,
  { name: string; description: string }
> = {
  0: {
    name: "Intake and normalisation",
    description: "Structures the deal facts into a drafting brief.",
  },
  1: {
    name: "Completeness",
    description: "Checks the draft has every clause its contract type needs.",
  },
  2: {
    name: "Statutory compliance",
    description:
      "Checks the draft against Indian Contract Act s.27 and s.74 and MSMED payment terms. Stamp duty and registration are confirmed by your advocate.",
  },
  3: {
    name: "Cross-clause consistency",
    description:
      "Reads one clause against another, such as an uncapped indemnity against the liability cap, or a governing law that does not fit the seat.",
  },
  4: {
    name: "Risk asymmetry",
    description:
      "Finds where the draft puts a risk on one party and says nothing about it.",
  },
  5: {
    name: "Citation gate",
    description: "Verifying every citation against the corpus.",
  },
  6: {
    name: "Risk triage",
    description:
      "Scores the document's value and risk to assign its review tier, then packages the findings for the advocate.",
  },
};

/**
 * A deliberate note from the advocate to the client about one clause, the one
 * way an advocate's own words reach a client (decided 3 October).
 *
 * It is written in a composer of its own and starts as a draft. Marking it
 * (`shareWithClient`) is a second, explicit act. Only sign-off releases a note,
 * and only a marked one: `releasedAt` is set by `signOffDocument` and by nothing
 * else, and a released note can no longer be changed. A working note
 * (AdvocateNote) has no control that turns it into one of these.
 */
export interface SettlementNote {
  id: string;
  /** Joins to Clause.number, as a finding's clause reference does. */
  clauseNumber: string;
  text: string;
  /** False is a draft: written, and not to be shared. */
  shareWithClient: boolean;
  createdAt: string;
  updatedAt: string;
  /** Set at sign-off for a marked note, never before. Null for a draft, always. */
  releasedAt: string | null;
}

/**
 * A released note as the client reads it: where it is, what it says and when it
 * was released. Not whether it was ever a draft, and nothing of the advocate: the
 * byline is the sign-off record's, which already names them.
 */
export type ClientSettlementNote = Pick<SettlementNote, "id" | "clauseNumber" | "text" | "releasedAt">;

/**
 * An advocate's own note, stuck in the margin of a clause.
 *
 * Private working paper: only the advocate who wrote it sees it, it never
 * reaches the client, and it is not a finding. It has no state and plays
 * no part in sign-off.
 */
export interface AdvocateNote {
  id: string;
  documentId: string;
  clauseId: string;
  advocateId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** A count over a count. Nothing to divide is "none yet", not 0%. */
export interface Ratio {
  numerator: number;
  denominator: number;
}

/** One citation an advocate typed that the corpus could not match. */
export interface BlockedAttemptRow {
  id: string;
  /** ISO 8601. */
  at: string;
  documentTitle: string | null;
  advocate: string;
  /** Exactly what was typed. */
  typed: string;
  reason: string;
}

/**
 * The metrics page's figures. Each has a source or says it has none: the
 * triage override rate and the corpus-currency lag are `no_source`, and the
 * page shows "No data source yet" for them, never a number.
 */
export interface Metrics {
  /** Released documents the findings were counted over. */
  documentsCounted: number;
  overrides: Ratio;
  additions: Ratio;
  fabrication: Ratio;
  blocked: BlockedAttemptRow[];
  triageOverride: { state: "no_source" };
  corpusLag: { state: "no_source" };
}

/**
 * A client's own details and the people on its team. A preview: invitations
 * send nothing, and every member has the same access. Real organisation
 * membership and roles are backend work (docs/api-contract.md, section 10.2).
 */
export interface AccountProfile {
  name: string;
  email: string;
}

export interface TeamMember {
  id: string;
  /** Null for someone who has been invited and has not yet said who they are. */
  name: string | null;
  email: string;
  status: "owner" | "active" | "invited";
}

export interface Account {
  profile: AccountProfile;
  members: TeamMember[];
}

/** What the document surface needs to show and keep an advocate's notes. */
export interface MarginNotes {
  items: AdvocateNote[];
  onAdd: (clauseId: string, text: string) => void | Promise<void>;
  onUpdate: (noteId: string, text: string) => void | Promise<void>;
  onDelete: (noteId: string) => void | Promise<void>;
}

/**
 * A reply from the advocate's review agent. It explains the first pass
 * and points at its evidence; `decision` marks a reply to a question the
 * advocate alone can answer (settle, override, sign off), which the agent
 * hands back rather than answers.
 */
export interface ReviewAgentReply {
  text: string;
  /** Findings or clauses the reply points at, each a way straight to it. */
  refs: { label: string; findingId: string | null; clauseNumber: string | null }[];
  decision: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  citedClauseReference: string | null;
  isEscalation: boolean;
}
