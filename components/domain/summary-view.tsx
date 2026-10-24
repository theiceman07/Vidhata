import type { SettledSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

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
export function SummaryView({
  summary,
  showLabel = true,
}: {
  summary: SettledSummary;
  /** False where the page already says it in its own header. */
  showLabel?: boolean;
}) {
  return (
    <section aria-labelledby="summary-label">
      {showLabel ? (
        <p id="summary-label" className="max-w-measure text-meta text-muted-fg">
          {SUMMARY_LABEL}
        </p>
      ) : (
        <h2 id="summary-label" className="sr-only">
          Summary
        </h2>
      )}
      <dl className={cn("grid gap-x-12 gap-y-6 xl:grid-cols-2", showLabel && "mt-6")}>
        {summary.items.map((item) => (
          <div key={item.label}>
            <dt className="text-meta font-medium text-muted-fg">{item.label}</dt>
            <dd className="mt-1 max-w-measure text-body text-ink">
              {item.text}
              {item.clauses.length > 0 && (
                <span className="mt-1 block text-meta text-muted-fg">
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
