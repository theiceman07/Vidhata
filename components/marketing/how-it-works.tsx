import { Dateline } from "@/components/document/dateline";

/**
 * Three steps, as numbered editorial rows.
 *
 * No cards and no icons: a gavel says nothing a heading does not, and
 * the board rules out legal costume outright. The numbers carry the
 * sequence, the hairlines carry the separation.
 */
const STEPS = [
  {
    n: "01",
    title: "Describe the deal",
    body: "Tell us the parties, the transaction and the key terms. The first pass drafts a contract from a curated clause corpus, never a general-purpose model writing law from memory.",
  },
  {
    n: "02",
    title: "The seven-layer pipeline screens it",
    body: "Every clause is checked against Indian statute: restraint of trade, MSMED payment terms, jurisdiction, and a citation gate that verifies each source against the corpus.",
  },
  {
    n: "03",
    title: "Your advocate signs off",
    body: "An empanelled advocate adjudicates every finding and signs. You get the settled document plus an execution checklist for stamping, registration and e-signature.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-[clamp(72px,10vw,140px)]">
      <Dateline segments={["How it works"]} />
      <h2 className="mt-4 max-w-2xl font-display text-h1 text-ink">
        Three steps from a description to a settled document.
      </h2>

      <ol className="mt-12 border-t border-line">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="grid gap-x-8 gap-y-2 border-b border-line py-8 sm:grid-cols-[4rem_1fr]"
          >
            <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
              {step.n}
            </p>
            <div>
              <h3 className="font-display text-h2 text-ink">{step.title}</h3>
              <p className="mt-3 max-w-prose text-body text-muted-fg">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
