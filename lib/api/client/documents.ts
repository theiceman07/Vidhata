import { intakeSchema } from "@/lib/intakeSchema";
import type { ClientDocument, ClientDocumentSummary, ContractDocument, ExecutionStep } from "@/lib/types";
import { MockApiError } from "../delay";
import { backendDataEnabled } from "../source";
import {
  BACKEND_CODE_BY_TYPE,
  createBackendDocument,
  getBackendDocument,
  requestBackendReview,
  uploadBackendContract,
} from "../backend-documents";
import {
  attachEvidence,
  createDraftDocument,
  getDocument,
  type IntakeInput,
  listDocuments,
  payFee,
  respondToChanges,
  startAnalysis,
  toggleExecutionStep,
} from "../documents";
import { shapeClientDocument, shapeClientSummary } from "./shape-document";
import { ownDocument } from "./own";
import { numberedForClient } from "./shape-findings";

/**
 * A client's documents, as a client may read them. These are the reads a client
 * screen is meant to use: they take the organisation, and what comes back is the
 * client-shaped type, never the internal record.
 *
 * A document that is not the organisation's is the same null as one that is not
 * there, so asking cannot show that it exists.
 */

export async function getClientDocument(orgId: string, id: string): Promise<ClientDocument | null> {
  const doc = await getDocument(id);
  // With the real backend the server has already scoped the read to the caller's organisation.
  if (!doc || (!backendDataEnabled() && doc.orgId !== orgId)) return null;
  return shapeClientDocument(doc);
}

/** Every document the organisation has, whatever its state, as the list reads them. */
export async function listClientDocuments(orgId: string): Promise<ClientDocumentSummary[]> {
  const docs = await listDocuments(orgId);
  return docs.filter((d) => backendDataEnabled() || d.orgId === orgId).map((d) => shapeClientSummary(d));
}

/**
 * Starts a draft for the client's organisation, from what the client stated.
 * The draft is the organisation's, whatever the company name in the form says,
 * and what comes back is what a client reads of it.
 */
export async function createClientDraft(orgId: string, input: IntakeInput): Promise<ClientDocument> {
  // The rules the intake form holds, held again here: a draft made by anything but the form
  // is refused the same way, and is made from what the schema read, numbers as numbers.
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) throw new MockApiError(parsed.error.issues[0]?.message ?? "Check the details of this deal.");
  if (backendDataEnabled()) {
    // The backend holds the type, the state and the value; the rest of the form is not stored yet.
    const created = await createBackendDocument(BACKEND_CODE_BY_TYPE[parsed.data.type], undefined, {
      stateOfExecution: parsed.data.stateOfExecution,
      transactionValue: parsed.data.transactionValue,
    });
    const doc = await getBackendDocument(created.id);
    if (!doc) throw new MockApiError("Could not create the draft.");
    return shapeClientDocument(doc);
  }
  return shapeClientDocument(
    await createDraftDocument({ ...parsed.data, keyTerms: parsed.data.keyTerms ?? "" }, orgId),
  );
}

/** Starts the first pass on the client's own draft. */
export async function startClientAnalysis(orgId: string, id: string): Promise<ClientDocument> {
  // With the real backend a review starts only when the client asks for it, after uploading the contract.
  if (backendDataEnabled()) return shapeClientDocument(await ownDocument(orgId, id));
  await ownDocument(orgId, id);
  return shapeClientDocument(await startAnalysis(id));
}

/**
 * Pays the one flat fee for the client's own document. The answer says that it
 * was paid and never how much. Paying twice pays once.
 */
export async function payClientFee(orgId: string, id: string): Promise<ClientDocument> {
  await ownDocument(orgId, id);
  return shapeClientDocument(await payFee(id));
}

/**
 * The client's answers to the requests addressed to them, each keyed by the
 * number the client reads the finding by.
 *
 * Every key must be a request addressed to this client. One that is not (a
 * number never given, a finding kept from the client, one with no request to
 * them, a finding's id, anything else) is the same refusal, "Request not
 * found.", and then nothing is recorded, not even the answers that were to real
 * requests. So an answer cannot be used to find out what exists.
 */
export async function respondToClientRequests(
  orgId: string,
  id: string,
  answers: Record<string, string>,
): Promise<ClientDocument> {
  const doc = await ownDocument(orgId, id);
  const addressed = new Map(
    numberedForClient(doc)
      .filter(({ finding }) => finding.changeRequest !== null)
      .map(({ finding, number }) => [number, finding.findingId] as const),
  );
  const responses: Record<string, string> = {};
  for (const [number, answer] of Object.entries(answers)) {
    const findingId = addressed.get(number);
    if (findingId === undefined) throw new MockApiError("Request not found.");
    responses[findingId] = answer;
  }
  // Nothing written is nothing answered: it never reaches the document.
  if (!Object.values(responses).some((answer) => answer.trim())) {
    throw new MockApiError("Write an answer to at least one request.");
  }
  return shapeClientDocument(await respondToChanges(id, responses));
}

/**
 * The client's own document, once it has been signed off: the execution
 * checklist is the client's to work only then. A document read as not signed off
 * (no record to show for it) is refused the same.
 */
async function ownSettledDocument(orgId: string, id: string): Promise<ContractDocument> {
  const doc = await ownDocument(orgId, id);
  if (shapeClientDocument(doc).signOff === null) {
    throw new MockApiError("The execution checklist is not available yet.");
  }
  return doc;
}

/**
 * Ticks, or takes back, one step of the client's own execution checklist. The
 * step says it was done by the client's organisation, and the last applicable
 * step ticked makes the document executed.
 */
export async function toggleClientStep(
  orgId: string,
  id: string,
  kind: ExecutionStep["kind"],
  complete: boolean,
): Promise<ClientDocument> {
  const doc = await ownSettledDocument(orgId, id);
  return shapeClientDocument(await toggleExecutionStep(id, kind, complete, doc.clientName));
}

/** Keeps the name of the file the client gives as proof of a step, or clears it. Nothing is uploaded. */
export async function attachClientEvidence(
  orgId: string,
  id: string,
  kind: ExecutionStep["kind"],
  fileName: string | null,
): Promise<ClientDocument> {
  await ownSettledDocument(orgId, id);
  return shapeClientDocument(await attachEvidence(id, kind, fileName));
}

/** Real backend only: uploads the contract file to the client's own draft. */
export async function uploadClientContract(orgId: string, id: string, file: File): Promise<{ versionNo: number }> {
  await ownDocument(orgId, id);
  return uploadBackendContract(id, file);
}

/** Real backend only: asks for the review of the latest uploaded version, then returns the document as it now stands. */
export async function requestClientReview(orgId: string, id: string): Promise<ClientDocument> {
  await ownDocument(orgId, id);
  await requestBackendReview(id);
  return shapeClientDocument(await ownDocument(orgId, id));
}
