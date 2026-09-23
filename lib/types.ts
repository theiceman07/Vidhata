export type DocumentStatus =
  | "draft" // intake done, pipeline not run
  | "analysing" // pipeline running
  | "pending_review" // in the advocate queue
  | "under_review" // an advocate has picked it up
  | "revision" // advocate asked for changes
  | "settled" // signed off
  | "executed"; // client confirmed stamping and signature

export type ReviewTier = "standard" | "enhanced" | "senior";
export type Severity = "high" | "medium" | "low";
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

export interface ExecutionStep {
  kind: "stamping" | "registration" | "esignature";
  applicable: boolean;
  headline: string; // "Stamp duty: Rs 100 (Delhi)"
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

export interface ContractDocument {
  id: string;
  title: string;
  type: "nda" | "vendor" | "msa" | "employment";
  status: DocumentStatus;
  tier: ReviewTier;
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
  /** When the advocate claimed it. Null while unclaimed. */
  claimedAt: string | null;
  settledAt: string | null;
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

export const PIPELINE_DURATION_MS = 28000; // 7 layers × 4s each

export const PIPELINE_LAYERS: Record<
  PipelineLayer,
  { name: string; description: string }
> = {
  0: {
    name: "Intake normalisation",
    description: "Structures the deal facts into a drafting brief.",
  },
  1: {
    name: "Clause drafting",
    description: "Assembles clauses from the curated corpus.",
  },
  2: {
    name: "Statutory screen",
    description: "Checks the draft against Indian Contract Act constraints.",
  },
  3: {
    name: "MSMED compliance",
    description: "Checks payment terms against the MSMED Act.",
  },
  4: {
    name: "Jurisdiction check",
    description: "Confirms governing law and forum clauses are enforceable.",
  },
  5: {
    name: "Citation gate",
    description: "Verifying every citation against the corpus.",
  },
  6: {
    name: "Advocate handoff",
    description: "Packages findings for adjudication.",
  },
};

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
