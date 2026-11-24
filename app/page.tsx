import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { Statement } from "@/components/marketing/statement";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LivingDocument } from "@/components/marketing/living-document";
import { IndiaChecks } from "@/components/marketing/india-checks";
import { Accountability } from "@/components/marketing/accountability";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicEntry } from "@/components/marketing/public-entry";
import { AuroraBackdrop } from "@/components/marketing/aurora-backdrop";

/**
 * The landing page says one thing on arrival and the rest in order as
 * the visitor scrolls: how it works, what it looks like on a real
 * clause, the checks only an Indian contract needs, the advocate behind
 * the result, the questions people ask. The primary action appears
 * twice, at the top and at the end, and nowhere in between.
 */
export default function LandingPage() {
  return (
    <>
      <SmoothScroll />
      <SiteHeader />
      <main>
        <Hero />
        <Statement />
        <HowItWorks />
        <LivingDocument />
        <IndiaChecks />
        <Accountability />

        <section className="tile-grain w-full bg-parchment">
          <div className="site-wrap grid gap-x-16 gap-y-10 py-24 md:py-32 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <h2 className="font-display text-display text-ink">Questions, answered</h2>
              <p className="mt-6 text-lead text-muted-fg">
                Vidhataa is in preview. Accounts are opened by invitation.
              </p>
            </div>
            <Faq />
          </div>
        </section>

        <AuroraBackdrop>
        <section className="site-wrap">
          <div className="flex flex-col items-center py-28 text-center md:py-36">
            <h2 className="max-w-3xl font-display text-display text-ink">
              Put your next contract in front of an advocate.
            </h2>
            <p className="mt-6 max-w-xl text-lead text-ink/70">
              Describe the deal. Vidhataa drafts and screens it. An advocate
              settles the findings and signs off.
            </p>
            <PublicEntry className="mt-12" />
          </div>
        </section>
        </AuroraBackdrop>
      </main>
      <SiteFooter />
    </>
  );
}
