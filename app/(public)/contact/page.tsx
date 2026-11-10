import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageOpening } from "@/components/marketing/page-opening";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Contact",
};

// There is no real inbox yet, so this is a mocked form with a preview note
// rather than an address that would bounce. Swap in the real support address
// before deploying.
export default function ContactPage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <PageOpening
          title="Write to us"
          lead="For general and client enquiries. Tell us what you need and we will come back to you."
        />

        <section className="tile-grain w-full bg-parchment">
          <div className="site-wrap grid gap-x-16 gap-y-8 py-24 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
            <div className="rounded-card border border-line bg-paper p-8">
              <h2 className="font-display text-h2 text-ink">Are you an empanelled advocate?</h2>
              <p className="mt-3 text-body text-muted-fg">
                Use the{" "}
                <Link href="/advocate-login" className="link">
                  advocate sign-in
                </Link>{" "}
                instead. This form is not for review work.
              </p>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
