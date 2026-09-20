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
}

export interface ExecutionStep {
  kind: "stamping" | "registration" | "esignature";
  applicable: boolean;
  headline: string; // "Stamp duty: Rs 100 (Delhi)"
  detail: string;
  reason: string; // why it does or does not apply
  instructions: string[];
  complete: boolean;
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
  settledAt: string | null;
  // ISO timestamp the in-flight analysis resolves at, or null when not
  // analysing. Durable across navigation (QA 4.5) — lib/api/documents.ts
  // reconciles this on every read instead of relying on a component timer.
  analysisCompletesAt: string | null;
  advocate: { id: string; name: string; bar: string } | null;
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

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  citedClauseReference: string | null;
  isEscalation: boolean;
}
