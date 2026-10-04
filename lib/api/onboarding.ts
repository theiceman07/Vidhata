import { mockInvitations, type Invitation } from "@/lib/mock/invites.mock";
import { recordOnboarding, type AdvocateProfile } from "./advocate";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { register, restored } from "./state";

// Which invitations have been used. Held for this browser tab, like everything in the preview.
const used = new Set<string>(restored("invitationsUsed"));
register("invitationsUsed", () => [...used]);

export type InviteLookup =
  | { state: "valid"; invitation: Invitation }
  | { state: "expired" }
  | { state: "used" }
  | { state: "invalid" };

/**
 * What an invitation token is. An unknown token is invalid, one past its date
 * is expired, and one already used is used: three different things to tell an
 * advocate, because what they do next differs.
 */
export async function getInvite(token: string): Promise<InviteLookup> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not check your invitation.");
  }
  const invitation = mockInvitations.find((i) => i.token === token);
  if (!invitation) return { state: "invalid" };
  if (used.has(token)) return { state: "used" };
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return { state: "expired" };
  return { state: "valid", invitation: structuredClone(invitation) };
}

export interface OnboardingInput {
  password: string;
  passwordRepeat: string;
  barEnrolmentNumber: string;
  stateBarCouncil: string;
  /** The advocate confirms the enrolment details are correct. */
  detailsConfirmed: boolean;
  declaredConflicts: string[];
  /** Or says they have none to declare. One of the two is required. */
  noConflictsToDeclare: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;

/** What is wrong with an onboarding, by what it is about. Shared with the form. */
export function onboardingProblems(input: OnboardingInput): string[] {
  const problems: string[] = [];
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  } else if (input.password !== input.passwordRepeat) {
    problems.push("The two passwords do not match.");
  }
  if (!input.barEnrolmentNumber.trim() || !input.stateBarCouncil.trim()) {
    problems.push("Give your Bar enrolment number and your State Bar Council.");
  }
  if (!input.detailsConfirmed) problems.push("Confirm your enrolment details are correct.");
  const declared = input.declaredConflicts.some((c) => c.trim());
  if (!declared && !input.noConflictsToDeclare) {
    problems.push("Declare a conflict, or say you have none to declare.");
  }
  return problems;
}

/**
 * Accept the invitation. The password is a stand-in: nothing here stores,
 * hashes or checks it beyond its length, because the preview has no
 * credentials to handle and a real identity provider replaces this step.
 *
 * What the advocate declares goes into the same list the claim check reads
 * (lib/api/advocate.ts), so a conflict declared on joining stops a claim. An
 * invitation is used once. Nothing here assigns the advocate a document:
 * onboarding ends at the queue, and they claim what they choose.
 */
export async function completeOnboarding(
  token: string,
  input: OnboardingInput,
): Promise<AdvocateProfile> {
  await randomDelay(400, 800);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not complete your onboarding. Nothing was saved.");
  }
  const found = mockInvitations.find((i) => i.token === token);
  if (!found) throw new MockApiError("This invitation is not valid.");
  if (used.has(token)) throw new MockApiError("This invitation has already been used.");
  if (new Date(found.expiresAt).getTime() < Date.now()) {
    throw new MockApiError("This invitation has expired.");
  }
  const problems = onboardingProblems(input);
  if (problems.length > 0) throw new MockApiError(problems[0]);

  used.add(token);
  return recordOnboarding({
    barEnrolmentNumber: input.barEnrolmentNumber,
    stateBarCouncil: input.stateBarCouncil,
    declaredConflicts: input.noConflictsToDeclare ? [] : input.declaredConflicts,
  });
}
