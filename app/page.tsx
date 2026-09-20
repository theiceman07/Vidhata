import Link from "next/link";
import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { IndiaChecks } from "@/components/marketing/india-checks";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function LandingPage() {
  return (
    <div>
      <header className="border-b border-line px-4 py-4">
        {/* QA 10.1: widened from max-w-4xl to max-w-6xl — the narrower
            shell on a 1400px viewport was the source of the reported dead
            whitespace either side of every section. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2">
          <Link href="/" className="text-ink">
            <BrandLogo />
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-body">
            <Link href="/pricing" className="text-muted-fg hover:text-ink">
              Pricing
            </Link>
            {/* QA 10.2: Advocate login used to be buried in the footer
                while Client login sat in the header — promoting it here
                makes the two portals visibly peer entry points. */}
            <Link href="/login" className="text-muted-fg hover:text-ink">
              Client login
            </Link>
            <Link href="/lawyer-login" className="text-muted-fg hover:text-ink">
              Advocate login
            </Link>
            <Button asChild size="sm">
              <Link href="/new">Start a deal</Link>
            </Button>
          </nav>
        </div>
      </header>

      <Hero />
      <FeatureGrid />
      <HowItWorks />
      <IndiaChecks />
      <LogoCloud />

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="mb-3 font-display text-h2 text-ink">
          Ready to settle your next contract?
        </h2>
        <Button asChild size="lg">
          <Link href="/new">Start a deal</Link>
        </Button>
      </section>

      <SiteFooter />
    </div>
  );
}
