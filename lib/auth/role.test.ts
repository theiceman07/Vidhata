import { describe, expect, it } from "vitest";
import { portalOfAccessToken, portalOfClaim } from "@/lib/auth/role";

const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const token = (claims: unknown) => `${b64url({ alg: "none" })}.${b64url(claims)}.sig`;

describe("portalOfClaim", () => {
  it.each([["startup_user", "client"], ["lawyer", "lawyer"], ["admin", null], [undefined, null], [42, null]])(
    "%s -> %s",
    (claim, portal) => expect(portalOfClaim(claim)).toBe(portal),
  );
});

describe("portalOfAccessToken", () => {
  it("reads the user_role claim", () => {
    expect(portalOfAccessToken(token({ user_role: "lawyer", org_id: null }))).toBe("lawyer");
    expect(portalOfAccessToken(token({ user_role: "startup_user" }))).toBe("client");
  });
  it("gives null for a token with no role, or one that cannot be read", () => {
    expect(portalOfAccessToken(token({ sub: "x" }))).toBeNull();
    expect(portalOfAccessToken("not-a-token")).toBeNull();
    expect(portalOfAccessToken("a.%%%.c")).toBeNull();
    expect(portalOfAccessToken(`a.${b64url("text")}.c`)).toBeNull();
    expect(portalOfAccessToken("")).toBeNull();
  });
});
