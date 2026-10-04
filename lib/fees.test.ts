import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONSULTATION,
  PRICE_BASIS,
  TIER_ORDER,
  TIER_PRICING,
  rupees,
  tierRange,
} from "./config/pricing";
import { isReleased } from "./api/documents";
import { mockDocuments } from "./mock/documents.mock";

describe("the fees", () => {
  it("are flat whole-rupee amounts, dearer as the tier is", () => {
    const amounts = TIER_ORDER.map((t) => TIER_PRICING[t].amount);
    for (const amount of amounts) {
      expect(Number.isInteger(amount)).toBe(true);
      expect(amount).toBeGreaterThan(0);
    }
    expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
    expect(Number.isInteger(CONSULTATION.amount)).toBe(true);
  });

  it("are shown from the number, so the display cannot disagree with it", () => {
    for (const t of TIER_ORDER) expect(TIER_PRICING[t].price).toBe(rupees(TIER_PRICING[t].amount));
    expect(CONSULTATION.price).toBe(rupees(CONSULTATION.amount));
    expect(rupees(4999)).toBe("₹4,999");
    expect(rupees(24999)).toBe("₹24,999");
  });

  it("give the range a client sees before a tier is assigned", () => {
    expect(tierRange()).toEqual({
      low: TIER_PRICING.standard.amount,
      high: TIER_PRICING.senior.amount,
    });
  });

  it("are quoted before GST, never as a bare total", () => {
    expect(PRICE_BASIS).toBe("before GST");
  });
});

describe("the fixtures' payments", () => {
  it("exist for every released document and no other, at the tier's flat fee", () => {
    for (const doc of mockDocuments) {
      if (isReleased(doc)) {
        expect(doc.payment, doc.id).toBeDefined();
        expect(doc.payment!.amount, doc.id).toBe(TIER_PRICING[doc.tier!].amount);
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
