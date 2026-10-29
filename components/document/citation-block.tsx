/**
 * A finding without a citation is an opinion.
 *
 * The source is shown at the same moment as the concern, never behind a
 * disclosure, a tooltip or a modal. It is a definition list on hairlines
 * rather than a card, because it is evidence attached to a claim.
 *
 * A finding carries one citation, a single string as the backend writes it,
 * and it is shown as written. Whether it resolves against the corpus is the
 * citation gate's work (layer 5), not something this block claims: it says
 * what the source is and nothing about having checked it.
 */
export function CitationBlock({
  citation,
  large = false,
  bare = false,
}: {
  citation: string;
  /** Reading size, for a source shown as the subject rather than beside a finding. */
  large?: boolean;
  /** Under a heading that already says "Source": the line alone, its label kept for assistive technology. */
  bare?: boolean;
}) {
  if (bare) {
    return (
      <dl>
        <dt className="sr-only">Source</dt>
        <dd className="text-meta text-ink">{citation}</dd>
      </dl>
    );
  }
  return (
    <dl className={large ? "border-l-2 border-transparent pl-3" : undefined}>
      <div
        className={
          large ? "flex items-baseline gap-5 py-3" : "flex gap-4 py-1.5"
        }
      >
        <dt
          className={
            large
              ? "w-28 shrink-0 text-meta text-muted-fg"
              : "w-24 shrink-0 text-label text-muted-fg"
          }
        >
          Source
        </dt>
        <dd
          className={
            large
              ? "min-w-0 flex-1 text-body text-ink"
              : "min-w-0 flex-1 text-meta text-ink"
          }
        >
          {citation}
        </dd>
      </div>
    </dl>
  );
}
