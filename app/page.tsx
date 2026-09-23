import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LivingDocument } from "@/components/marketing/living-document";
import { IndiaChecks } from "@/components/marketing/india-checks";
import { Accountability } from "@/components/marketing/accountability";
import { Faq } from "@/components/marketing/faq";
import { SiteFooter } from "@/components/marketing/site-footer";
import { DealPrompt } from "@/components/marketing/deal-prompt";

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
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <LivingDocument />
        <IndiaChecks />
        <Accountability />

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto grid w-full max-w-6xl gap-x-16 gap-y-10 px-6 py-24 md:py-32 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            <div>
              <h2 className="font-display text-h1 text-ink">Questions, answered</h2>
              <p className="mt-4 text-body text-muted-fg">
                Anything else, write to us and a person replies.
              </p>
              <Link
                href="/contact"
                className="mt-6 inline-flex h-11 items-center rounded-full border border-ink/80 px-5 text-body font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
              >
                Contact us
              </Link>
            </div>
            <Faq />
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-col items-center py-28 text-center md:py-36">
            <h2 className="max-w-3xl font-display text-display text-ink">
              Put your next contract in front of an advocate.
            </h2>
            <p className="mt-6 max-w-xl text-lead text-ink/70">
              Describe the deal. Vidhata drafts and screens it. An advocate
              settles the findings and signs off.
            </p>
            <DealPrompt className="mt-12" destination="/login" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
