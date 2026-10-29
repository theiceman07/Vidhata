import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { groupSummary } from "@/lib/summaryGroups";
import type { SettledSummary, SummaryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the summary says it is, on every screen that shows it. */
export const SUMMARY_LABEL =
  "A plain-language summary of the settled document, not advice on your specific circumstances.";

/**
 * A settled document's summary, in sections, one line to a term.
 *
 * The sections are only a way to read it (lib/summaryGroups.ts): every line is
 * still here, as written. Each line says which clause it rests on, and that
 * reference opens the clause in the settled document, so the line can be
 * checked against the text it explains. A line about something the document
 * does not contain says so and cites nothing. It states what the document
 * says and is never phrased as a recommendation, so nothing here is ranked or
 * flagged: the page holds no assessment of the reader's situation to rank by.
 *
 * Sections flow in one column: heading above its terms, a hairline between
 * sections. No side column, so it reads the same here and in the narrower
 * column on the delivery page.
 */
export function SummaryView({
  summary,
  showLabel = true,
  layout = "flow",
}: {
  summary: SettledSummary;
  /** False where the page already says it in its own header. */
  showLabel?: boolean;
  /** `flow`: one column of sections. `bento`: the key terms as a row, the sections as a grid of cards. */
  layout?: "flow" | "bento";
}) {
  if (layout === "bento")
    return <SummaryBento summary={summary} showLabel={showLabel} />;
  const groups = groupSummary(summary.items);

  return (
    <section aria-labelledby="summary-label" className="@container">
      {showLabel ? (
        <p id="summary-label" className="max-w-measure text-meta text-muted-fg">
          {SUMMARY_LABEL}
        </p>
      ) : (
        <h2 id="summary-label" className="sr-only">
          Summary
        </h2>
      )}
      <div className={cn(showLabel && "mt-6")}>
        {groups.map((group, i) => (
          <section
            key={group.key}
            aria-labelledby={`summary-${group.key}`}
            className={cn("py-8", i === 0 ? "pt-0" : "border-t border-line")}
          >
            <h3
              id={`summary-${group.key}`}
              className="font-display text-h2 text-ink"
            >
              {group.title}
            </h3>
            <dl className="mt-5 space-y-6">
              {group.items.map((item) => (
                <div key={item.label}>
                  <dt className="text-meta font-medium text-ink">
                    {item.label}
                  </dt>
                  <dd className="mt-1 max-w-measure text-body text-ink">
                    {item.text}
                    {item.clauses.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-x-4">
                        {item.clauses.map((clause) => (
                          <Link
                            key={clause}
                            href={`/documents/${summary.documentId}?clause=${encodeURIComponent(clause)}`}
                            title="View original clause"
                            aria-label={`View original clause ${clause}`}
                            className="link inline-flex min-h-6 items-center gap-0.5 rounded-control text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            Clause {clause}
                            <Icon name="chevron_right" size={16} />
                          </Link>
                        ))}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}

/** Labels said more plainly on the page. The line itself is as written. */
const DISPLAY_LABEL: Record<string, string> = {
  "What does not": "What's excluded",
};

/** The terms short enough to read as facts, set in a row above the sections. */
const AT_A_GLANCE = ["Who it is between", "Term", "Termination"];

/**
 * A key term as a fact: the value to find first, large, and the line it comes
 * from, as written, beneath it. The value is lifted out of that line, never
 * reworded: the parties' names, or the length of time the line states. A line
 * with neither is shown whole.
 */
function GlanceFact({ item }: { item: SummaryItem }) {
  const parties =
    item.label === "Who it is between"
      ? item.text.match(/^(.+? and .+?\.)\s+([A-Z][\s\S]*)$/)
      : null;
  if (parties) {
    return (
      <>
        <span className="block font-display text-h3 text-ink">
          {parties[1]}
        </span>
        <span className="mt-1 block text-meta text-muted-fg">{parties[2]}</span>
      </>
    );
  }
  const duration = item.text.match(/\d+\s(?:months?|days?|years?)/);
  if (duration) {
    return (
      <>
        <span className="block font-display text-h3 text-ink">
          {duration[0]}
        </span>
        <span className="mt-1 block text-meta text-muted-fg">{item.text}</span>
      </>
    );
  }
  return <span className="block text-body text-ink">{item.text}</span>;
}

function ClauseLinks({
  summary,
  item,
}: {
  summary: SettledSummary;
  item: SummaryItem;
}) {
  if (item.clauses.length === 0) return null;
  return (
    <span className="mt-1.5 flex flex-wrap gap-x-4">
      {item.clauses.map((clause) => (
        <Link
          key={clause}
          href={`/documents/${summary.documentId}?clause=${encodeURIComponent(clause)}`}
          title="View original clause"
          aria-label={`View original clause ${clause}`}
          className="link inline-flex min-h-6 items-center gap-0.5 rounded-control text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          View clause {clause}
          <Icon name="chevron_right" size={16} />
        </Link>
      ))}
    </span>
  );
}

/**
 * The editorial form: the key terms as a row of facts, then one reading column
 * in one order beside a sticky index. Each line is shown once, as written, with
 * its clause: the lines in the row are left out of the sections, never copied
 * into them. Nothing has a fixed height.
 */
function SummaryBento({
  summary,
  showLabel,
}: {
  summary: SettledSummary;
  showLabel: boolean;
}) {
  const glance = AT_A_GLANCE.flatMap((label) =>
    summary.items.filter((i) => i.label === label),
  );
  const rest = summary.items.filter((i) => !AT_A_GLANCE.includes(i.label));
  const groups = groupSummary(rest).map((g) => ({
    ...g,
    // The terms and notice period are in the row above, so what is left of this section is what lasts after it.
    title: g.key === "duration" ? "Continuing obligations" : g.title,
  }));

  return (
    <section aria-labelledby="summary-label" className="space-y-8">
      {showLabel ? (
        <p id="summary-label" className="max-w-measure text-meta text-muted-fg">
          {SUMMARY_LABEL}
        </p>
      ) : (
        <h2 id="summary-label" className="sr-only">
          Summary
        </h2>
      )}

      {glance.length > 0 && (
        <section aria-labelledby="summary-glance">
          <h3 id="summary-glance" className="font-display text-h3 text-ink">
            Agreement at a glance
          </h3>
          <dl className="mt-4 grid gap-3 rounded-modal bg-sand p-3 md:grid-cols-3">
            {glance.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-6"
              >
                <dt className="text-label font-medium text-muted-fg">{item.label}</dt>
                <dd className="mt-3 flex flex-1 flex-col">
                  <span>
                    <GlanceFact item={item} />
                  </span>
                  {/* Level across the row, whatever the lines above it run to. */}
                  <span className="mt-auto pt-3">
                    <ClauseLinks summary={summary} item={item} />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* One tile to a section; its lines sit inside it. */}
      <div className="gap-3 rounded-modal bg-sand p-3 pb-0 lg:columns-2">
        {groups.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`summary-${group.key}`}
            className="mb-3 break-inside-avoid rounded-card border border-line bg-surface p-6"
          >
            <h3
              id={`summary-${group.key}`}
              className="font-display text-h3 text-ink"
            >
              {group.title}
            </h3>
            <dl className="mt-4 space-y-5">
              {group.items.map((item) => (
                <div key={item.label}>
                  {/* "After it ends" under "Continuing obligations" says the heading again. */}
                  <dt
                    className={cn(
                      "text-label font-medium text-muted-fg",
                      group.key === "duration" && "sr-only",
                    )}
                  >
                    {DISPLAY_LABEL[item.label] ?? item.label}
                  </dt>
                  <dd className="mt-1 text-body text-ink">
                    {item.text}
                    <ClauseLinks summary={summary} item={item} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <section
          aria-labelledby="summary-more"
          className="mb-3 break-inside-avoid rounded-card border border-line bg-surface p-6"
        >
          <h3 id="summary-more" className="font-display text-h3 text-ink">
            Read it in full
          </h3>
          <p className="mt-3 text-body text-ink">
            The summary is a reading of the settled document. The clauses themselves are the record.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href={`/documents/${summary.documentId}`}
              className="link inline-flex min-h-6 items-center gap-0.5 rounded-control text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Read the settled document
              <Icon name="chevron_right" size={16} />
            </Link>
            <Link
              href={`/documents/${summary.documentId}/consultation`}
              className="link inline-flex min-h-6 items-center gap-0.5 rounded-control text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Ask your advocate
              <Icon name="chevron_right" size={16} />
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
