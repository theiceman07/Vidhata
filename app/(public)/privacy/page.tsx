import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false },
};

// QA 7.2: same rationale as app/(public)/terms/page.tsx — a placeholder,
// not invented policy text, since this product handles contract data and
// its data-retention/empanelment disclosures need to be accurate, not
// drafted speculatively.
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Privacy Policy" backHref="/" backLabel="Home" />
      <div className="rounded-card border border-caution/30 bg-caution/10 p-6 text-body text-ink">
        <p className="font-medium">Privacy Policy — pending publication.</p>
        <p className="mt-2 text-muted-fg">
          This page is a placeholder. Vidhata handles contract data, so our
          Privacy Policy — including data retention, advocate empanelment
          disclosures, and how findings are stored — will be published here
          before general availability, reviewed by qualified counsel. Note
          also: Vidhata&apos;s chat agent explains the settled document; it
          does not give legal advice. Your advocate&apos;s sign-off is the
          legal act.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
