import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import {
  CONSULTATION,
  PRICE_BASIS,
  PRICING_IS_INDICATIVE,
  TIER_ORDER,
  TIER_PRICING,
} from "@/lib/config/pricing";

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
 * The client does not pick a tier: screening assigns it after the first
 * pass, from the value and risk of the deal. So the cards describe what each
 * tier is for rather than offering a choice, and there is one way in. A
 * matrix of identical ticks makes the reader do the subtraction, so what
 * every tier includes is stated once and each tier lists only what it adds.
 */
export function PricingTable() {
  return (
    <div>
      <p className="mx-auto mb-8 max-w-xl text-center text-body text-muted-fg">
        Your document is assigned a tier after screening, based on its value
        and risk. You don&apos;t have to guess which one you need.
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const t = TIER_PRICING[tier];
          return (
            <div
              key={tier}
              className="flex flex-col rounded-card bg-paper p-8 md:p-10"
            >
              <h3 className="text-lead font-medium text-ink">{t.label}</h3>
              <p className="mt-6 font-display text-[clamp(40px,4vw,56px)] font-medium leading-none tracking-[-0.02em] text-ink">
                {t.price}
              </p>
              <p className="mt-1 text-meta text-muted-fg">{PRICE_BASIS}</p>
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
            </div>
          );
        })}
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

      <div className="mt-5 flex flex-col gap-3 rounded-card bg-paper p-8 sm:flex-row sm:items-center sm:justify-between md:p-10">
        <div>
          <p className="font-display text-h2 text-ink">{CONSULTATION.label}</p>
          <p className="mt-2 max-w-measure text-body text-muted-fg">
            Separate from the review. A conversation with the advocate who
            settled your document, about what it means for you. A request is
            free, and the fee is payable only if the advocate accepts.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-h2 text-ink">{CONSULTATION.price}</p>
          <p className="text-meta text-muted-fg">{PRICE_BASIS}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg">
          <Link href="/new">Start a document</Link>
        </Button>
      </div>

      {/* There is no checkout anywhere in the product, so say so once
          instead of implying a purchase. */}
      <p className="mt-6 text-center text-meta text-muted-fg">
        {PRICING_IS_INDICATIVE && "Indicative pricing. "}
        All figures are {PRICE_BASIS}. Preview: no payment is taken.
      </p>
    </div>
  );
}
