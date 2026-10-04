import { advocateProfileSeed } from "@/lib/mock/advocate.mock";
import type { AdvocateEnrolment } from "@/lib/types";
import { randomDelay, MockApiError, shouldSimulateFailure } from "./delay";

// In-memory mutable store, same pattern as lib/api/documents.ts. Resets on
// reload — there is no backend yet. QA 3.6: this used to be untracked
// useState inside the profile page, so it had no effect on the queue.
const profile = structuredClone(advocateProfileSeed);

export interface AdvocateProfile {
  available: boolean;
  /** The names the claim check reads (declaredConflictNames). */
  declaredConflicts: string[];
  /** What the advocate confirmed at onboarding, or null. */
  enrolment: AdvocateEnrolment | null;
}

/**
 * Write what onboarding collected. The declared conflicts go into the one list
 * the claim check reads, merged with any already there, so what an advocate
 * declares on joining is what stops a claim. Not a screen's to call: the
 * onboarding API owns the delay, the failure switch and the invitation.
 */
export function recordOnboarding(details: {
  barEnrolmentNumber: string;
  stateBarCouncil: string;
  declaredConflicts: string[];
}): AdvocateProfile {
  const names = [...profile.declaredConflicts];
  for (const raw of details.declaredConflicts) {
    const name = raw.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  profile.declaredConflicts = names;
  profile.enrolment = {
    barEnrolmentNumber: details.barEnrolmentNumber.trim(),
    stateBarCouncil: details.stateBarCouncil.trim(),
    confirmedAt: new Date().toISOString(),
  };
  return structuredClone(profile);
}

/**
 * The names the advocate has declared a conflict with, read where a claim is
 * checked. It is not a screen's to read: the claim rule lives in
 * lib/api/documents.ts and a screen only mirrors it.
 */
export function declaredConflictNames(): string[] {
  return [...profile.declaredConflicts];
}

export async function getAdvocateProfile(): Promise<AdvocateProfile> {
  await randomDelay(150, 300);
  return structuredClone(profile);
}

export async function setAdvocateAvailability(
  available: boolean,
): Promise<AdvocateProfile> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not update availability.");
  }
  profile.available = available;
  return structuredClone(profile);
}

export async function addDeclaredConflict(
  name: string,
): Promise<AdvocateProfile> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not save the declared conflict.");
  }
  if (!profile.declaredConflicts.includes(name)) {
    profile.declaredConflicts = [...profile.declaredConflicts, name];
  }
  return structuredClone(profile);
}

export async function removeDeclaredConflict(
  name: string,
): Promise<AdvocateProfile> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not remove the declared conflict.");
  }
  profile.declaredConflicts = profile.declaredConflicts.filter(
    (c) => c !== name,
  );
  return structuredClone(profile);
}
