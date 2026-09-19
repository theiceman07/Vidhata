import Link from "next/link";
import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { IndiaChecks } from "@/components/marketing/india-checks";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div>
      <header className="border-b border-line px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="font-display text-h3 text-ink">Vidhata</span>
          <nav className="flex items-center gap-4 text-body">
            <Link href="/pricing" className="text-muted-fg hover:text-ink">
              Pricing
            </Link>
            <Link href="/login" className="text-muted-fg hover:text-ink">
              Client login
            </Link>
            <Button asChild size="sm">
              <Link href="/new">Start a deal</Link>
            </Button>
          </nav>
        </div>
      </header>

      <Hero />
      <FeatureGrid />
      <IndiaChecks />
      <LogoCloud />

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="mb-3 font-display text-h2 text-ink">
          Ready to settle your next contract?
        </h2>
        <Button asChild size="lg">
          <Link href="/new">Start a deal</Link>
        </Button>
      </section>

      <footer className="border-t border-line px-4 py-6 text-center text-small text-muted-fg">
        Vidhata · AI-drafted, lawyer-verified ·{" "}
        <Link href="/lawyer-login" className="hover:text-ink">
          Advocate login
        </Link>
      </footer>
    </div>
  );
}
