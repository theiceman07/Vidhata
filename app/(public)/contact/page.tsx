import type { Metadata } from "next";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Contact",
};

// QA 7.2: unlike Terms/Privacy, contact information doesn't need legal
// review to ship — but a real inbox does need to exist before this goes
// live. hello@vidhata.example uses the reserved .example TLD as a
// placeholder — swap for the real support address before deploying.
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Contact" backHref="/" backLabel="Home" />
      <div className="rounded-card border border-line bg-paper p-6 shadow-card">
        <p className="flex items-center gap-2 text-body text-ink">
          <Icon name="mail" size={18} className="text-accent" />
          <a href="mailto:hello@vidhata.example" className="hover:underline">
            hello@vidhata.example
          </a>
        </p>
        <p className="mt-2 text-small text-muted-fg">
          We typically respond within one business day. For empanelled
          advocates, use the{" "}
          <a href="/advocate-login" className="text-accent hover:underline">
            advocate sign-in
          </a>{" "}
          · this address is for general and client enquiries.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
