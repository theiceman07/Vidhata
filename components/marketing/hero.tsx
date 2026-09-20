import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 text-center">
      <h1 className="font-display text-display text-ink">
        AI drafts your contract.
        <br />
        An advocate signs off on it.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-body text-muted-fg">
        Vidhata drafts from a curated clause corpus, screens every clause
        against Indian statute, and routes every finding to an empanelled
        advocate before it reaches you — at a fixed, transparent price.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/new">Start a deal</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pricing">See pricing</Link>
        </Button>
      </div>
    </section>
  );
}
