import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";

// QA 7.2: the public pages had no Terms, Privacy or contact link at all —
// a regulatory-completion gap for a legal-services product. Terms/Privacy
// route to explicitly-marked placeholders (see app/(public)/terms and
// app/(public)/privacy) rather than invented legal copy — a legal
// product's own terms must be written or approved by a qualified person,
// not drafted by this pass.
export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-small text-muted-fg sm:flex-row sm:justify-between sm:text-left">
        <div className="text-ink">
          <BrandLogo className="mb-1" />
          <p className="text-small text-muted-fg">
            AI-drafted, lawyer-verified contracts.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy Policy
          </Link>
          <Link href="/contact" className="hover:text-ink">
            Contact
          </Link>
          <Link href="/lawyer-login" className="hover:text-ink">
            Advocate login
          </Link>
        </nav>
      </div>
      <p className="mt-6 text-center text-small text-muted-fg">
        © {new Date().getFullYear()} Vidhata.
      </p>
    </footer>
  );
}
