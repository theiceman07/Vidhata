import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMetrics } from "./metrics";
import { payFee } from "./documents";
import { refusal, screenedDocument, settle } from "./testing";

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

describe("the metrics", () => {
  it("hold no citation-gate figure: the backend has no verified state to count", async () => {
    const m = await settle(getMetrics());
    expect(m).not.toHaveProperty("fabrication");
    expect(m).not.toHaveProperty("blocked");
  });

  it("say there is no source for the triage override rate and the corpus-currency lag, and give no number", async () => {
    const m = await settle(getMetrics());
    expect(m.triageOverride).toEqual({ state: "no_source" });
    expect(m.corpusLag).toEqual({ state: "no_source" });
  });

  it("say there is no source for the agent's withdrawn replies, which are counted in a client's tab only", async () => {
    const m = await settle(getMetrics());
    expect(m.withdrawnReplies).toEqual({ state: "no_source" });
    // Nothing of a client's questions or replies is read: the metrics hold no figure from the agent.
    expect(JSON.stringify(m)).not.toMatch(/withdrawnReplyCount|SENTINEL/);
  });

  it("count the fixtures' findings from their own fields", async () => {
    const m = await settle(getMetrics());
    expect(m.documentsCounted).toBeGreaterThan(0);
    // The settled NDA's decided findings are among them, so there is an override rate to show.
    expect(m.overrides.denominator).toBeGreaterThan(0);
    expect(m.overrides.numerator).toBeLessThanOrEqual(m.overrides.denominator);
    expect(m.additions.numerator).toBeGreaterThan(0);
    expect(m.additions.numerator).toBeLessThan(m.additions.denominator);
  });

  it("leave a document awaiting payment out of every figure, until it is paid", async () => {
    const before = await settle(getMetrics());
    const unpaid = await screenedDocument();
    expect(unpaid.status).toBe("awaiting_payment");
    expect(unpaid.findings.length).toBeGreaterThan(0);

    const whileUnpaid = await settle(getMetrics());
    expect(whileUnpaid.documentsCounted).toBe(before.documentsCounted);
    expect(whileUnpaid.additions).toEqual(before.additions);
    expect(whileUnpaid.overrides).toEqual(before.overrides);

    await settle(payFee(unpaid.id));
    const afterPaid = await settle(getMetrics());
    expect(afterPaid.documentsCounted).toBe(before.documentsCounted + 1);
    expect(afterPaid.additions.denominator).toBe(before.additions.denominator + unpaid.findings.length);
  });

  it("fail as an error, and read again once it works", async () => {
    failure.on = true;
    expect(await refusal(getMetrics())).toMatch(/Could not load/);
    failure.on = false;
    expect((await settle(getMetrics())).documentsCounted).toBeGreaterThan(0);
  });
});

// They are for an advocate, so they read nothing about money or a consultation.
describe("what the metrics read", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = ["lib/api/metrics.ts", "lib/metrics.ts", "app/(lawyer)/metrics/page.tsx"].map((f) =>
    path.join(root, f),
  );

  it("is no fee, no payment, no invoice and no consultation", () => {
    const forbidden =
      /consultation|invoice|TIER_PRICING|\.payment\b|payFee|api\/billing|lib\/billing|document fee|platform fee/i;
    const offenders = files.filter((f) => forbidden.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
