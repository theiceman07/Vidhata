import { z } from "zod";
import { getSupabaseClient } from "@/lib/auth/supabaseClient";
import { deadline, kindOfThrown, readDetail } from "@/lib/net/failure";

/**
 * Shared plumbing for calls to the real backend (FastAPI): the base URL, the signed-in
 * session's access token, a bounded call, and the failures it can end in as one typed error.
 * The mock layer in the other lib/api modules does not use it.
 *
 * Tokens and presigned URLs are never logged, never put in an error message and never
 * returned to a screen. `detail` carries what the server said, for debugging.
 */
export const API_TIMEOUT_MS = 30_000;
/** The file itself going to S3: a 25 MB file on a slow line needs longer. */
export const UPLOAD_TIMEOUT_MS = 5 * 60_000;

export type ApiErrorCode =
  | "unauthorized" // 401: no session, or the token was refused
  | "forbidden" // 403
  | "not_found" // 404 (also another organisation's document)
  | "conflict" // 409 (e.g. the document's state does not allow the change)
  | "rejected" // any other 4xx (e.g. 422: the backend refused the file or request)
  | "server" // 5xx
  | "network"
  | "timeout"
  | "bad_reply"; // the reply did not match the schema

const COPY: Record<ApiErrorCode, string> = {
  unauthorized: "You are signed out. Sign in again.",
  forbidden: "This account may not do that.",
  not_found: "That document was not found.",
  conflict: "The document is not in a state that allows that.",
  rejected: "The server refused the request.",
  server: "Something went wrong on the server. Try again in a moment.",
  network: "Could not reach the server. Check your connection and try again.",
  timeout: "That took too long. Try again.",
  bad_reply: "The server sent a reply that could not be read.",
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly detail?: string;
  constructor(code: ApiErrorCode, info: { status?: number; detail?: string } = {}) {
    super(COPY[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = info.status;
    this.detail = info.detail;
  }
}

export function codeOfStatus(status: number): ApiErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status >= 500) return "server";
  return "rejected";
}

export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
}

/** The signed-in account's id (the token's subject), or null with no session. Never the token. */
export async function ownUserId(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.user?.id ?? null;
}

/** The current session's access token; a missing session is a 401 without a round trip. */
export async function accessToken(): Promise<string> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("unauthorized", { detail: "no session" });
  return token;
}

export type Fetcher = typeof fetch;

/** One bounded call; any throw leaves as an ApiError. `onNotOk` may replace the default mapping. */
export async function bounded<T>(
  f: Fetcher,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  read: (res: Response) => Promise<T>,
  onNotOk: (res: Response) => Promise<ApiError> = async (res) =>
    new ApiError(codeOfStatus(res.status), { status: res.status, detail: await readDetail(res) }),
): Promise<T> {
  const limit = deadline(timeoutMs);
  try {
    const res = await f(url, { ...init, signal: limit.signal });
    if (!res.ok) throw await onNotOk(res);
    return await read(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof SyntaxError) throw new ApiError("bad_reply", { detail: err.message });
    // The thrown message is not kept: for a presigned URL it could carry the URL.
    throw new ApiError(kindOfThrown(err));
  } finally {
    limit.clear();
  }
}

export async function parse<S extends z.ZodTypeAny>(res: Response, schema: S): Promise<z.infer<S>> {
  const result = schema.safeParse(await res.json());
  if (!result.success) {
    throw new ApiError("bad_reply", {
      status: res.status,
      detail: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }
  return result.data;
}

/** A call to the backend with the session's Bearer token. */
export async function authed<S extends z.ZodTypeAny>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  schema: S,
  fetchImpl: Fetcher = fetch,
): Promise<z.infer<S>> {
  const token = await accessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  return bounded(
    fetchImpl,
    `${apiBase()}${path}`,
    { method: init.method, headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) },
    API_TIMEOUT_MS,
    (res) => parse(res, schema),
  );
}
