import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  NON_ESSENTIAL_IN_USE,
  consentStatement,
  readConsent,
  serialiseConsent,
} from "./consent";

const now = Date.UTC(2026, 9, 4, 10, 0, 0);

describe("the consent on record", () => {
  it("is none until an answer is given", () => {
    expect(readConsent(null)).toBeNull();
    expect(readConsent("")).toBeNull();
  });

  it("reads back what was answered", () => {
    expect(readConsent(serialiseConsent("declined", now))).toEqual({
      choice: "declined",
      version: CONSENT_VERSION,
      at: now,
    });
    expect(readConsent(serialiseConsent("accepted", now))?.choice).toBe("accepted");
  });

  it("is none for an answer to an earlier version of the question", () => {
    const old = JSON.stringify({ choice: "accepted", version: "older", at: now });
    expect(readConsent(old)).toBeNull();
  });

  it("is none for anything unreadable", () => {
    for (const raw of ["{", "null", "[]", '{"choice":"maybe","version":"preview-1","at":1}', '{"choice":"accepted","version":"preview-1"}']) {
      expect(readConsent(raw), raw).toBeNull();
    }
  });
});

describe("what the banner says", () => {
  it("lists no non-essential tool while the preview runs none", () => {
    // Adding analytics means adding it here, and this test is the reminder that
    // the banner's wording, the version and counsel's review all follow.
    expect(NON_ESSENTIAL_IN_USE).toEqual([]);
    expect(consentStatement()).toMatch(/sets no cookies beyond what the site needs/);
  });

  it("names what would run, once something does", () => {
    const line = consentStatement(["usage analytics"]);
    expect(line).toMatch(/usage analytics/);
    expect(line).not.toMatch(/sets no cookies/);
  });
});
