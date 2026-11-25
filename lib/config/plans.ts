import { rupees } from "./pricing";

/**
 * The plans on the public pricing page (owner's call, 25 Nov 2026). They replace the three review
 * tiers that screening assigned (lib/config/pricing.ts): the client now picks a plan up front, and
 * each plan is priced per contract and covers a set of agreement types.
 *
 * Only the marketing pages read this so far. The portal still runs the screening-assigned tiers in
 * lib/config/pricing.ts and lib/triage.ts; moving it onto these plans is separate work.
 *
 * Turnaround and GST are to be confirmed by the owner. Until a value is set here, no page states
 * one.
 */
export type PlanId = "freemium" | "standard" | "business" | "premium";

export interface Plan {
  id: PlanId;
  label: string;
  /** Rupees. 0 is free. */
  amount: number;
  /** What the amount is per. */
  per: string;
  /** The price as shown, derived so the two cannot disagree. */
  price: string;
  /** What the plan includes, as the owner wrote it. */
  includes: string[];
  /** Whether an advocate reviews and signs off. Freemium does not. */
  advocateReview: boolean;
  agreements: string[];
  /** Days, once the owner confirms them. null: not shown. */
  turnaround: string | null;
}

function plan(p: Omit<Plan, "price">): Plan {
  return { ...p, price: p.amount === 0 ? "₹0" : rupees(p.amount) };
}

export const PLANS: Plan[] = [
  plan({
    id: "freemium",
    label: "Freemium",
    amount: 0,
    per: "per month, 1 contract",
    includes: ["AI drafting", "Basic review"],
    advocateReview: false,
    agreements: ["NDA", "Letter of Intent", "Offer Letter", "Consultancy Agreement", "Basic Service Agreement"],
    turnaround: null,
  }),
  plan({
    id: "standard",
    label: "Standard",
    amount: 2499,
    per: "per contract",
    includes: ["AI drafting", "Indian-law checks", "Advocate review"],
    advocateReview: true,
    agreements: [
      "NDA",
      "SOW",
      "Offer Letter",
      "Confidentiality & IP Assignment",
      "Consultancy Agreement",
      "Vendor Agreement (MSME)",
      "Service Agreement",
    ],
    turnaround: null,
  }),
  plan({
    id: "business",
    label: "Business",
    amount: 4000,
    per: "per contract",
    includes: ["Advanced customisation", "Indian-law checks", "Advocate review"],
    advocateReview: true,
    agreements: [
      "MSA",
      "SLA",
      "Employment Agreement",
      "Sales Agreement",
      "Partnership Deed",
      "Data Processing Agreement",
      "Employment Agreement with ESOP",
    ],
    turnaround: null,
  }),
  plan({
    id: "premium",
    label: "Premium",
    amount: 6000,
    per: "per contract",
    includes: ["Complex drafting", "Detailed legal analysis", "Advocate review"],
    advocateReview: true,
    agreements: [
      "Founders' Agreement",
      "Shareholders' Agreement",
      "Term Sheet (Equity, CCPS, CCD)",
      "Pre-Shareholder Agreement",
    ],
    turnaround: null,
  }),
];

/** The lowest price of a plan with an advocate's review, for "from ₹…" lines. */
export function reviewedFrom(): Plan {
  return PLANS.filter((p) => p.advocateReview).reduce((a, b) => (b.amount < a.amount ? b : a));
}
