export function randomDelay(minMs = 600, maxMs = 1200): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockApiError extends Error {
  constructor(message = "Something went wrong. Please try again.") {
    super(message);
    this.name = "MockApiError";
  }
}

export function shouldSimulateFailure(): boolean {
  // QA 4.4: ?fail=1 used to force every mock call to reject on any origin,
  // including production. The literal comparison below is inlined at build
  // time, so this whole branch — and the failure-injection path — is
  // dead-code-eliminated out of a production bundle.
  if (process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE !== "1") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("fail") === "1";
}
