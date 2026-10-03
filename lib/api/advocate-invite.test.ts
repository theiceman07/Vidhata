import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRACTICE_AREAS,
  inviteProblems,
  requestAdvocateInvite,
  type AdvocateInviteRequest,
} from "./advocate-invite";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const complete: AdvocateInviteRequest = {
  name: "Test Advocate",
  barEnrolmentNumber: "XX/0001/2020",
  stateBarCouncil: "A State Bar Council",
  practiceAreas: ["Commercial contracts"],
  email: "advocate@example.com",
};

describe("what a request for an invitation must say", () => {
  it("is fine to send when every field is given", () => {
    expect(inviteProblems(complete)).toEqual({});
  });

  it("asks for each field the page asks for, and no more", () => {
    expect(
      inviteProblems({
        name: " ",
        barEnrolmentNumber: "",
        stateBarCouncil: "",
        practiceAreas: [],
        email: "not an email",
      }),
    ).toEqual({
      name: expect.any(String),
      barEnrolmentNumber: expect.any(String),
      stateBarCouncil: expect.any(String),
      practiceAreas: expect.any(String),
      email: expect.any(String),
    });
  });

  it("asks about the same groups the contract catalogue does", () => {
    expect(PRACTICE_AREAS).toEqual([
      "Commercial contracts",
      "Corporate",
      "Employment and HR",
      "Financial",
      "Real estate",
    ]);
  });
});

describe("sending it", () => {
  it("resolves for a complete request, sending and storing nothing", async () => {
    const sent = requestAdvocateInvite(complete);
    await vi.runAllTimersAsync();
    await expect(sent).resolves.toBeUndefined();
  });

  it("refuses an incomplete one, whatever the form did", async () => {
    const sent = expect(requestAdvocateInvite({ ...complete, email: "" })).rejects.toThrow(
      /Check the details/,
    );
    await vi.runAllTimersAsync();
    await sent;
  });
});
