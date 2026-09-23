import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewTier } from "@/lib/types";

interface Tier {
  tier: ReviewTier;
  label: string;
  price: string;
  description: string;
  /** What this tier adds to the review every tier gets. */
  adds: string[];
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    tier: "standard",
    label: "Standard",
    price: "₹4,999",
    description: "NDAs and low-value vendor agreements.",
    adds: [],
  },
  {
    tier: "enhanced",
    label: "Enhanced",
    price: "₹12,999",
    description: "MSAs and mid-value deals with an MSME counterparty.",
    adds: ["Priority turnaround"],
    featured: true,
  },
  {
    tier: "senior",
    label: "Senior review",
    price: "₹24,999",
    description: "High-value or employment agreements needing senior sign-off.",
    adds: ["Priority turnaround", "Senior advocate review"],
  },
];

/** The same in every tier, so it is said once rather than ticked three times. */
const EVERY_TIER = [
  "AI drafting from the curated corpus",
  "7-layer statutory screen",
  "Advocate sign-off",
  "Execution checklist",
];

/**
 * Three tiers, compared on what differs.
 *
 * A matrix of identical ticks makes the reader do the subtraction. Here
 * what every tier includes is stated once, and each tier lists only what
 * it adds. The middle tier is marked by weight, not by a tinted panel:
 * the accent belongs to decisions, not to a sales emphasis.
 */
export function PricingTable() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.tier}
            className={cn(
              "flex flex-col rounded-card bg-paper p-8 md:p-10",
              t.featured && "ring-2 ring-ink",
            )}
          >
            <div className="flex min-h-8 items-center justify-between gap-2">
              <h3 className="text-lead font-medium text-ink">{t.label}</h3>
              {t.featured && (
                <span className="rounded-full bg-ink px-3 py-1 text-meta font-medium text-paper">Suits most MSAs</span>
              )}
            </div>
            <p className="mt-6 font-display text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.02em] text-ink">{t.price}</p>
            <p className="mt-3 text-body text-muted-fg">{t.description}</p>

            <div className="mt-6 flex-1 border-t border-line pt-5 text-body">
              {t.adds.length === 0 ? (
                <p className="text-muted-fg">The full review every tier includes.</p>
              ) : (
                <>
                  <p className="text-muted-fg">The full review, and:</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {t.adds.map((a) => (
                      <li key={a} className="flex items-center gap-2 text-ink">
                        <Icon name="check" size={16} className="text-verified" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <Button
              asChild
              size="lg"
              className="mt-8 w-full"
              variant={t.featured ? "default" : "outline"}
            >
              <Link href="/new">Choose {t.label}</Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-card bg-paper p-8 md:p-10">
        <p className="font-display text-h2 text-ink">Every tier includes</p>
        <ul className="mt-5 grid gap-x-8 gap-y-3 text-body text-ink sm:grid-cols-2">
          {EVERY_TIER.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Icon name="check" size={18} className="text-verified" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* The wizard has a tier step, but there is no checkout anywhere in
          the product, so say so once instead of implying a purchase. */}
      <p className="mt-6 text-center text-meta text-muted-fg">
        Billing is not enabled in this preview. No payment is taken.
      </p>
    </div>
  );
}
