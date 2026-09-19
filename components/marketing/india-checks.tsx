const CHECKS = [
  {
    title: "Section 27 restraint of trade",
    description:
      "Non-compete and non-solicit clauses are screened against the Indian Contract Act's restraint-of-trade rule.",
  },
  {
    title: "Section 74 penalty clauses",
    description:
      "Liquidated damages and penalty clauses are checked against how Indian courts actually enforce them.",
  },
  {
    title: "MSMED payment terms",
    description:
      "Payment clauses are checked against the statutory ceiling when your counterparty is a registered MSME.",
  },
  {
    title: "Stamping",
    description:
      "State-specific stamp duty is computed so you know exactly what to pay before execution.",
  },
  {
    title: "e-signature validity",
    description:
      "Every document is checked against the IT Act's rules on what can and can't be signed electronically.",
  },
];

export function IndiaChecks() {
  return (
    <section className="bg-paper py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-2 text-center font-display text-h2 text-ink">
          Built for Indian contracts, not adapted for them
        </h2>
        <p className="mb-8 text-center text-body text-muted-fg">
          Five checks a generic drafting tool has no way to run.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHECKS.map((c) => (
            <div
              key={c.title}
              className="rounded-card border border-line bg-canvas/40 p-5"
            >
              <h3 className="mb-1 font-medium text-ink">{c.title}</h3>
              <p className="text-small text-muted-fg">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
