import { advocateProfileSeed } from "@/lib/mock/advocate.mock";
import { randomDelay, MockApiError, shouldSimulateFailure } from "./delay";

// In-memory mutable store, same pattern as lib/api/documents.ts. Resets on
// reload — there is no backend yet. QA 3.6: this used to be untracked
// useState inside the profile page, so it had no effect on the queue.
const profile = structuredClone(advocateProfileSeed);

export interface AdvocateProfile {
  available: boolean;
  declaredConflicts: string[];
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
