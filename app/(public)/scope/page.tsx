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
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-24 md:pt-32">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div>
              <p className="inline-flex rounded-full bg-parchment px-4 py-1.5 text-meta font-medium text-ink">
                Scope and limits
              </p>
              <h1 className="mt-6 font-display text-display text-ink">
                What Vidhata does not do.
              </h1>
              <p className="mt-5 max-w-measure text-lead text-muted-fg">
                Vidhata is a technology provider, not a law firm.
              </p>
            </div>

            <div className="space-y-6 rounded-card bg-parchment p-8">
              <div>
                <p className="text-meta font-medium text-muted-fg">The chat agent</p>
                <p className="mt-1 font-display text-h3 text-ink">
                  Vidhata&apos;s chat agent explains the settled document. It does not give legal
                  advice.
                </p>
              </div>
              <div>
                <p className="text-meta font-medium text-muted-fg">The sign-off</p>
                <p className="mt-1 font-display text-h3 text-ink">
                  Your advocate&apos;s sign-off is the legal act.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
            <h2 className="font-display text-h1 text-ink">Outside Vidhata&apos;s scope</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OUT_OF_SCOPE.map((item, i) => (
                <li
                  key={item}
                  className="flex min-h-40 flex-col justify-between gap-6 rounded-card bg-paper p-7"
                >
                  <span className="font-mono text-meta text-muted-fg">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-h2 text-ink">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
