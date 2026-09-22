import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: false },
};

// QA 7.2: placeholder, deliberately not drafted here — Vidhata's Terms of
// Service must be written or approved by a qualified person before
// publication on a legal-services product. Shipping the route with an
// explicit "pending" state is safer than either omitting it (the original
// defect) or inventing legal text.
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Terms of Service" backHref="/" backLabel="Home" />
      <div className="rounded-card border border-caution/30 bg-caution/10 p-6 text-body text-ink">
        <p className="font-medium">Terms of Service · pending publication.</p>
        <p className="mt-2 text-muted-fg">
          This page is a placeholder. Vidhata&apos;s Terms of Service are
          being drafted by qualified counsel and will be published here
          before general availability. If you need terms information now,
          contact us via the{" "}
          <a href="/contact" className="text-accent hover:underline">
            contact page
          </a>
          .
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
