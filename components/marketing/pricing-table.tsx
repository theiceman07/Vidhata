import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/config/plans";
import { LISTED_CATALOGUE } from "@/lib/mock/intake-options.mock";
import { cn } from "@/lib/utils";

/**
 * Four plans, priced per contract, chosen up front (owner's call, 25 Nov 2026). Each card says
 * what the plan includes and which agreements it covers, so a visitor can find their contract and
 * read its price off the card.
 *
 * Not stated until the owner confirms them: turnaround (lib/config/plans.ts), GST, revisions,
 * refunds. Nothing on this page may depend on them.
 */
export function PricingTable() {
  const available = LISTED_CATALOGUE.filter((t) => t.available).length;

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <div key={plan.id} className="flex flex-col rounded-card border border-line bg-paper p-8">
            <h2 className="text-lead font-medium text-ink">{plan.label}</h2>
            <p className="mt-6 font-display text-[clamp(40px,4vw,52px)] font-medium leading-none tracking-[-0.02em] text-ink">
              {plan.price}
            </p>
            <p className="mt-1 text-meta text-muted-fg">{plan.per}</p>

            {plan.summary && <p className="mt-6 border-t border-line pt-5 text-body text-ink">{plan.summary}</p>}
            {plan.warning && (
              <p className="mt-4 flex items-start gap-2 rounded-control bg-move-tint px-4 py-3 text-meta font-medium text-move-text">
                <Icon name="warning" size={18} className="mt-0.5 shrink-0" />
                {plan.warning}
              </p>
            )}
            <ul className={cn("space-y-1.5 text-body", plan.summary ? "mt-4" : "mt-6 border-t border-line pt-5")}>
              {plan.includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-ink">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0 text-ink" />
                  {item}
                </li>
              ))}
              {plan.turnaround && (
                <li className="flex items-start gap-2 text-ink">
                  <Icon name="schedule" size={18} className="mt-0.5 shrink-0 text-ink" />
                  {plan.turnaround}
                </li>
              )}
            </ul>

            <div className="mt-6 flex-1 border-t border-line pt-5">
              <p className="text-meta text-muted-fg">Agreements</p>
              <ul className="mt-2 space-y-1 text-body text-ink">
                {plan.agreements.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className={cn("mt-10 flex flex-col items-center gap-4 text-center")}>
        <Button asChild size="lg">
          <Link href="/request-access">Request access</Link>
        </Button>
        <p className="max-w-xl text-meta text-muted-fg">
          Vidhataa is in preview: no payment is taken, and {available} agreement types can be drafted today.{" "}
          <Link href="/contracts" className="link">
            See which
          </Link>
        </p>
      </div>
    </div>
  );
}
