import type { ReviewTier } from "@/lib/types";

/**
 * Every price the product states lives here, so changing one is one edit.
 * The figures are indicative until willingness to pay is validated, and the
 * pages that show them say so.
 */
export const PRICING_IS_INDICATIVE = true;

export interface TierPricing {
  label: string;
  price: string;
  description: string;
  /** What this tier adds to the review every tier gets. */
  adds: string[];
}

export const TIER_ORDER: ReviewTier[] = ["standard", "enhanced", "senior"];

export const TIER_PRICING: Record<ReviewTier, TierPricing> = {
  standard: {
    label: "Standard",
    price: "₹4,999",
    description: "NDAs and low-value vendor agreements.",
    adds: [],
  },
  enhanced: {
    label: "Enhanced",
    price: "₹12,999",
    description: "MSAs and mid-value deals with an MSME counterparty.",
    adds: ["Priority turnaround"],
  },
  senior: {
    label: "Senior review",
    price: "₹24,999",
    description: "High-value or employment agreements needing senior sign-off.",
    adds: ["Priority turnaround", "Senior advocate review"],
  },
};

/** A paid conversation with the advocate who settled the document. */
export const CONSULTATION = {
  label: "Consultation with your settling advocate",
  price: "₹2,999",
};

/** What a document shows before screening has assigned a tier. */
export const TIER_PENDING_LABEL = "Assigned after screening";

export function tierLabel(tier: ReviewTier | null): string {
  return tier ? TIER_PRICING[tier].label : TIER_PENDING_LABEL;
}
