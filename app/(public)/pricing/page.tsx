import { PageHeader } from "@/components/shared/page-header";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Faq } from "@/components/marketing/faq";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Pricing"
        description="Fixed, transparent pricing by review tier — no hourly billing."
      />
      <PricingTable />
      <div className="mt-16">
        <h2 className="mb-6 text-center font-display text-h2 text-ink">
          Frequently asked questions
        </h2>
        <Faq />
      </div>
    </div>
  );
}
