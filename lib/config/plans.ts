import type { ModelledContractType, PlanId } from "@/lib/types";
import { rupees } from "./pricing";

/**
 * The plans (owner's call, 25 Nov 2026). They replace the three review tiers screening used to
 * assign: the client picks a plan at intake, each plan is priced per contract and covers a set of
 * agreement types, and the plan decides whether an advocate reviews the document. Every price the
 * product states for a document lives here.
 *
 * Turnaround and GST are to be confirmed by the owner. Until a value is set here, no page states
 * one.
 */
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
  /** A plan's own two lines, where it has them (Freemium). Shown on its card in place of the ticks. */
  summary?: string;
  warning?: string;
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
    summary: "One contract a month. You get the AI draft and every finding the screen raises, immediately.",
    warning:
      "No advocate reviews or signs off a Freemium draft. It is a starting point to negotiate from, not a document to sign.",
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

export const PLAN_BY_ID: Record<PlanId, Plan> = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

export function planLabel(plan: PlanId | null | undefined): string {
  return plan ? PLAN_BY_ID[plan].label : "No plan";
}

/**
 * Which plans cover each agreement type the portal can draft, cheapest first. Read from the plans'
 * own agreement lists (an NDA is in Freemium and Standard; a vendor agreement with an MSME in
 * Standard; an MSA and an employment agreement in Business), so the two cannot drift.
 */
const PLAN_AGREEMENT: Record<ModelledContractType, string[]> = {
  nda: ["NDA"],
  vendor: ["Vendor Agreement (MSME)"],
  msa: ["MSA"],
  employment: ["Employment Agreement"],
};

export function plansFor(type: ModelledContractType | "other"): Plan[] {
  if (type === "other") return [];
  const names = PLAN_AGREEMENT[type];
  return PLANS.filter((p) => p.agreements.some((a) => names.includes(a)));
}

export function planCovers(plan: PlanId, type: ModelledContractType | "other"): boolean {
  return plansFor(type).some((p) => p.id === plan);
}

/** Freemium: one contract per organisation per calendar month. */
export const FREEMIUM_MONTHLY_LIMIT = 1;

/** The queue offers the dearest plans first. Freemium never reaches the queue. */
export const PLAN_QUEUE_PRIORITY: Record<PlanId, number> = {
  premium: 0,
  business: 1,
  standard: 2,
  freemium: 3,
};

/**
 * The notice on every Freemium AI draft (Tejaswi, 25 Nov 2026): a persistent banner on the page, and
 * the same line on any export of the file once downloads exist. "Not reviewed." leads it in bold.
 */
export const AI_DRAFT_NOTICE_BODY =
  "This draft was produced by AI and screened against Indian statute. No advocate has reviewed its findings or signed it off. Upgrade to Standard to have an advocate settle every finding and sign.";
