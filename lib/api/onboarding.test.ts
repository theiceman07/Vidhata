import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPIRED_INVITE_TOKEN,
  VALID_INVITE_TOKEN,
} from "@/lib/mock/invites.mock";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import { declaredConflictNames, getAdvocateProfile } from "./advocate";
import { claimDocument, getDocument } from "./documents";
import {
  completeOnboarding,
  getInvite,
  onboardingProblems,
  type OnboardingInput,
} from "./onboarding";

// The mock layer's failure switch (?fail=1 in a browser), set by a test.
const failure = vi.hoisted(() => ({ on: false }));
vi.mock("./delay", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delay")>();
  return { ...original, shouldSimulateFailure: () => failure.on };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  failure.on = false;
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  const caught = promise.then(
    () => "",
    (e: Error) => e.message,
  );
  await vi.runAllTimersAsync();
  return caught;
}

const complete: OnboardingInput = {
  password: "a-preview-only-secret",
  passwordRepeat: "a-preview-only-secret",
  barEnrolmentNumber: "MH/2210/2018",
  stateBarCouncil: "Bar Council of Maharashtra and Goa",
  detailsConfirmed: true,
  declaredConflicts: ["Sundargarh Logistics"],
  noConflictsToDeclare: false,
};

describe("an invitation", () => {
  it("is valid, expired or invalid, and each says so", async () => {
    const valid = await settle(getInvite(VALID_INVITE_TOKEN));
    expect(valid.state).toBe("valid");
    expect(await settle(getInvite(EXPIRED_INVITE_TOKEN))).toEqual({ state: "expired" });
    expect(await settle(getInvite("not-an-invitation"))).toEqual({ state: "invalid" });
  });

  it("carries the details to confirm, and no more than the advocate needs", async () => {
    const found = await settle(getInvite(VALID_INVITE_TOKEN));
    if (found.state !== "valid") throw new Error("expected a valid invitation");
    expect(found.invitation.barEnrolmentNumber).toBe(CURRENT_ADVOCATE.bar);
    expect(Object.keys(found.invitation).sort()).toEqual(
      ["barEnrolmentNumber", "email", "expiresAt", "invitedAt", "name", "stateBarCouncil", "token"].sort(),
    );
  });

  it("cannot be completed when it is expired or not an invitation", async () => {
    expect(await refusal(completeOnboarding(EXPIRED_INVITE_TOKEN, complete))).toMatch(/expired/);
    expect(await refusal(completeOnboarding("nope", complete))).toMatch(/not valid/);
  });

  it("says when checking fails, rather than calling it invalid", async () => {
    failure.on = true;
    expect(await refusal(getInvite(VALID_INVITE_TOKEN))).toMatch(/Could not check/);
  });
});

describe("what onboarding asks for", () => {
  it("is fine when everything is given", () => {
    expect(onboardingProblems(complete)).toEqual([]);
  });

  it("needs a password that is long enough and matches, and checks nothing else of it", () => {
    expect(onboardingProblems({ ...complete, password: "short", passwordRepeat: "short" })[0]).toMatch(
      /at least 8/,
    );
    expect(onboardingProblems({ ...complete, passwordRepeat: "different-secret" })[0]).toMatch(
      /do not match/,
    );
  });

  it("needs the enrolment details confirmed, not only filled in", () => {
    expect(onboardingProblems({ ...complete, detailsConfirmed: false })).toEqual([
      "Confirm your enrolment details are correct.",
    ]);
    expect(onboardingProblems({ ...complete, barEnrolmentNumber: " " })[0]).toMatch(/Bar enrolment/);
  });

  it("needs a conflict declared, or an explicit statement that there are none", () => {
    const none = { ...complete, declaredConflicts: [], noConflictsToDeclare: false };
    expect(onboardingProblems(none)).toEqual(["Declare a conflict, or say you have none to declare."]);
    expect(onboardingProblems({ ...none, noConflictsToDeclare: true })).toEqual([]);
  });
});

describe("completing onboarding", () => {
  it("saves nothing when it fails, and the invitation is still good", async () => {
    failure.on = true;
    expect(await refusal(completeOnboarding(VALID_INVITE_TOKEN, complete))).toMatch(
      /Nothing was saved/,
    );
    failure.on = false;
    expect((await settle(getInvite(VALID_INVITE_TOKEN))).state).toBe("valid");
    expect((await settle(getAdvocateProfile())).enrolment).toBeNull();
  });

  it("refuses an incomplete onboarding, whatever the form did", async () => {
    expect(
      await refusal(completeOnboarding(VALID_INVITE_TOKEN, { ...complete, detailsConfirmed: false })),
    ).toMatch(/Confirm your enrolment/);
    expect((await settle(getInvite(VALID_INVITE_TOKEN))).state).toBe("valid");
  });

  it("records the enrolment, and the password goes nowhere", async () => {
    const profile = await settle(completeOnboarding(VALID_INVITE_TOKEN, complete));
    expect(profile.enrolment).toMatchObject({
      barEnrolmentNumber: "MH/2210/2018",
      stateBarCouncil: "Bar Council of Maharashtra and Goa",
    });
    expect(JSON.stringify(profile)).not.toMatch(/password|secret/i);
  });

  it("is used once: the invitation is spent, and a second try is refused", async () => {
    expect(await settle(getInvite(VALID_INVITE_TOKEN))).toEqual({ state: "used" });
    expect(await refusal(completeOnboarding(VALID_INVITE_TOKEN, complete))).toMatch(
      /already been used/,
    );
  });

  it("writes the declared conflicts into the list a claim reads, and so stops a claim", async () => {
    // The same list D2 reads, in the same shape: plain names.
    expect(declaredConflictNames()).toContain("Sundargarh Logistics");
    const claim = claimDocument("doc-msa-pending", CURRENT_ADVOCATE, {
      noConflictWithEitherParty: true,
    });
    expect(await refusal(claim)).toMatch(/declared conflict.*Sundargarh Logistics Pvt Ltd/);
  });

  it("assigns the advocate nothing: the document is still unclaimed", async () => {
    const doc = await settle(getDocument("doc-msa-pending"));
    expect(doc?.advocate).toBeNull();
  });
});
