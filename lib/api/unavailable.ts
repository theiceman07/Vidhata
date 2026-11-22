import { MockApiError } from "./delay";
import { backendDataEnabled } from "./source";

/**
 * Some advocate features have no backend route yet: working notes, notes to the client,
 * consultations and payouts (docs/backend-gap-report.md, B16). Their data lives only in an
 * in-browser store. With the real backend on, they must not read or write that store: a note
 * that looks saved and is gone on reload is worse than no note. The screens show
 * NOT_AVAILABLE_YET, and every function of those stores refuses with it.
 */
export const NOT_AVAILABLE_YET = "Not available yet.";

/** True when the screens should show the "not available yet" state instead of the feature. */
export function notAvailableInBackend(): boolean {
  return backendDataEnabled();
}

/** Call first in a function backed only by an in-browser store. */
export function refuseInBackendMode(): void {
  if (backendDataEnabled()) throw new MockApiError(NOT_AVAILABLE_YET);
}
