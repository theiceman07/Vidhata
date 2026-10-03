import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Scope and limits",
  description: "What Vidhata does not do, and what it is: a technology provider, not a law firm.",
};

// The out-of-scope list is the product's own, from the fixes list. Do not
// add to it or reword it here: it is a statement of what the product is not.
const OUT_OF_SCOPE = [
  "Litigation",
  "Criminal matters",
  "Wills and trusts",
  "Regulated-sector filings",
  "Cross-border or foreign-law contracts",
  "Tax opinions",
];

export default function ScopePage() {
  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 text-center md:pt-32">
          <h1 className="mx-auto max-w-3xl font-display text-display text-ink">
            What Vidhata does not do.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lead text-muted-fg">
            Vidhata is a technology provider, not a law firm.
          </p>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-28">
            <h2 className="font-display text-h2 text-ink">Outside Vidhata&apos;s scope</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OUT_OF_SCOPE.map((item) => (
                <li key={item} className="rounded-card bg-paper p-5 text-body font-medium text-ink">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
          <p className="max-w-measure text-body text-ink">
            Vidhata&apos;s chat agent explains the settled document. It does not give legal advice.
            Your advocate&apos;s sign-off is the legal act.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
