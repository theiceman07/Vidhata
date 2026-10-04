import { invoicesFor } from "@/lib/billing";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { BillingProfile, Invoice } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { listOrgConsultations } from "./consultations";
import { listDocuments } from "./documents";

// In-memory, like everything in the preview: it resets on reload, and nothing
// is sent anywhere. One profile per organisation.
const profiles = new Map<string, BillingProfile>();

function profileOf(orgId: string): BillingProfile {
  let profile = profiles.get(orgId);
  if (!profile) {
    profile = { name: orgId === MOCK_CLIENT_ORG.id ? MOCK_CLIENT_ORG.name : "", gstin: null };
    profiles.set(orgId, profile);
  }
  return profile;
}

/** An organisation's invoices, newest first, read from its documents. */
export async function listInvoices(orgId: string): Promise<Invoice[]> {
  // Each of these owns its own delay and failure switch, and scopes by org. The
  // consultations are read for what was paid and when, and nothing else.
  // A failure in either is said as what the reader asked for: invoices, not the
  // consultations they are partly read from.
  try {
    const [docs, consultations] = await Promise.all([
      listDocuments(orgId),
      listOrgConsultations(orgId),
    ]);
    return invoicesFor(docs, consultations);
  } catch {
    throw new MockApiError("Could not load your invoices.");
  }
}

export async function getInvoice(orgId: string, number: string): Promise<Invoice | null> {
  const invoices = await listInvoices(orgId);
  return invoices.find((i) => i.number === number) ?? null;
}

export async function getBillingProfile(orgId: string): Promise<BillingProfile> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your billing details.");
  }
  return structuredClone(profileOf(orgId));
}

/**
 * The GSTIN is optional and is kept as typed, trimmed. It is deliberately not
 * checked against any register or format: this preview has nothing to check it
 * against, and a wrong guess would turn a client away.
 */
export async function saveBillingProfile(
  orgId: string,
  input: { name: string; gstin: string },
): Promise<BillingProfile> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not save your billing details.");
  }
  const name = input.name.trim();
  if (!name) throw new MockApiError("Enter the name invoices are made out to.");
  const gstin = input.gstin.trim();
  const profile: BillingProfile = { name, gstin: gstin ? gstin : null };
  profiles.set(orgId, profile);
  return structuredClone(profile);
}
