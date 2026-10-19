import { z } from "zod";
import { authed, type Fetcher } from "@/lib/api/backend";
import { documentRowSchema, queueRowToContractDocument, queueRowSchema, toContractDocument } from "@/lib/api/backend-documents";
import type { ContractDocument } from "@/lib/types";

/** The advocate queue on the real backend (backend/app/lawyer_queue/router.py). */
export async function listBackendQueue(fetchImpl?: Fetcher): Promise<ContractDocument[]> {
  const rows = await authed("/queue", { method: "GET" }, z.array(queueRowSchema), fetchImpl);
  return rows.map(queueRowToContractDocument);
}

/** Claiming returns the document row, now assigned to the caller. */
export async function claimBackendDocument(id: string, fetchImpl?: Fetcher): Promise<ContractDocument> {
  const row = await authed(`/queue/${id}/claim`, { method: "POST" }, documentRowSchema, fetchImpl);
  return toContractDocument(row);
}

export async function releaseBackendDocument(id: string, fetchImpl?: Fetcher): Promise<void> {
  await authed(`/queue/${id}/release`, { method: "POST" }, z.object({ ok: z.literal(true) }), fetchImpl);
}
