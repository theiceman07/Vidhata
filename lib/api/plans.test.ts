import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intakeSchema } from "@/lib/intakeSchema";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { intakeFromReading, readBrief } from "./brief";
import { shapeClientDocument } from "./client/shape-document";
import {
  createDraftDocument,
  freemiumUsedThisMonth,
  getDocument,
  getQueuePriority,
  isReleased,
  listDocuments,
  payFee,
  startAnalysis,
  type IntakeInput,
} from "./documents";
import { refusal, settle } from "./testing";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T09:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const nda = (over: Partial<IntakeInput> = {}): IntakeInput => ({
  title: "Mutual NDA · Test",
  type: "nda",
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Someone Pvt Ltd",
  stateOfExecution: "Delhi",
  transactionValue: 0,
  counterpartyIsMsme: false,
  durationMonths: 12,
  governingLaw: "Laws of India",
  keyTerms: "",
  plan: "freemium",
  ...over,
});

/** A new organisation per test, so the month's Freemium allowance starts full. */
let orgN = 0;
const freshOrg = () => `org-plans-test-${++orgN}`;

async function screened(input: IntakeInput, org: string) {
  const draft = await settle(createDraftDocument(input, org));
  await settle(startAnalysis(draft.id));
  vi.advanceTimersByTime(60_000);
  return (await settle(getDocument(draft.id)))!;
}

describe("a plan at intake", () => {
  it("must cover the agreement type, in the form and in the API", async () => {
    const parsed = intakeSchema.safeParse({ ...nda(), type: "msa", plan: "standard" });
    expect(parsed.success).toBe(false);
    expect(await refusal(createDraftDocument(nda({ type: "msa", plan: "standard" }), freshOrg()))).toMatch(
      /doesn't cover this agreement/,
    );
  });

  it("is read from a brief only where one plan covers the type", async () => {
    const vendor = await settle(readBrief("Vendor agreement with Orchid Packaging in Gujarat, ₹18 lakh, 12 months"));
    expect(vendor.found.plan).toBe("standard");
    // An NDA is in Freemium and Standard: the client chooses, so intake opens at the plan.
    const ndaBrief = await settle(readBrief("Mutual NDA with Neelgiri Analytics in Tamil Nadu, ₹0, 24 months"));
    expect(ndaBrief.found.plan).toBeUndefined();
    expect(ndaBrief.missing).toContain("plan");
    expect(intakeFromReading(ndaBrief)).toBeNull();
  });
});

describe("Freemium", () => {
  it("is handed to the client as an AI draft, never to an advocate and never charged", async () => {
    const doc = await screened(nda(), freshOrg());
    expect(doc.status).toBe("ai_draft");
    expect(doc.payment).toBeUndefined();
    expect(isReleased(doc)).toBe(false);
    expect((await settle(listDocuments())).some((d) => d.id === doc.id)).toBe(false);
    expect(await refusal(payFee(doc.id))).toMatch(/not awaiting payment/);
  });

  it("is the client's to read in full, with no sign-off and no checklist", async () => {
    const doc = await screened(nda(), freshOrg());
    const client = shapeClientDocument(doc);
    expect(client.signOff).toBeNull();
    expect(client.clauses).toHaveLength(doc.clauses.length);
    expect(client.otherClauseCount).toBe(0);
    expect(client.findingList.every((f) => f.detail !== null)).toBe(true);
    expect(client.executionSteps).toEqual([]);
  });

  it("covers one contract per organisation per calendar month", async () => {
    const org = freshOrg();
    await settle(createDraftDocument(nda(), org));
    expect(freemiumUsedThisMonth(org)).toBe(1);
    expect(await refusal(createDraftDocument(nda({ title: "Second NDA" }), org))).toMatch(/one contract a month/);
    // Standard is still there for the same agreement.
    const paid = await settle(createDraftDocument(nda({ title: "Second NDA", plan: "standard" }), org));
    expect(paid.plan).toBe("standard");
    // Next month the allowance is back.
    vi.setSystemTime(new Date("2026-12-02T09:00:00.000Z"));
    expect(freemiumUsedThisMonth(org)).toBe(0);
  });
});

describe("a plan with an advocate", () => {
  it("awaits the plan's fee after screening, and is released once paid", async () => {
    const doc = await screened(nda({ plan: "standard" }), freshOrg());
    expect(doc.status).toBe("awaiting_payment");
    const paid = await settle(payFee(doc.id));
    expect(paid.payment?.amount).toBe(2499);
    expect(isReleased(paid)).toBe(true);
  });

  it("is offered in the queue dearest plan first", () => {
    expect(getQueuePriority({ plan: "premium" })).toBeLessThan(getQueuePriority({ plan: "business" }));
    expect(getQueuePriority({ plan: "business" })).toBeLessThan(getQueuePriority({ plan: "standard" }));
  });
});

describe("the preview's own organisation", () => {
  it("still has this month's free contract, so Freemium can be tried", () => {
    expect(freemiumUsedThisMonth(MOCK_CLIENT_ORG.id, new Date("2026-11-25T09:00:00.000Z"))).toBe(0);
  });
});
