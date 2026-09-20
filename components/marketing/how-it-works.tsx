import { FileText, ScanSearch, Gavel } from "lucide-react";

// QA 10.1: the home page skipped the product's actual story — describe →
// screen → sign off — straight from hero to feature bullets. This section
// gives the landing page one more reason to exist beyond restating
// features, and fills the whitespace the report flagged.
const STEPS = [
  {
    icon: FileText,
    title: "Describe the deal",
    description:
      "Tell us the parties, the transaction and the key terms. AI drafts a contract from a curated clause corpus — never a general-purpose model guessing at language.",
  },
  {
    icon: ScanSearch,
    title: "The seven-layer pipeline screens it",
    description:
      "Every clause is checked against Indian statute — restraint of trade, MSMED payment terms, jurisdiction, citation verification — before a human ever sees it.",
  },
  {
    icon: Gavel,
    title: "Your advocate signs off",
    description:
      "An empanelled advocate adjudicates every finding. You get the settled document plus an execution checklist for stamping, registration and signature.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-canvas py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-8 text-center font-display text-h2 text-ink">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-fg">
                <step.icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mb-1 text-small font-medium text-muted-fg">
                Step {i + 1}
              </p>
              <h3 className="mb-1 font-display text-h3 text-ink">
                {step.title}
              </h3>
              <p className="text-body text-muted-fg">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
