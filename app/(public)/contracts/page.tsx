import type { Metadata } from "next";
import { PageOpening } from "@/components/marketing/page-opening";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { CONTRACT_CATALOGUE, CONTRACT_GROUPS } from "@/lib/mock/intake-options.mock";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Agreements",
  description:
    "The agreement types Vidhataa drafts, and the ones that are coming, for Indian startups and MSMEs.",
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
        <PageOpening
          title="The agreements Vidhataa drafts."
          lead={
            <>
              {CONTRACT_CATALOGUE.length} agreement types in {CONTRACT_GROUPS.length} groups.{" "}
              {available} can be drafted now. The rest are coming soon.
            </>
          }
        />

        <section className="tile-grain w-full bg-parchment">
          <div className="site-wrap space-y-16 py-24 md:py-32">
            {CONTRACT_GROUPS.map((group) => (
              <div key={group.id}>
                <h2 className="font-display text-h1 text-ink">{group.label}</h2>
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {CONTRACT_CATALOGUE.filter((t) => t.group === group.id).map((type) => (
                    <li
                      key={type.id}
                      className="flex flex-col justify-between gap-8 rounded-card border border-line bg-paper p-6"
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
