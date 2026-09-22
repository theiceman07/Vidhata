import Link from "next/link";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { PaperTexture } from "@/components/marketing/paper-texture";
import { Hero } from "@/components/marketing/hero";
import { LivingDocument } from "@/components/marketing/living-document";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { IndiaChecks } from "@/components/marketing/india-checks";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Dateline } from "@/components/document/dateline";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/shared/brand-logo";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <PaperTexture />

      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2">
          <Link href="/" className="text-ink">
            <BrandLogo size="lg" />
          </Link>
          <nav className="flex flex-wrap items-center gap-6 text-meta">
            <Link href="/pricing" className="text-muted-fg hover:text-ink">
              Pricing
            </Link>
            {/* QA 10.2: the two portals are peer entry points, so both
                logins sit here rather than one being buried in the
                footer. */}
            <Link href="/login" className="text-muted-fg hover:text-ink">
              Client login
            </Link>
            <Link
              href="/advocate-login"
              className="text-muted-fg hover:text-ink"
            >
              Advocate login
            </Link>
            <Button asChild size="sm">
              <Link href="/new">Start a document</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Beat one · the type is the design. */}
      <Hero />

      {/* Beat two · the thesis, played out on real clause text. */}
      <LivingDocument />

      <HowItWorks />
      <FeatureGrid />
      <IndiaChecks />

      <section className="mx-auto max-w-6xl px-6 py-[clamp(72px,10vw,140px)]">
        <Dateline segments={["Start here"]} />
        <h2 className="mt-4 max-w-2xl font-display text-h1 text-ink">
          Put your next contract in front of an advocate.
        </h2>
        <p className="mt-4 max-w-xl text-body text-muted-fg">
          Describe the deal. The first pass drafts it and checks every
          citation against source. An advocate settles it and signs.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/new">Start a document</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </SmoothScroll>
  );
}
