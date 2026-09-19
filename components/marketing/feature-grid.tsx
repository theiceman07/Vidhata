import { FileCheck2, ShieldCheck, Gavel } from "lucide-react";

const FEATURES = [
  {
    icon: FileCheck2,
    title: "Drafted from a curated corpus",
    description:
      "Every clause comes from a vetted library, not a general-purpose model guessing at contract language.",
  },
  {
    icon: ShieldCheck,
    title: "Citation verification gates",
    description:
      "A citation is either verified against the corpus or blocked. Nothing ambiguous reaches you.",
  },
  {
    icon: Gavel,
    title: "Mandatory advocate sign-off",
    description:
      "An empanelled advocate adjudicates every finding. No document settles without a recorded sign-off.",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-card border border-line bg-paper p-6 shadow-card"
          >
            <f.icon className="mb-3 h-6 w-6 text-brand" aria-hidden />
            <h3 className="mb-1 font-display text-h3 text-ink">{f.title}</h3>
            <p className="text-small text-muted-fg">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
