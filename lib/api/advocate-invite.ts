import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";

/** The kinds of work the panel is asked about, the same groups the contract catalogue uses. */
export const PRACTICE_AREAS = [
  "Commercial contracts",
  "Corporate",
  "Employment and HR",
  "Financial",
  "Real estate",
] as const;

export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export interface AdvocateInviteRequest {
  name: string;
  barEnrolmentNumber: string;
  stateBarCouncil: string;
  practiceAreas: PracticeArea[];
  email: string;
}

/** What is wrong with a request, by field. Empty when it is fine to send. */
export type InviteProblems = Partial<Record<keyof AdvocateInviteRequest, string>>;

/** Shared by the form, so it says the same thing the call would refuse for. */
export function inviteProblems(request: AdvocateInviteRequest): InviteProblems {
  const problems: InviteProblems = {};
  if (!request.name.trim()) problems.name = "Enter your name.";
  if (!request.barEnrolmentNumber.trim()) {
    problems.barEnrolmentNumber = "Enter your Bar enrolment number.";
  }
  if (!request.stateBarCouncil.trim()) {
    problems.stateBarCouncil = "Enter the State Bar Council you are enrolled with.";
  }
  if (request.practiceAreas.length === 0) {
    problems.practiceAreas = "Choose at least one area you practise in.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim())) {
    problems.email = "Enter an email address we can write to.";
  }
  return problems;
}

/**
 * Preview only: nothing is sent and nothing is stored, and the page says so.
 * A request is not an application the product decides. Empanelment is by
 * invitation, and who is invited is not something this call settles.
 */
export async function requestAdvocateInvite(request: AdvocateInviteRequest): Promise<void> {
  await randomDelay();
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send your request.");
  }
  if (Object.keys(inviteProblems(request)).length > 0) {
    throw new MockApiError("Check the details you entered and try again.");
  }
}
