import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { CONTRACT_CATALOGUE, CONTRACT_GROUPS } from "@/lib/mock/intake-options.mock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Agreements",
  description:
    "The agreement types Vidhata drafts, and the ones that are coming, for Indian startups and MSMEs.",
};

/**
 * The agreement types, from the same catalogue the intake picker reads, so
 * the two never disagree: a type is Available here when it is there, and the
 * flag in lib/mock/intake-options.mock.ts is the only switch.
 */
export default function ContractsPage() {
  const available = CONTRACT_CATALOGUE.filter((t) => t.available).length;

  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-24 text-center md:pt-32">
          <h1 className="mx-auto max-w-3xl font-display text-display text-ink">
            The agreements Vidhata drafts.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lead text-muted-fg">
            {CONTRACT_CATALOGUE.length} agreement types in {CONTRACT_GROUPS.length} groups.{" "}
            {available} can be drafted now. The rest are coming soon.
          </p>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl space-y-14 px-6 py-24 md:py-28">
            {CONTRACT_GROUPS.map((group) => (
              <div key={group.id}>
                <h2 className="font-display text-h2 text-ink">{group.label}</h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {CONTRACT_CATALOGUE.filter((t) => t.group === group.id).map((type) => (
                    <li
                      key={type.id}
                      className="flex flex-col justify-between gap-6 rounded-card bg-paper p-5"
                    >
                      <p className="text-body font-medium text-ink">{type.label}</p>
                      <span
                        className={cn(
                          "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-label font-medium",
                          type.available
                            ? "bg-ink text-paper"
                            : "border border-line text-muted-fg",
                        )}
                      >
                        {type.available ? "Available" : "Coming soon"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
