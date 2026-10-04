import type { ReviewTier } from "@/lib/types";

/**
 * Every price the product states lives here, so changing one is one edit.
 * The figures are indicative until willingness to pay is validated, and the
 * pages that show them say so.
 */
export const PRICING_IS_INDICATIVE = true;

/**
 * What every figure is quoted as. No screen shows a bare rupee amount that
 * reads as final: a real invoice carries a proper tax breakup, which this
 * preview does not compute (see the plan's open items).
 */
export const PRICE_BASIS = "before GST";

/** Whole rupees, Indian grouping: 4999 becomes "₹4,999". */
export function rupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface TierPricing {
  label: string;
  /** Rupees, before GST. The one flat fee for a document in this tier. */
  amount: number;
  /** The same amount for display, derived so the two cannot disagree. */
  price: string;
  description: string;
  /** What this tier adds to the review every tier gets. */
  adds: string[];
}

export const TIER_ORDER: ReviewTier[] = ["standard", "enhanced", "senior"];

function tier(
  label: string,
  amount: number,
  description: string,
  adds: string[],
): TierPricing {
  return { label, amount, price: rupees(amount), description, adds };
}

export const TIER_PRICING: Record<ReviewTier, TierPricing> = {
  standard: tier("Standard", 4999, "NDAs and low-value vendor agreements.", []),
  enhanced: tier(
    "Enhanced",
    12999,
    "MSAs and mid-value deals with an MSME counterparty.",
    ["Priority turnaround"],
  ),
  senior: tier(
    "Senior review",
    24999,
    "High-value or employment agreements needing senior sign-off.",
    ["Priority turnaround", "Senior advocate review"],
  ),
};

/** The cheapest and dearest tier, for a range shown before a tier is assigned. */
export function tierRange(): { low: number; high: number } {
  const amounts = TIER_ORDER.map((t) => TIER_PRICING[t].amount);
  return { low: Math.min(...amounts), high: Math.max(...amounts) };
}

/**
 * A conversation with the advocate who settled the document. A request is
 * free; the fee is payable only if the advocate accepts, so the charge step
 * arrives with the advocate's inbox.
 */
const CONSULTATION_AMOUNT = 2999;
export const CONSULTATION = {
  label: "Consultation with your settling advocate",
  amount: CONSULTATION_AMOUNT,
  price: rupees(CONSULTATION_AMOUNT),
};

/** What a document shows before screening has assigned a tier. */
export const TIER_PENDING_LABEL = "Assigned after screening";

export function tierLabel(tier: ReviewTier | null): string {
  return tier ? TIER_PRICING[tier].label : TIER_PENDING_LABEL;
}
