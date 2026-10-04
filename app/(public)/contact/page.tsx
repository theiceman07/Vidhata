import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ContactForm } from "@/components/marketing/contact-form";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Contact",
};

// There is no real inbox yet, so this is a mocked form with a preview note
// rather than an address that would bounce. Swap in the real support address
// before deploying.
export default function ContactPage() {
  return (
    <>
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageHeader title="Contact" backHref="/" backLabel="Home" />
      <ContactForm />
      <p className="mt-4 text-small text-muted-fg">
        For empanelled advocates, use the{" "}
        <Link href="/advocate-login" className="text-accent underline underline-offset-2 hover:no-underline">
          advocate sign-in
        </Link>
        . This form is for general and client enquiries.
      </p>
    </main>
    <SiteFooter />
    </>
  );
}
