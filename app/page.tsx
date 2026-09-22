import Link from "next/link";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { PaperTexture } from "@/components/marketing/paper-texture";
import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { LivingDocument } from "@/components/marketing/living-document";
import { IndiaChecks } from "@/components/marketing/india-checks";
import { Accountability } from "@/components/marketing/accountability";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Dateline } from "@/components/document/dateline";
import { Button } from "@/components/ui/button";

/**
 * The landing page follows the same arc the product does: a document, a
 * machine reading, a human decision, a settled result. Each section is a
 * stage of that arc rather than a feature grid, and every clause,
 * finding and citation on the page is read from the fixtures the product
 * itself runs on.
 */
export default function LandingPage() {
  return (
    <SmoothScroll>
      <PaperTexture />
      <SiteHeader />

      {/* The thesis, and the product doing it. */}
      <Hero />

      {/* The arc every document travels, on real clause text. */}
      <LivingDocument />

      {/* What a generic drafting tool cannot do here. */}
      <IndiaChecks />

      {/* The claim the product rests on, and the seal. */}
      <Accountability />

      <section className="mx-auto max-w-[95rem] px-6 py-[clamp(72px,10vw,140px)] lg:px-10">
        <div className="border-t-2 border-ink pt-10">
          <Dateline segments={["Start here"]} />
          <h2 className="mt-4 max-w-3xl font-display text-display text-ink">
            Put your next contract in front of an advocate.
          </h2>
          <p className="mt-8 max-w-xl text-body text-ink">
            Describe the deal. Vidhata drafts and screens the document. An
            advocate settles the findings and signs off.
          </p>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="/new">Start a document</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </SmoothScroll>
  );
}
