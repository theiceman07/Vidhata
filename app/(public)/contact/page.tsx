import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/marketing/contact-form";
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 md:pt-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <div>
            <p className="inline-flex rounded-full bg-parchment px-4 py-1.5 text-meta font-medium text-ink">
              Contact
            </p>
            <h1 className="mt-6 font-display text-display text-ink">Write to us</h1>
            <p className="mt-4 max-w-measure text-lead text-muted-fg">
              For general and client enquiries. Tell us what you need and we will come back to you.
            </p>

            <div className="mt-8 rounded-card bg-parchment p-6">
              <p className="text-meta font-medium text-muted-fg">Are you an empanelled advocate?</p>
              <p className="mt-2 text-body text-ink">
                Use the{" "}
                <Link
                  href="/advocate-login"
                  className="link"
                >
                  advocate sign-in
                </Link>{" "}
                instead. This form is not for review work.
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
