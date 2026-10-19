import { z } from "zod";
import { ApiError, UPLOAD_TIMEOUT_MS, authed, bounded, type Fetcher } from "@/lib/api/backend";

/**
 * File routes of the real backend (backend/app/storage/router.py):
 *   POST /documents/{id}/files/upload-url   -> { key, url, fields }   (a presigned S3 POST)
 *   POST /documents/{id}/files/confirm      -> { version_no }
 *   GET  /documents/{id}/files/download-url -> { url, expires_in, version_no }
 * Each backend call sends the session's access token. The S3 call sends none.
 * Presigned URLs live only in the objects these functions return; they are never logged,
 * stored or put in an error.
 */

const https = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "must be https");

const uploadTargetSchema = z.object({ key: z.string().min(1), url: https, fields: z.record(z.string()) });
const confirmSchema = z.object({ version_no: z.number().int().positive() });
const downloadSchema = z.object({ url: https, expires_in: z.number().positive(), version_no: z.number().int().positive() });

/** What the backend hands back for one upload: where to post, what to post, and the key to confirm. */
export type UploadTarget = z.infer<typeof uploadTargetSchema>;

const docPath = (documentId: string) => `/documents/${encodeURIComponent(documentId)}/files`;

export function requestUploadUrl(documentId: string, file: Pick<File, "name" | "type" | "size">, fetchImpl?: Fetcher): Promise<UploadTarget> {
  return authed(
    `${docPath(documentId)}/upload-url`,
    { method: "POST", body: { filename: file.name, content_type: file.type, size: file.size } },
    uploadTargetSchema,
    fetchImpl,
  );
}

/**
 * Post the file to the presigned form: every returned field first, the file last (S3 ignores
 * anything after it), no Authorization header and no cookies. S3 answers 204 on success.
 */
export function uploadToS3(target: UploadTarget, file: File, fetchImpl: Fetcher = fetch): Promise<{ status: number }> {
  const form = new FormData();
  for (const [name, value] of Object.entries(target.fields)) form.append(name, value);
  form.append("file", file);
  return bounded(
    fetchImpl,
    target.url,
    { method: "POST", body: form, credentials: "omit" },
    UPLOAD_TIMEOUT_MS,
    async (res) => ({ status: res.status }),
    // S3's answer is XML naming the bucket and key; only the status is kept.
    async (res) => new ApiError(res.status >= 500 ? "server" : "rejected", { status: res.status, detail: `S3 answered ${res.status}` }),
  );
}

export async function confirmUpload(documentId: string, key: string, fetchImpl?: Fetcher): Promise<{ versionNo: number }> {
  const done = await authed(`${docPath(documentId)}/confirm`, { method: "POST", body: { key } }, confirmSchema, fetchImpl);
  return { versionNo: done.version_no };
}

export async function getDownloadUrl(
  documentId: string,
  versionNo: number,
  fetchImpl?: Fetcher,
): Promise<{ url: string; expiresIn: number; versionNo: number }> {
  const body = await authed(
    `${docPath(documentId)}/download-url?version_no=${encodeURIComponent(String(versionNo))}`,
    { method: "GET" },
    downloadSchema,
    fetchImpl,
  );
  return { url: body.url, expiresIn: body.expires_in, versionNo: body.version_no };
}
