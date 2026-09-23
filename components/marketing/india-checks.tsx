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
    <section id="india" className="tile-grain w-full scroll-mt-20 bg-accent/[0.13]">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="max-w-2xl">
        <h2 className="font-display text-display text-ink">Built for Indian contracts</h2>
        <p className="mt-6 text-lead text-muted-fg">
          Six checks a generic drafting tool has no way to run. Each one runs
          against the statute it names.
        </p>
      </div>

      <ul className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {CHECKS.map((check) => (
          <li key={check.title} className="flex flex-col rounded-card bg-paper p-8">
            <span className="self-start rounded-full bg-accent/10 px-3 py-1 text-meta font-medium text-accent">
              {check.notation}
            </span>
            <h3 className="mt-6 font-display text-h2 text-ink">{check.title}</h3>
            <p className="mt-3 text-body text-muted-fg">{check.description}</p>
            {check.fragment && (
              <p className="mt-6 border-t border-line pt-5 font-clause text-meta italic text-ink">
                {check.fragment}
              </p>
            )}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
