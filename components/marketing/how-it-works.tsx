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
    <section className="bg-canvas py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-2 text-center font-display text-h2 text-ink">
          How it works
        </h2>
        <p className="mb-12 text-center text-body text-muted-fg">
          Three steps from a description to a settled document.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="flex h-full flex-col rounded-control border border-line bg-paper p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                  <step.icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="font-display text-h1 text-line">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
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
