import { z } from "zod";
import { authed, type Fetcher } from "@/lib/api/backend";

/** POST /documents on the real backend (backend/app/documents/router.py). Not the mock in documents.ts. */
const createdSchema = z.object({ id: z.string().uuid(), doc_type: z.string(), state: z.string() });

export type CreatedDocument = z.infer<typeof createdSchema>;

export function createBackendDocument(docType: string, fetchImpl?: Fetcher): Promise<CreatedDocument> {
  return authed("/documents", { method: "POST", body: { doc_type: docType } }, createdSchema, fetchImpl);
}
