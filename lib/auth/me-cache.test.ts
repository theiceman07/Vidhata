import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ uid: null as string | null, calls: 0 }));

vi.mock("@/lib/api/backend", () => ({
  ownUserId: async () => state.uid,
  authed: async () => {
    state.calls += 1;
    return { token: { id: state.uid }, profile: { full_name: `Name of ${state.uid}` } };
  },
}));

import { ownMe, resetMeCache } from "./identity";

beforeEach(() => {
  resetMeCache();
  state.uid = null;
  state.calls = 0;
});
afterEach(() => resetMeCache());

describe("own /me", () => {
  it("reads once per account and returns its own id and name", async () => {
    state.uid = "a";
    expect(await ownMe()).toEqual({ id: "a", name: "Name of a" });
    await ownMe();
    expect(state.calls).toBe(1);
  });

  it("does not serve the previous account's name or id to the next account", async () => {
    state.uid = "a";
    await ownMe();
    state.uid = "b";
    expect(await ownMe()).toEqual({ id: "b", name: "Name of b" });
    expect(state.calls).toBe(2);
  });

  it("is empty with no session, and forgets the account after sign-out", async () => {
    state.uid = "a";
    await ownMe();
    state.uid = null;
    expect(await ownMe()).toBeNull();
    state.uid = "a";
    await ownMe();
    expect(state.calls).toBe(2);
  });
});
