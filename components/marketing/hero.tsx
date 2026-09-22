import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dateline } from "@/components/document/dateline";

/**
 * The marquee.
 *
 * One thought, set big, given air. A mono dateline at the left margin
 * acts as the editorial anchor. No imagery, no eyebrow tag, no stack of
 * competing calls to action — the type is the design.
 *
 * The whole thing must fit the first viewport. An oversized headline
 * eating the screen is the commonest failure in this shape.
 */
export function Hero() {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-6xl flex-col justify-center px-6 py-16">
      <Dateline segments={["Vidhata", "New Delhi"]} />

      <h1 className="mt-6 max-w-4xl font-display text-display text-ink">
        AI drafts.
        <br />
        {/* The one italic in the headline. It gives the sentence a
            cadence rather than a uniform weight, and it lands on the
            word that carries the promise. */}
        <em className="italic">Advocates</em> decide.
      </h1>

      <p className="mt-8 max-w-xl text-body text-muted-fg">
        Contracts drafted in minutes, checked against Indian statute, and
        settled by a named advocate who stands behind the result.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <Button asChild size="lg">
          <Link href="/new">Start a document</Link>
        </Button>
        <Link
          href="/pricing"
          className="text-body text-ink underline underline-offset-4 hover:text-accent"
        >
          What it costs
        </Link>
      </div>

      <p className="mt-16 max-w-xl border-l-2 border-line pl-4 text-meta text-muted-fg">
        A clean-looking draft still cannot tell you which clauses will
        survive contact with a court. Automation does the first pass. An
        advocate owns the final word.
      </p>
    </section>
  );
}
