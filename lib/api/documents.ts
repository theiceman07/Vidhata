import type {
  Clause,
  ContractDocument,
  ExecutionStep,
  Finding,
  ReviewTier,
} from "@/lib/types";
import { PIPELINE_DURATION_MS, clauseNumberFromReference } from "@/lib/types";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";

// QA 7.3: tier ordering used to sort the advocate queue, so the pricing
// page's "Priority turnaround" claim (Enhanced/Senior tiers) is backed by
// real routing behaviour instead of being decorative copy.
const TIER_PRIORITY: Record<ReviewTier, number> = {
  senior: 0,
  enhanced: 1,
  standard: 2,
};

export function getQueuePriority(doc: ContractDocument): number {
  return TIER_PRIORITY[doc.tier];
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
    },
  ];
}

// In-memory mutable store so adjudication/claim/sign-off actions persist
// for the duration of the tab. Resets on reload — there is no backend yet.
let store: ContractDocument[] = structuredClone(mockDocuments);

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
  // Demo-only: the pipeline has no real drafting/screening logic to run,
  // so a freshly analysed document is seeded with the same representative
  // finding set used in the pending_review fixture (high non-compete,
  // medium MSMED, low blocked-citation) rather than staying empty. The
  // tier chosen at intake is preserved — it used to be force-upgraded to
  // "enhanced" here regardless of what the client selected (QA 3.2).
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

export interface IntakeInput {
  title: string;
  type: ContractDocument["type"];
  tier: ReviewTier;
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
    tier: input.tier,
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

export async function claimDocument(
  id: string,
  advocate: { id: string; name: string; bar: string },
): Promise<ContractDocument> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not claim this document.");
  }
  const doc = store.find((d) => d.id === id);
  if (!doc) throw new MockApiError("Document not found.");
  doc.status = "under_review";
  doc.advocate = advocate;
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
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  const finding = doc.findings.find((f) => f.findingId === findingId);
  if (!finding) throw new MockApiError("Finding not found.");
  finding.disposition = patch.disposition;
  finding.overrideNote = patch.overrideNote;
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
  if (doc.findings.some((f) => f.disposition === "pending")) {
    throw new MockApiError("Every finding must be settled before sign-off.");
  }
  // A citation is either verified or blocked, never "probably fine". The
  // sign-off screen disables its control over this too, but the rule
  // belongs here as well: a UI-only guard is not a guard.
  if (
    doc.findings.some((f) => f.citations.some((c) => c.status === "blocked"))
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

export async function toggleExecutionStep(
  docId: string,
  kind: ContractDocument["executionSteps"][number]["kind"],
  complete: boolean,
): Promise<ContractDocument> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not update the checklist.");
  }
  const doc = store.find((d) => d.id === docId);
  if (!doc) throw new MockApiError("Document not found.");
  const step = doc.executionSteps.find((s) => s.kind === kind);
  if (step) step.complete = complete;
  return structuredClone(doc);
}
