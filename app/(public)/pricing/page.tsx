import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";

// QA 4.1: every route used to share the root layout's single <title>.
export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Fixed, transparent pricing by review tier for AI-drafted, advocate-verified contracts.",
};

export default function PricingPage() {
  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader
          title="Pricing"
          description="Fixed, transparent pricing by review tier. No hourly billing."
          backHref="/"
          backLabel="Home"
        />
        <PricingTable />
        <div className="mt-16">
          <h2 className="mb-6 text-center font-display text-h2 text-ink">
            Frequently asked questions
          </h2>
          <Faq />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
