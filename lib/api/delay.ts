import { scheduleSave } from "./state";

/**
 * The preview's stand-in for a network. The waits the calls ask for are the
 * ones written at each call; a page that makes five of them in a row took three
 * to four seconds to open even in a production build, so every wait is scaled
 * down. A page still shows its loading state, only for a moment. Real latency
 * is the backend's, and the backend replaces these calls (CLAUDE.md, lib/api/*).
 */
const LATENCY_SCALE = 0.25;

export function randomDelay(minMs = 600, maxMs = 1200): Promise<void> {
  const ms = (minMs + Math.random() * (maxMs - minMs)) * LATENCY_SCALE;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
      // The function waiting on this runs next, and changes what it is going
      // to change. The save is queued behind it, so what a mock call does
      // after its wait is stored without the call having to say so.
      scheduleSave();
    }, ms);
  });
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
