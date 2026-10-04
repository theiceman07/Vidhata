import type { SettledSummary } from "@/lib/types";

/** What the summary says it is, on every screen that shows it. */
export const SUMMARY_LABEL =
  "A summary of your settled document. It explains the document, not your situation.";

/**
 * A settled document's summary, one line to a term.
 *
 * Each line says which clause it rests on, so it can be checked against the
 * text it explains, and a line about something the document does not contain
 * says so and cites nothing. It states what the document says and is never
 * phrased as a recommendation.
 */
export function SummaryView({ summary }: { summary: SettledSummary }) {
  return (
    <section aria-labelledby="summary-label">
      <p id="summary-label" className="max-w-measure text-meta text-muted-fg">
        {SUMMARY_LABEL}
      </p>
      <dl className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]">
        {summary.items.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-meta font-medium text-ink">{item.label}</dt>
            <dd className="max-w-measure text-body text-ink">
              {item.text}
              {item.clauses.length > 0 && (
                <span className="mt-1 block text-label text-muted-fg">
                  {item.clauses.length === 1 ? "Clause" : "Clauses"} {item.clauses.join(", ")}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
