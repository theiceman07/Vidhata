import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCitation, listCitationAttempts } from "./citations";

// The mock layer waits a little, as a network would; fake timers skip it.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

const base = { documentId: "doc-vendor-revision", advocateId: "adv-2" };

describe("checking a typed citation", () => {
  it("verifies an exact match, and records that it was tried", async () => {
    const result = await settle(
      checkCitation({ ...base, input: "indian contract act, 1872, s.74" }),
    );
    expect(result.status).toBe("verified");
    expect(result.corpusRef).toBe("ica-1872-s74");

    const [last] = (await settle(listCitationAttempts())).slice(-1);
    expect(last).toMatchObject({
      documentId: "doc-vendor-revision",
      advocateId: "adv-2",
      input: "indian contract act, 1872, s.74",
      outcome: "verified",
      corpusRef: "ica-1872-s74",
      reason: null,
    });
  });

  it("blocks a near-miss and records the blocked attempt with its reason", async () => {
    const result = await settle(
      checkCitation({ ...base, input: "Indian Contract Act, 1872 s.74" }),
    );
    expect(result.status).toBe("blocked");

    const [last] = (await settle(listCitationAttempts())).slice(-1);
    expect(last).toMatchObject({
      input: "Indian Contract Act, 1872 s.74",
      outcome: "blocked",
      corpusRef: null,
      reason: "not_in_corpus",
    });
  });

  it("records exactly what was typed, before any tidying", async () => {
    await settle(checkCitation({ ...base, input: "  Some   made up   case  " }));
    const [last] = (await settle(listCitationAttempts())).slice(-1);
    expect(last.input).toBe("  Some   made up   case  ");
  });

  it("records an empty attempt as blocked, with the reason", async () => {
    await settle(checkCitation({ ...base, input: "   " }));
    const [last] = (await settle(listCitationAttempts())).slice(-1);
    expect(last).toMatchObject({ outcome: "blocked", reason: "empty" });
  });

  it("keeps every attempt, oldest first, so a rate can be computed from them", async () => {
    const before = (await settle(listCitationAttempts())).length;
    await settle(checkCitation({ ...base, input: "ica-1872-s28" }));
    await settle(checkCitation({ ...base, input: "not a citation" }));
    const attempts = await settle(listCitationAttempts());

    expect(attempts).toHaveLength(before + 2);
    const [first, second] = attempts.slice(-2);
    expect([first.outcome, second.outcome]).toEqual(["verified", "blocked"]);
    expect([first.input, second.input]).toEqual(["ica-1872-s28", "not a citation"]);
    // The fake clock restarts for each test, so order is read from the
    // sequence the log keeps, not compared across tests by time.
    expect(Number(second.id.replace("attempt-", ""))).toBeGreaterThan(
      Number(first.id.replace("attempt-", "")),
    );
    expect(second.at >= first.at).toBe(true);
  });
});
