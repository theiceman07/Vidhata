import type { Metadata } from "next";
import Link from "next/link";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { PageOpening } from "@/components/marketing/page-opening";
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
        <PageOpening
          title="One fixed price per document."
          lead="Priced by review tier, assigned after screening. No hourly billing."
        />

        <section className="tile-grain w-full bg-parchment">
          <div className="site-wrap py-24 md:py-32">
            <PricingTable />
          </div>
        </section>

        {/* The landing page's questions section, on white here because the
            tiers above already hold the band. */}
        <section className="site-wrap grid gap-x-16 gap-y-10 py-24 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h2 className="font-display text-display text-ink">Questions, answered</h2>
            <p className="mt-6 text-lead text-muted-fg">
              Anything else, write to us and a person replies.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex h-11 items-center rounded-full border border-ink/80 px-5 text-body font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Contact us
            </Link>
          </div>
          <Faq />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
