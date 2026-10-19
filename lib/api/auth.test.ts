import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signOutFn = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({
  getSupabaseClient: () => ({ auth: { signInWithPassword, signOut: signOutFn } }),
}));

import { NO_SUCH_ACCOUNT, signInToPortal } from "@/lib/api/auth";

const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const session = (role: string | null) => ({
  data: { session: { access_token: `${b64url({})}.${b64url(role ? { user_role: role } : {})}.sig` }, user: { email: "a@b.c" } },
  error: null,
});

beforeEach(() => {
  signInWithPassword.mockReset();
  signOutFn.mockReset();
});

describe("signInToPortal", () => {
  it("signs a client into the client portal", async () => {
    signInWithPassword.mockResolvedValue(session("startup_user"));
    await expect(signInToPortal("a@b.c", "pw", "client")).resolves.toBeUndefined();
    expect(signOutFn).not.toHaveBeenCalled();
  });

  it("signs an advocate into the advocate portal", async () => {
    signInWithPassword.mockResolvedValue(session("lawyer"));
    await expect(signInToPortal("a@b.c", "pw", "lawyer")).resolves.toBeUndefined();
  });

  it.each([["lawyer", "client"], ["startup_user", "lawyer"], [null, "client"]] as const)(
    "refuses a %s account at the %s door, signs it out, and says no more than for a wrong password",
    async (role, portal) => {
      signInWithPassword.mockResolvedValue(session(role));
      await expect(signInToPortal("a@b.c", "pw", portal)).rejects.toThrow(NO_SUCH_ACCOUNT);
      expect(signOutFn).toHaveBeenCalledOnce();
    },
  );

  it("gives the same message for a wrong password", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: null, user: null }, error: { message: "Invalid login credentials" } });
    await expect(signInToPortal("a@b.c", "bad", "client")).rejects.toThrow(NO_SUCH_ACCOUNT);
  });
});
