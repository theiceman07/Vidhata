import { Dateline } from "@/components/document/dateline";

/**
 * The three non-negotiables, stated plainly.
 *
 * Cards and icons are gone. Each of these is a promise about how the
 * product behaves, so it is set as a statement in the serif with its
 * qualification beneath, the way a term sheet would set it.
 */
const FEATURES = [
  {
    label: "Corpus",
    title: "Drafted from a curated corpus",
    description:
      "Every clause comes from a vetted library, not a general-purpose model guessing at contract language.",
  },
  {
    label: "Evidence",
    title: "A citation is verified or it is blocked",
    description:
      "There is no third state. Nothing ambiguous reaches you, and no finding is settled on a source that could not be checked.",
  },
  {
    label: "Accountability",
    title: "Mandatory advocate sign-off",
    description:
      "An empanelled advocate adjudicates every finding. No document settles without a recorded sign-off attributable to a named person.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-[clamp(72px,10vw,140px)]">
      <ul className="border-t border-line">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="grid gap-x-8 gap-y-2 border-b border-line py-8 sm:grid-cols-[8rem_1fr]"
          >
            <Dateline segments={[feature.label]} />
            <div>
              <h3 className="font-display text-h2 text-ink">{feature.title}</h3>
              <p className="mt-3 max-w-prose text-body text-muted-fg">
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
