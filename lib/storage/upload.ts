import { z } from "zod";
import { FAILURE_COPY, kindOfStatus, kindOfThrown, readDetail, type FailureKind } from "@/lib/net/failure";

/**
 * Browser side of file storage: upload a file through the backend's presigned S3
 * URL, then register it as a document version; and fetch a short-lived download link.
 *
 * Not wired into any screen yet. The screens still use the mock `attachEvidence`
 * until the frontend has a real login, because every call here needs the user's token.
 *
 * Backend: POST/GET /documents/{id}/files/... (backend/app/storage/router.py).
 * Presigned URLs are never logged or stored by this module. What the server says is kept
 * in `StorageError.detail` for debugging; the message is fixed copy and safe to show.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
] as const;

/** Calls to the backend. */
export const API_TIMEOUT_MS = 30_000;
/** The file itself going to S3: a 25 MB file on a slow line needs longer. */
export const UPLOAD_TIMEOUT_MS = 5 * 60_000;

export interface StorageCallOptions {
  apiBase: string; // e.g. https://api.example.com (no trailing slash)
  token: string; // the signed-in user's access token
  timeoutMs?: number; // each call to the backend; default API_TIMEOUT_MS
  fetchImpl?: typeof fetch;
}

export class StorageError extends Error {
  readonly kind?: FailureKind;
  readonly detail?: string;
  constructor(message: string, info: { kind?: FailureKind; detail?: string } = {}) {
    super(message);
    this.name = "StorageError";
    this.kind = info.kind;
    this.detail = info.detail;
  }
}

const COPY: Record<FailureKind, string> = { ...FAILURE_COPY, too_large: "The file is larger than the 25 MB limit." };
const failure = (kind: FailureKind, detail?: string) => new StorageError(COPY[kind], { kind, detail });
const badReply = (detail?: string) => new StorageError("The server sent a reply that could not be read. Try again.", { detail });

const https = z.string().url().refine((u) => u.startsWith("https://"), "must be https");
const startSchema = z.object({ key: z.string().min(1), url: https, fields: z.record(z.string()) });
const confirmSchema = z.object({ version_no: z.number().int().positive() });
const downloadSchema = z.object({ url: https, expires_in: z.number().positive(), version_no: z.number().int().positive() });

/** One call, bounded by a deadline that also covers reading the body. A throw is a StorageError. */
async function call<T>(
  f: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  read: (res: Response) => Promise<T>,
  onStatus: (res: Response) => Promise<StorageError> = async (res) => failure(kindOfStatus(res.status), await readDetail(res)),
): Promise<T> {
  try {
    const res = await f(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw await onStatus(res);
    return await read(res);
  } catch (err) {
    if (err instanceof StorageError) throw err;
    if (err instanceof SyntaxError) throw badReply(err.message);
    throw failure(kindOfThrown(err), err instanceof Error ? err.message : undefined);
  }
}

async function parsed<S extends z.ZodTypeAny>(res: Response, schema: S): Promise<z.infer<S>> {
  const result = schema.safeParse(await res.json());
  if (!result.success) throw badReply(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return result.data;
}

export function checkFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) return "Use a PDF, DOCX, PNG or JPEG file.";
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) return "The file is empty or larger than 25 MB.";
  return null;
}

export async function uploadDocumentFile(
  opts: StorageCallOptions & { documentId: string; file: File; uploadTimeoutMs?: number },
): Promise<{ versionNo: number }> {
  const f = opts.fetchImpl ?? fetch;
  const problem = checkFile(opts.file);
  if (problem) throw new StorageError(problem);
  const apiMs = opts.timeoutMs ?? API_TIMEOUT_MS;
  const auth = { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" };
  const base = `${opts.apiBase}/documents/${encodeURIComponent(opts.documentId)}/files`;

  const { key, url, fields } = await call(
    f,
    `${base}/upload-url`,
    { method: "POST", headers: auth, body: JSON.stringify({ filename: opts.file.name, content_type: opts.file.type, size: opts.file.size }) },
    apiMs,
    (res) => parsed(res, startSchema),
  );

  // S3 requires the file to be the last field in the form.
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append("file", opts.file);
  await call(
    f,
    url,
    { method: "POST", body: form },
    opts.uploadTimeoutMs ?? UPLOAD_TIMEOUT_MS,
    async () => undefined,
    // S3's own answer is XML and says nothing the person can use; an expired or refused post is just a failed upload.
    async (res) =>
      res.status === 413
        ? failure("too_large")
        : new StorageError("The upload did not go through. Try again.", { kind: kindOfStatus(res.status), detail: `S3 answered ${res.status}` }),
  );

  const done = await call(f, `${base}/confirm`, { method: "POST", headers: auth, body: JSON.stringify({ key }) }, apiMs, (res) =>
    parsed(res, confirmSchema),
  );
  return { versionNo: done.version_no };
}

export async function getDownloadLink(
  opts: StorageCallOptions & { documentId: string; versionNo?: number },
): Promise<{ url: string; expiresIn: number; versionNo: number }> {
  const f = opts.fetchImpl ?? fetch;
  const q = opts.versionNo ? `?version_no=${opts.versionNo}` : "";
  const body = await call(
    f,
    `${opts.apiBase}/documents/${encodeURIComponent(opts.documentId)}/files/download-url${q}`,
    { headers: { Authorization: `Bearer ${opts.token}` } },
    opts.timeoutMs ?? API_TIMEOUT_MS,
    (res) => parsed(res, downloadSchema),
  );
  return { url: body.url, expiresIn: body.expires_in, versionNo: body.version_no };
}
