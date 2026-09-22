import { Dateline } from "@/components/document/dateline";
import { getMockDocumentById } from "@/lib/mock/documents.mock";

/**
 * The checks a generic drafting tool has no way to run.
 *
 * Six cards became six entries in a schedule. The notation carries the
 * provision, the heading carries the concern, and a fragment underneath
 * shows the actual language or the actual output the check produces, so
 * the specificity is demonstrated rather than claimed.
 */
const MSA = getMockDocumentById("doc-msa-pending");
const NDA = getMockDocumentById("doc-nda-settled");

const nonCompete = MSA?.findings.find(
  (f) => f.clauseReference === "Clause 7.2",
);
const paymentTerms = MSA?.findings.find(
  (f) => f.clauseReference === "Clause 4.1",
);
const stamping = NDA?.executionSteps.find((s) => s.kind === "stamping");
const registration = NDA?.executionSteps.find((s) => s.kind === "registration");
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
    notation: "Stamp",
    title: "Stamp duty",
    description:
      "State-specific stamp duty is computed so you know what to pay before execution.",
    fragment: stamping?.headline,
  },
  {
    notation: "IT Act",
    title: "e-signature validity",
    description:
      "Every document is checked against the rules on what can and cannot be signed electronically.",
    fragment: esignature?.headline,
  },
  {
    notation: "Reg. Act",
    title: "Registration",
    description:
      "Documents are checked to flag when compulsory registration applies before execution.",
    fragment: registration?.headline,
  },
];

export function IndiaChecks() {
  return (
    <section
      id="india"
      className="mx-auto max-w-[95rem] px-6 py-[clamp(72px,10vw,140px)] lg:px-10"
    >
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Dateline segments={["India"]} />
          <h2 className="mt-4 font-display text-h1 text-ink">
            Six checks a generic drafting tool has no way to run.
          </h2>
          <p className="mt-4 max-w-sm text-body text-muted-fg">
            Built for Indian contracts rather than adapted for them. Each check
            runs against the statute it names.
          </p>
        </div>

        <ol className="border-t border-line">
          {CHECKS.map((check) => (
            <li
              key={check.title}
              className="grid gap-x-8 gap-y-3 border-b border-line py-8 sm:grid-cols-[7rem_minmax(0,1fr)]"
            >
              <p className="font-mono text-notation uppercase tracking-notation text-accent">
                {check.notation}
              </p>
              <div className="min-w-0">
                <h3 className="font-display text-h2 text-ink">{check.title}</h3>
                <p className="mt-2 max-w-prose text-body text-muted-fg">
                  {check.description}
                </p>
                {check.fragment && (
                  <p className="mt-4 max-w-prose border-l-2 border-line pl-4 font-display text-meta italic text-ink">
                    {check.fragment}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
