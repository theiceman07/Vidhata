import { describe, expect, it } from "vitest";
import {
  PORTAL_PATHS,
  SESSION_LIFETIME_MS,
  readStoredSession,
  remainingMs,
  serialiseSession,
} from "./session-expiry";

const now = Date.UTC(2026, 9, 4, 10, 0, 0);

describe("reading a stored preview session", () => {
  it("is no session when nothing is stored", () => {
    expect(readStoredSession(null, now)).toEqual({ state: "none" });
    expect(readStoredSession("", now)).toEqual({ state: "none" });
  });

  it("is active within its lifetime, and says when it began", () => {
    const at = now - 60_000;
    expect(readStoredSession(serialiseSession("client", at), now)).toEqual({
      state: "active",
      role: "client",
      startedAt: at,
    });
  });

  it("has expired once its lifetime has passed, and remembers whose it was", () => {
    const at = now - SESSION_LIFETIME_MS;
    expect(readStoredSession(serialiseSession("lawyer", at), now)).toEqual({
      state: "expired",
      role: "lawyer",
    });
    expect(readStoredSession(serialiseSession("lawyer", at + 1), now).state).toBe("active");
  });

  it("keeps a bare role from an earlier preview signed in", () => {
    expect(readStoredSession("client", now)).toEqual({ state: "active", role: "client", startedAt: now });
    expect(readStoredSession("lawyer", now)).toMatchObject({ state: "active", role: "lawyer" });
  });

  it("reads anything else as no session", () => {
    for (const raw of ["admin", "{", "null", "[]", '{"role":"admin","at":1}', '{"role":"client"}', '{"role":"client","at":"x"}']) {
      expect(readStoredSession(raw, now), raw).toEqual({ state: "none" });
    }
  });
});

describe("what is left of a session", () => {
  it("counts down and stops at zero", () => {
    expect(remainingMs(now, now)).toBe(SESSION_LIFETIME_MS);
    expect(remainingMs(now - 1000, now)).toBe(SESSION_LIFETIME_MS - 1000);
    expect(remainingMs(now - SESSION_LIFETIME_MS * 2, now)).toBe(0);
  });
});

describe("the portal an ended session returns to", () => {
  it("is the portal the session was in", () => {
    expect(PORTAL_PATHS.client.signIn).toBe("/login");
    expect(PORTAL_PATHS.lawyer.signIn).toBe("/advocate-login");
  });
});
