import { invoicesFor } from "@/lib/billing";
import { buildDataExport } from "@/lib/privacy";
import type { PrivacyState } from "@/lib/types";
import { getBillingProfile } from "./billing";
import { shapeClientConsultation } from "./client/consultations";
import { shapeClientDocument } from "./client/shape-document";
import { listOrgConsultations } from "./consultations";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { listDocuments } from "./documents";
import { register, restored } from "./state";

// In-memory, like everything in the preview: it resets on reload. One state
// per organisation. Training use starts off.
const states = new Map<string, PrivacyState>(restored("privacy"));
register("privacy", () => [...states]);

function stateOf(orgId: string): PrivacyState {
  let state = states.get(orgId);
  if (!state) {
    state = { trainingOptIn: false, consentLog: [], deletionRequestedAt: null };
    states.set(orgId, state);
  }
  return state;
}

export async function getPrivacy(orgId: string): Promise<PrivacyState> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your privacy settings.");
  }
  return structuredClone(stateOf(orgId));
}

/**
 * Turn training use on or off. Every change is logged with its time. Setting
 * what it already is changes nothing and logs nothing, so a repeated press
 * leaves one entry. A failure changes nothing.
 */
export async function setTrainingOptIn(orgId: string, granted: boolean): Promise<PrivacyState> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not save your choice. Nothing was changed.");
  }
  const state = stateOf(orgId);
  if (state.trainingOptIn !== granted) {
    state.trainingOptIn = granted;
    state.consentLog = [...state.consentLog, { at: new Date().toISOString(), granted }];
  }
  return structuredClone(state);
}

/**
 * A file of what the client may take with them, as text for the screen to
 * hand over. Built from what they may read, and nothing else (lib/privacy).
 */
export async function requestDataExport(
  orgId: string,
): Promise<{ fileName: string; contents: string }> {
  await randomDelay(400, 800);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not prepare your export.");
  }
  // Each of these owns its own delay and failure; the file is one read of them.
  const [documents, organisation, consultations] = await Promise.all([
    listDocuments(orgId),
    getBillingProfile(orgId),
    listOrgConsultations(orgId),
  ]);
  // The invoices are worked out here, from the records. The rest of the file is built
  // from what the client reads, so it cannot carry what a client screen cannot.
  const file = buildDataExport({
    organisation,
    documents: documents.map((d) => shapeClientDocument(d)),
    invoices: invoicesFor(documents, consultations),
    consultations: consultations.map(shapeClientConsultation),
    privacy: stateOf(orgId),
    now: new Date(),
  });
  return { fileName: "vidhata-export-preview.json", contents: JSON.stringify(file, null, 2) };
}

/**
 * Ask for deletion. A request, never an erasure: it records when it was asked
 * and nothing else changes, in this preview or in the consent log, which is
 * kept. It needs the explicit confirmation, whatever the screen did, and asking
 * again keeps the first time.
 */
export async function requestDeletion(
  orgId: string,
  confirmation: { understood: true },
): Promise<PrivacyState> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not record your request.");
  }
  if (!confirmation?.understood) {
    throw new MockApiError("Confirm the request before it is recorded.");
  }
  const state = stateOf(orgId);
  if (!state.deletionRequestedAt) state.deletionRequestedAt = new Date().toISOString();
  return structuredClone(state);
}

/** Take a request back, until it is processed. */
export async function withdrawDeletion(orgId: string): Promise<PrivacyState> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not withdraw your request.");
  }
  const state = stateOf(orgId);
  state.deletionRequestedAt = null;
  return structuredClone(state);
}
