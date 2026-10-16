/**
 * How a failed call to the backend is told to the person. The words are fixed per kind of
 * failure; what the server said stays in a `detail` field for debugging and is never shown.
 */
export type FailureKind = "network" | "timeout" | "unauthorized" | "too_large" | "client" | "server";

export const FAILURE_COPY: Record<FailureKind, string> = {
  network: "Could not reach the server. Check your connection and try again.",
  timeout: "That took too long. Try again.",
  unauthorized: "You are signed out or do not have access to this. Sign in again and retry.",
  too_large: "That is too large to send.",
  client: "The request could not be completed. Try again.",
  server: "Something went wrong on our side. Try again in a moment.",
};

export function kindOfStatus(status: number): FailureKind {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 413) return "too_large";
  if (status >= 500) return "server";
  return "client";
}

/** What a fetch that threw means: our own deadline (AbortSignal.timeout) or no connection. */
export function kindOfThrown(err: unknown): "timeout" | "network" {
  const name = (err as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError" ? "timeout" : "network";
}

/** The server's own words for debugging. Never put this on screen. */
export async function readDetail(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail.slice(0, 500);
  } catch {
    /* not JSON */
  }
  return undefined;
}
