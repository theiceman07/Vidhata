import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSULTATION, TIER_PRICING } from "@/lib/config/pricing";
import { mockConsultations } from "@/lib/mock/consultations.mock";
import {
  acceptConsultation,
  answerConsultation,
  declineConsultation,
  getAdvocateConsultation,
  getPayoutStatement,
  payConsultation,
  requestConsultation,
} from "./consultations";

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

/** The answered requests the preview starts an advocate with, read from the fixtures. */
const seeded = (advocateId: string) =>
  mockConsultations.filter((c) => c.advocateId === advocateId && c.status === "answered");

// Settled by Rhea Kapoor (adv-1) and by Ananya Rao (adv-current).
const rheaDoc = "doc-nda-settled";
const ananyaDoc = "doc-nda-settled-2";
const rhea = "adv-1";
const ananya = "adv-current";

/** Ask, accept, pay and answer: the whole way to a line on the statement. */
async function earn(documentId: string, advocateId: string, question: string) {
  const asked = await settle(requestConsultation(documentId, question));
  await settle(acceptConsultation(advocateId, asked.id));
  await settle(payConsultation(asked.id));
  await settle(answerConsultation(advocateId, asked.id, "An answer."));
  return asked;
}

describe("an advocate's payout statement", () => {
  it("starts as the preview's own answered requests, and no other: nothing for an advocate who has none", async () => {
    expect(seeded(rhea)).toEqual([]);
    expect(await settle(getPayoutStatement(rhea))).toEqual({ lines: [], total: 0 });
  });

  it("lists the preview's answered request for the advocate who answered it, at its fee, before GST", async () => {
    const mine = seeded(ananya);
    expect(mine.length).toBeGreaterThan(0);
    const statement = await settle(getPayoutStatement(ananya));
    expect(statement.lines.map((l) => [l.consultationId, l.documentId, l.documentTitle, l.answeredAt, l.amount])).toEqual(
      [...mine]
        .sort((a, b) => b.answeredAt!.localeCompare(a.answeredAt!))
        .map((c) => [c.id, c.documentId, c.documentTitle, c.answeredAt, c.fee]),
    );
    expect(statement.total).toBe(mine.reduce((sum, c) => sum + c.fee!, 0));
  });

  it("lists the fee on each answered consultation, with its document and the day", async () => {
    const asked = await earn(rheaDoc, rhea, "Can the term be extended?");
    const statement = await settle(getPayoutStatement(rhea));
    expect(statement.lines).toEqual([
      {
        consultationId: asked.id,
        documentId: rheaDoc,
        documentTitle: asked.documentTitle,
        answeredAt: expect.any(String),
        amount: CONSULTATION.amount,
      },
    ]);
    expect(Number.isNaN(new Date(statement.lines[0].answeredAt).getTime())).toBe(false);
    expect(statement.total).toBe(CONSULTATION.amount);
  });

  it("is built from the fee the advocate set, and from nothing the platform charges", async () => {
    const statement = await settle(getPayoutStatement(rhea));
    const platform = Object.values(TIER_PRICING).map((t) => t.amount);
    for (const line of statement.lines) {
      expect(line.amount).toBe(CONSULTATION.amount);
      expect(platform).not.toContain(line.amount);
    }
    // Nothing but these fields: no client, no question, no answer, no payment, no share.
    for (const line of statement.lines) {
      expect(Object.keys(line).sort()).toEqual(
        ["amount", "answeredAt", "consultationId", "documentId", "documentTitle"].sort(),
      );
    }
    expect(Object.keys(statement).sort()).toEqual(["lines", "total"]);
  });

  it("does not list what has earned nothing yet: open, declined, accepted or paid but unanswered", async () => {
    const open = await settle(requestConsultation(rheaDoc, "Left open."));
    const declined = await settle(requestConsultation(rheaDoc, "Will be declined."));
    await settle(declineConsultation(rhea, declined.id));
    const accepted = await settle(requestConsultation(rheaDoc, "Accepted, unpaid."));
    await settle(acceptConsultation(rhea, accepted.id));
    const paid = await settle(requestConsultation(rheaDoc, "Paid, unanswered."));
    await settle(acceptConsultation(rhea, paid.id));
    await settle(payConsultation(paid.id));

    const listed = (await settle(getPayoutStatement(rhea))).lines.map((l) => l.consultationId);
    for (const earned of [open, declined, accepted, paid]) {
      expect(listed).not.toContain(earned.id);
    }
  });

  it("is each advocate's own, and another's lines are not in it", async () => {
    const hers = await earn(ananyaDoc, ananya, "A question for Ananya.");
    const mine = (await settle(getPayoutStatement(rhea))).lines.map((l) => l.consultationId);
    const theirs = (await settle(getPayoutStatement(ananya))).lines.map((l) => l.consultationId);
    // Hers: the one just earned, beside any the preview starts her with.
    expect([...theirs].sort()).toEqual([hers.id, ...seeded(ananya).map((c) => c.id)].sort());
    expect(mine).not.toContain(hers.id);
    for (const c of seeded(ananya)) expect(mine).not.toContain(c.id);
    expect(await settle(getPayoutStatement("adv-nobody"))).toEqual({ lines: [], total: 0 });
  });

  it("reaches another advocate's request no more than a made-up one: the same not-found", async () => {
    const hers = await earn(ananyaDoc, ananya, "Another question for Ananya.");
    const other = await settle(getAdvocateConsultation(rhea, hers.id));
    const missing = await settle(getAdvocateConsultation(rhea, "consultation-does-not-exist"));
    expect(other).toBeNull();
    expect(missing).toBe(other);
  });

  it("sums its lines, newest first", async () => {
    const statement = await settle(getPayoutStatement(rhea));
    expect(statement.total).toBe(statement.lines.reduce((s, l) => s + l.amount, 0));
    const days = statement.lines.map((l) => l.answeredAt);
    expect([...days].sort().reverse()).toEqual(days);
  });
});

describe("the payout statement's screen", () => {
  const root = path.resolve(__dirname, "../..");
  const page = readFileSync(path.join(root, "app", "(lawyer)", "payouts", "page.tsx"), "utf8");

  it("says the amounts are before GST, and ranks, rates and compares nobody", () => {
    expect(page).toMatch(/PRICE_BASIS|before GST/);
    expect(page).not.toMatch(/rank|rating|leaderboard|compar|average|percentile|top advocate/i);
  });

  it("reads its figures from the API alone, and invents no total of its own", () => {
    expect(page).toMatch(/getPayoutStatement/);
    expect(page).not.toMatch(/\.reduce\(/);
  });
});
