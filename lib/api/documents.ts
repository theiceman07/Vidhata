import type { ContractDocument, Finding } from "@/lib/types";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";

// In-memory mutable store so adjudication/claim/sign-off actions persist
// for the duration of the tab. Resets on reload — there is no backend yet.
let store: ContractDocument[] = structuredClone(mockDocuments);

export async function listDocuments(): Promise<ContractDocument[]> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your documents.");
  }
  return structuredClone(store);
}

export async function getDocument(
  id: string,
): Promise<ContractDocument | null> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load this document.");
  }
  const doc = store.find((d) => d.id === id);
  return doc ? structuredClone(doc) : null;
}

export interface IntakeInput {
  title: string;
  type: ContractDocument["type"];
  clientName: string;
  counterpartyName: string;
  stateOfExecution: string;
  transactionValue: number;
  counterpartyIsMsme: boolean;
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
    tier: "standard",
    clientName: input.clientName,
    counterpartyName: input.counterpartyName,
    stateOfExecution: input.stateOfExecution,
    transactionValue: input.transactionValue,
    counterpartyIsMsme: input.counterpartyIsMsme,
    createdAt: new Date().toISOString(),
    settledAt: null,
    advocate: null,
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
  if (doc.status === "draft") doc.status = "analysing";
  return structuredClone(doc);
}

// Demo-only: the pipeline has no real drafting/screening logic to run, so
// a freshly analysed document is seeded with the same representative
// finding set used in the pending_review fixture (high non-compete,
// medium MSMED, low blocked-citation) rather than staying empty.
export async function completeAnalysis(id: string): Promise<ContractDocument> {
  await randomDelay(200, 400);
  const doc = store.find((d) => d.id === id);
  if (!doc) throw new MockApiError("Document not found.");
  if (doc.status !== "analysing") return structuredClone(doc);
  doc.status = "pending_review";
  doc.tier = "enhanced";
  doc.findings = structuredClone(
    mockDocuments.find((d) => d.id === "doc-msa-pending")?.findings ?? [],
  ).map((f, i) => ({ ...f, findingId: `${doc.id}-finding-${i}` }));
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
    throw new MockApiError("All findings must be adjudicated before sign-off.");
  }
  doc.status = "settled";
  doc.settledAt = new Date().toISOString();
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
