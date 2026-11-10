import { cn } from "@/lib/utils";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import { Reveal } from "./reveal";

/**
 * The checks a generic drafting tool has no way to run.
 *
 * Six entries, set as tiles of unequal size: restraint of trade stands
 * tall in the highlighter's yellow, penalty clauses run wide with the clause beside the
 * check, and the rest keep one cell each. The notation carries the
 * provision, the heading carries the concern, and a fragment shows the
 * actual language or the actual output the check produces, so the
 * specificity is demonstrated rather than claimed.
 */
const MSA = getMockDocumentById("doc-msa-pending");
const NDA = getMockDocumentById("doc-nda-settled");

const nonCompete = MSA?.findings.find(
  (f) => f.clauseReference === "Clause 7.2",
);
const paymentTerms = MSA?.findings.find(
  (f) => f.clauseReference === "Clause 4.1",
);
const esignature = NDA?.executionSteps.find((s) => s.kind === "esignature");

interface Check {
  notation: string;
  title: string;
  description: string;
  /** Drafted contract language, or the product's own output. */
  fragment: string | undefined;
}

const CHECKS: Check[] = [
  {
    notation: "S.27",
    title: "Restraint of trade",
    description:
      "Non-compete and non-solicit clauses are screened against the Indian Contract Act's restraint-of-trade rule.",
    fragment: nonCompete?.clauseText,
  },
  {
    notation: "S.74",
    title: "Penalty clauses",
    description:
      "Liquidated damages are checked against how Indian courts actually enforce them.",
    fragment:
      "The Supplier shall pay liquidated damages of 2% of the order value for each week of delay.",
  },
  {
    notation: "MSMED",
    title: "Payment terms",
    description:
      "Payment clauses are checked against the statutory ceiling when your counterparty is a registered MSME.",
    fragment: paymentTerms?.clauseText,
  },
  {
    notation: "IT Act",
    title: "e-signature validity",
    description:
      "Every document is checked against the rules on what can and cannot be signed electronically.",
    fragment: esignature?.headline,
  },
  {
    notation: "Stamp",
    title: "Stamp duty",
    description:
      "Stamp duty depends on the state of execution and the instrument. Your advocate confirms the amount before you sign.",
    fragment: "Stamp duty: confirmed by your advocate",
  },
  {
    notation: "Reg. Act",
    title: "Registration",
    description: "Your advocate confirms whether registration applies.",
    fragment: "Registration: confirmed by your advocate",
  },
];

/** How each tile sits in the grid, by position in CHECKS. */
const SHAPES = ["tall", "wide", "cell", "cell", "cell", "last"] as const;

export function IndiaChecks() {
  return (
    <section id="india" className="tile-grain w-full scroll-mt-16 bg-parchment">
      <div className="site-wrap py-24 md:py-32">
        {/* Two columns on the tile grid's own gap, so the lead starts on a
            tile edge and sits on the headline's last baseline. */}
        <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2 lg:items-end lg:[align-items:last_baseline]">
          <h2 className="font-display text-display text-ink">Built for Indian contracts</h2>
          <p className="max-w-xl text-lead text-muted-fg">
            Four checks a generic drafting tool has no way to run, each against
            the statute it names. Stamp duty and registration are confirmed by
            your advocate.
          </p>
        </div>

        <ul className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {CHECKS.map((check, i) => {
            const shape = SHAPES[i] ?? "cell";
            const tall = shape === "tall";
            const wide = shape === "wide";

            return (
              <Reveal
                as="li"
                key={check.title}
                delay={(i % 4) * 0.06}
                className={cn(
                  "flex flex-col rounded-card p-8",
                  tall ? "bg-highlight text-highlight-text md:row-span-2" : "border border-line bg-paper",
                  wide && "xl:col-span-2 xl:flex-row xl:gap-10",
                  shape === "last" && "md:col-span-2 xl:col-span-1",
                )}
              >
                <div className={cn(wide && "xl:flex-1")}>
                  <span
                    className={cn(
                      "inline-block rounded-full px-3 py-1 text-meta font-medium",
                      tall ? "bg-highlight-text/10 text-highlight-text" : "bg-ink/[0.06] text-ink",
                    )}
                  >
                    {check.notation}
                  </span>
                  <h3 className={cn("mt-6 font-display", tall ? "text-h1" : "text-h2 text-ink")}>
                    {check.title}
                  </h3>
                  <p className={cn("mt-3 text-body", tall ? "text-highlight-text/80" : "text-muted-fg")}>
                    {check.description}
                  </p>
                </div>
                {check.fragment && (
                  <div
                    className={cn(
                      "mt-6 border-t pt-5",
                      // The tall tile's clause sits at its foot, so the
                      // extra height is held between the check and its example.
                      tall ? "border-highlight-text/20 md:mt-auto" : "border-line",
                      wide && "xl:mt-0 xl:flex-1 xl:self-stretch xl:rounded-control xl:border-t-0 xl:bg-parchment xl:p-6",
                    )}
                  >
                    <p className={cn("text-label", tall ? "text-highlight-text/80" : "text-muted-fg")}>Example</p>
                    <p
                      className={cn(
                        "mt-1.5 font-clause italic",
                        tall ? "text-body text-highlight-text" : wide ? "text-meta text-ink xl:text-h3 xl:font-normal" : "text-meta text-ink",
                      )}
                    >
                      {check.fragment}
                    </p>
                  </div>
                )}
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
