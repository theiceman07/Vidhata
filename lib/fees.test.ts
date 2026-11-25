import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONSULTATION, rupees } from "./config/pricing";
import { PLANS, PLAN_BY_ID, planCovers, plansFor } from "./config/plans";
import { isReleased } from "./api/documents";
import { mockDocuments } from "./mock/documents.mock";

describe("the plans", () => {
  it("are whole-rupee amounts per contract, dearer up the list, and only Freemium is free", () => {
    const amounts = PLANS.map((p) => p.amount);
    for (const amount of amounts) expect(Number.isInteger(amount)).toBe(true);
    expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
    expect(PLANS.filter((p) => p.amount === 0).map((p) => p.id)).toEqual(["freemium"]);
    expect(Number.isInteger(CONSULTATION.amount)).toBe(true);
  });

  it("are shown from the number, so the display cannot disagree with it", () => {
    for (const p of PLANS.filter((p) => p.amount > 0)) expect(p.price).toBe(rupees(p.amount));
    expect(rupees(2499)).toBe("₹2,499");
  });

  it("give an advocate to every plan but Freemium", () => {
    expect(PLANS.filter((p) => !p.advocateReview).map((p) => p.id)).toEqual(["freemium"]);
  });

  it("cover each agreement the portal drafts, as the owner's table lists them", () => {
    expect(plansFor("nda").map((p) => p.id)).toEqual(["freemium", "standard"]);
    expect(plansFor("vendor").map((p) => p.id)).toEqual(["standard"]);
    expect(plansFor("msa").map((p) => p.id)).toEqual(["business"]);
    expect(plansFor("employment").map((p) => p.id)).toEqual(["business"]);
    expect(planCovers("standard", "msa")).toBe(false);
  });
});

describe("the fixtures' payments", () => {
  it("exist for every released document and no other, at its plan's price", () => {
    for (const doc of mockDocuments) {
      expect(planCovers(doc.plan, doc.type), doc.id).toBe(true);
      if (isReleased(doc)) {
        expect(doc.payment, doc.id).toBeDefined();
        expect(doc.payment!.amount, doc.id).toBe(PLAN_BY_ID[doc.plan].amount);
      } else {
        expect(doc.payment, doc.id).toBeUndefined();
      }
    }
  });
});

// A fee is one fixed amount. Nothing in the product may read as a share of
// legal fees (BCI fee-sharing rules, Architecture §8), and nothing may look
// like it takes card details, because nothing takes payment in this preview.
describe("the money files", () => {
  const root = path.resolve(__dirname, "..");

  function filesUnder(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? filesUnder(full) : [full];
    });
  }

  // Files that carry fee text or take payment. Those not built yet are
  // skipped, so each is covered the moment it exists.
  const files = [
    "lib/config/pricing.ts",
    "lib/config/plans.ts",
    "components/marketing/pricing-table.tsx",
    "components/domain/escalation-prompt.tsx",
    "components/domain/payment-panel.tsx",
    "components/document/document-agent.tsx",
    "lib/billing.ts",
    "lib/api/billing.ts",
    "lib/api/consultations.ts",
    "app/(client)/documents/[id]/consultation/page.tsx",
    "components/domain/consultation-status.tsx",
  ]
    .map((f) => path.join(root, f))
    .concat(filesUnder(path.join(root, "app", "(client)", "billing")))
    .concat(filesUnder(path.join(root, "app", "(lawyer)", "consultations")))
    .concat(filesUnder(path.join(root, "app", "(lawyer)", "payouts")))
    .filter((f) => existsSync(f) && /\.(ts|tsx)$/.test(f));

  it("lists the files it guards", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it("never state a fee as a percentage or a share", () => {
    const share =
      /percent|per cent|commission|revenue.?share|fee.?shar|share of (the|your|legal)|per finding|\d%(?!\])/i;
    const offenders = files.filter((f) => share.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });

  it("never ask for card, UPI or bank details", () => {
    const card =
      /card number|credit card|debit card|\bcvv\b|\bcvc\b|expiry|expiration|cc-number|cc-exp|\bupi\b|net.?banking|account number|\bifsc\b/i;
    const offenders = files.filter((f) => card.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});

// The platform's fee is a flat technology fee, and an advocate's money is
// their own. An advocate screen may show a tier's name and the consultation
// fee an advocate sets, and nothing of what the platform charges for the
// document: no tier price, no payment record, no invoice, no split. A payout
// statement (D10) must list consultation fees and nothing derived from the
// platform fee.
describe("the advocate's screens", () => {
  const root = path.resolve(__dirname, "..");

  function filesUnder(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? filesUnder(full) : [full];
    });
  }

  const files = filesUnder(path.join(root, "app", "(lawyer)")).filter((f) => /\.tsx?$/.test(f));

  it("lists the files it guards", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it("show no document fee, payment record, invoice or split", () => {
    const platformMoney =
      /TIER_PRICING|tierRange|\.payment\b|payFee|invoicesFor|api\/billing|lib\/billing|document fee|platform fee/i;
    const offenders = files.filter((f) => platformMoney.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
