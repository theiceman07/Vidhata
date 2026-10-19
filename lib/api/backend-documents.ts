import { z } from "zod";
import { ApiError, authed, type Fetcher } from "@/lib/api/backend";
import { confirmUpload, requestUploadUrl, uploadToS3 } from "@/lib/api/files";
import { checkFile } from "@/lib/storage/upload";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument, DocumentStatus, ReviewTier } from "@/lib/types";

/** POST /documents on the real backend (backend/app/documents/router.py). Not the mock in documents.ts. */
const createdSchema = z.object({ id: z.string().uuid(), doc_type: z.string(), state: z.string() });

export type CreatedDocument = z.infer<typeof createdSchema>;

/** What the intake form states that the backend can hold (backend CreateDocument). */
export interface CreateFacts {
  stateOfExecution?: string;
  transactionValue?: number;
}

export function createBackendDocument(docType: string, fetchImpl?: Fetcher, facts: CreateFacts = {}): Promise<CreatedDocument> {
  const body: Record<string, unknown> = { doc_type: docType };
  if (facts.stateOfExecution?.trim()) body.state_of_execution = facts.stateOfExecution.trim();
  if (facts.transactionValue !== undefined && Number.isFinite(facts.transactionValue) && facts.transactionValue >= 0) {
    body.transaction_value = facts.transactionValue;
  }
  return authed("/documents", { method: "POST", body }, createdSchema, fetchImpl);
}

/** The screens' contract type -> the backend's code. */
export const BACKEND_CODE_BY_TYPE: Record<ContractDocument["type"], string> = {
  nda: "nda", msa: "msa", vendor: "vendor_supplier", employment: "employment_contract",
};

/** The contract file: checked here, posted to S3 with the presigned form, then confirmed. */
export async function uploadBackendContract(documentId: string, file: File, fetchImpl?: Fetcher): Promise<{ versionNo: number }> {
  const problem = checkFile(file);
  if (problem) throw new ApiError("rejected", { detail: problem });
  const target = await requestUploadUrl(documentId, file, fetchImpl);
  await uploadToS3(target, file, fetchImpl);
  return confirmUpload(documentId, target.key, fetchImpl);
}

const reviewSchema = z.object({ state: z.string(), version_no: z.number().int(), findings_created: z.number().int() });

/** Starts the review on the latest uploaded version (the stub agent today). */
export async function requestBackendReview(documentId: string, fetchImpl?: Fetcher): Promise<{ findingsCreated: number }> {
  const r = await authed(`/documents/${encodeURIComponent(documentId)}/review`, { method: "POST" }, reviewSchema, fetchImpl);
  return { findingsCreated: r.findings_created };
}

/**
 * Reads. The backend holds a thin row, the screens expect a large ContractDocument. Fields the
 * backend does not hold get a plain placeholder ("Not recorded", 0, empty list), never an invented
 * fact. A state or contract type the screens cannot show is refused as bad_reply, not guessed.
 */
const STATES = [
  "drafted", "under_ai_review", "pending_lawyer_review", "lawyer_commented",
  "revision_in_progress", "lawyer_approved", "delivered",
] as const;

// The backend has 19 contract types; the screens model four. Others are refused until they are modelled.
const TYPE_BY_CODE = { nda: "nda", msa: "msa", vendor_supplier: "vendor", employment_contract: "employment" } as const;
const TITLE: Record<ContractDocument["type"], string> = {
  nda: "Non-Disclosure Agreement",
  msa: "Master Services Agreement",
  vendor: "Vendor Agreement",
  employment: "Employment Agreement",
};
const TIER: Record<string, ReviewTier> = { standard: "standard", enhanced: "enhanced", senior_counsel: "senior" };
const NOT_RECORDED = "Not recorded";

const docType = z.enum(Object.keys(TYPE_BY_CODE) as [keyof typeof TYPE_BY_CODE, ...(keyof typeof TYPE_BY_CODE)[]]);
const tier = z.enum(["standard", "enhanced", "senior_counsel"]).nullable();
const money = z.coerce.number().nullable();

export const documentRowSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string(),
  doc_type: docType,
  state: z.enum(STATES),
  state_of_execution: z.string().nullable(),
  transaction_value: money,
  triage_tier: tier,
  assigned_lawyer_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type DocumentRow = z.infer<typeof documentRowSchema>;

export const queueRowSchema = z.object({
  id: z.string().uuid(),
  doc_type: docType,
  state_of_execution: z.string().nullable(),
  transaction_value: money,
  triage_tier: tier,
  queued_at: z.string(),
  org_id: z.string(),
  org_name: z.string().nullable(),
});
export type QueueRow = z.infer<typeof queueRowSchema>;

function statusOf(state: DocumentRow["state"], assigned: string | null): DocumentStatus {
  switch (state) {
    case "drafted": return "draft";
    case "under_ai_review": return "analysing";
    case "pending_lawyer_review": return assigned ? "under_review" : "pending_review";
    case "lawyer_commented":
    case "revision_in_progress": return "revision";
    case "lawyer_approved":
    case "delivered": return "settled";
  }
}

function base(type: ContractDocument["type"]): Omit<ContractDocument, "id" | "orgId" | "status" | "tier" | "clientName" | "stateOfExecution" | "transactionValue" | "createdAt" | "advocate" | "settledAt" | "claimedAt"> {
  return {
    title: TITLE[type], type, counterpartyName: NOT_RECORDED, counterpartyIsMsme: false, durationMonths: 0,
    governingLaw: NOT_RECORDED, keyTerms: null, version: 1, revisionCount: 0, analysisCompletesAt: null,
    clauses: [], findings: [], executionSteps: [],
  };
}

function parseRow<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new ApiError("bad_reply", { detail: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  }
  return r.data;
}

/** Accepts a raw backend row; throws ApiError("bad_reply") when it cannot be shown. */
export function toContractDocument(raw: unknown): ContractDocument {
  const r = parseRow(documentRowSchema, raw);
  const type = TYPE_BY_CODE[r.doc_type];
  const status = statusOf(r.state, r.assigned_lawyer_id);
  return {
    ...base(type),
    id: r.id, orgId: r.org_id, status, tier: r.triage_tier ? TIER[r.triage_tier] : null,
    clientName: NOT_RECORDED, stateOfExecution: r.state_of_execution ?? NOT_RECORDED,
    transactionValue: r.transaction_value ?? 0, createdAt: r.created_at,
    advocate: r.assigned_lawyer_id ? { id: r.assigned_lawyer_id, name: "Assigned advocate", bar: "" } : null,
    claimedAt: null, settledAt: status === "settled" ? r.updated_at : null,
  };
}

/**
 * The review screens decide whether the signed-in advocate holds a claim by comparing the document's
 * advocate id with CURRENT_ADVOCATE.id, the one identity those screens know. The backend holds the real
 * account id. So the document an advocate holds is shown as held by CURRENT_ADVOCATE; one held by anyone
 * else keeps that person's own id and still reads as held by someone else. Pure: with no viewer id, or
 * a document nobody holds, it changes nothing.
 */
export function asViewedBy(doc: ContractDocument, viewerId: string | null): ContractDocument {
  if (!viewerId || !doc.advocate || doc.advocate.id !== viewerId) return doc;
  return { ...doc, advocate: { ...doc.advocate, id: CURRENT_ADVOCATE.id } };
}

export function queueRowToContractDocument(r: QueueRow): ContractDocument {
  const type = TYPE_BY_CODE[r.doc_type];
  return {
    ...base(type),
    id: r.id, orgId: r.org_id, status: "pending_review", tier: r.triage_tier ? TIER[r.triage_tier] : null,
    clientName: r.org_name ?? NOT_RECORDED, stateOfExecution: r.state_of_execution ?? NOT_RECORDED,
    transactionValue: r.transaction_value ?? 0, createdAt: r.queued_at, advocate: null, claimedAt: null, settledAt: null,
  };
}

/** True for a row whose contract type the screens do not model yet (the backend has 19, the screens four). */
function isUnmodelledType(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const code = (raw as { doc_type?: unknown }).doc_type;
  return typeof code === "string" && !(code in TYPE_BY_CODE);
}

/**
 * The signed-in account's documents. A document of a type the screens cannot show yet (say a founders'
 * agreement) is left out of the list rather than failing the whole list; it cannot be opened from here
 * either. Any other unreadable row (an unknown state, a missing field) still fails the read as bad_reply.
 */
export async function listBackendDocuments(fetchImpl?: Fetcher): Promise<ContractDocument[]> {
  const rows = await authed("/documents", { method: "GET" }, z.array(z.unknown()), fetchImpl);
  return rows.filter((row) => !isUnmodelledType(row)).map(toContractDocument);
}

/** Null when the backend says not found (also another organisation's document), as the mock does. */
export async function getBackendDocument(id: string, fetchImpl?: Fetcher): Promise<ContractDocument | null> {
  try {
    return toContractDocument(await authed(`/documents/${id}`, { method: "GET" }, z.unknown(), fetchImpl));
  } catch (err) {
    if (err instanceof ApiError && err.code === "not_found") return null;
    throw err;
  }
}
