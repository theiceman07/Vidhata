import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

// Every route sets its own title and description.
export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Fixed, transparent pricing by review tier for AI-drafted, advocate-verified contracts.",
};

/**
 * Pricing follows the landing page: a short opening on white, the tiers
 * on a full-width band, then the questions.
 */
export default function PricingPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 text-center md:pt-32">
          <h1 className="mx-auto max-w-3xl font-display text-display text-ink">
            One fixed price per document.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lead text-muted-fg">
            Priced by review tier. No hourly billing.
          </p>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-28">
            <PricingTable />
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
          <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <h2 className="font-display text-h1 text-ink">Questions, answered</h2>
            <Faq />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
