import { Icon } from "@/components/shared/icon";
import { ContextPanel } from "@/components/domain/document-context";
import { COVERAGE, layersRun } from "@/lib/coverage";
import { PIPELINE_LAYERS, type ClientDocument } from "@/lib/types";

/**
 * What this document was checked against.
 *
 * First what actually ran on it, read from the document, then the checks
 * and the exclusions that are the same for every document. Counts and layer
 * names only: before sign-off the client does not see the draft, so nothing
 * here quotes it, and findings an advocate added are not counted. The layers
 * are named and not counted per layer: which layer raised a finding is the
 * pipeline's machinery, and a client is never given it.
 */
export function CoveragePanel({
  doc,
  className,
}: {
  doc: Pick<ClientDocument, "status" | "version" | "clauses" | "otherClauseCount">;
  className?: string;
}) {
  const ran = layersRun(doc);
  const clauseCount = doc.clauses.length + doc.otherClauseCount;

  return (
    <ContextPanel title="What this was checked against" className={className}>
      <p className="text-meta text-ink">
        {ran.length === 0
          ? "The first pass has not run yet."
          : `All ${ran.length} layers ran on the ${clauseCount} clauses of Draft ${doc.version}. The full pipeline runs again on every revision.`}
      </p>

      {/* Three sections, set apart by tint and space. A tick means a layer
          ran on this draft, not that a clause passed it. */}
      <div className="mt-3 space-y-3">
        {ran.length > 0 && (
          <Section number="01" title="Layers that ran" note="A tick means the layer ran on this draft.">
            <ol className="grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
              {ran.map((layer) => (
                <li key={layer} className="flex items-baseline gap-2.5 text-meta">
                  <Icon name="check" size={16} className="shrink-0 translate-y-0.5 text-verified" />
                  <span className="text-ink">{PIPELINE_LAYERS[layer].name}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section number="02" title="Rules and references" note="The same for every document.">
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            <CoverageList
              title="Statutory checks"
              scope="Layer 2"
              items={COVERAGE.statutory}
              note={COVERAGE.statutoryNote}
            />
            <CoverageList
              title="Cross-clause checks"
              scope="Layers 3 and 4"
              items={COVERAGE.crossClause}
            />
          </div>
        </Section>

        <Section number="03" title="Outside the review" note="Not covered by this review.">
          <ul className="grid gap-x-8 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {COVERAGE.outOfScope.map((item) => (
              <li key={item} className="text-meta text-muted-fg">
                {item}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </ContextPanel>
  );
}

/** One numbered section of the panel: a paper inset, a heading, what it is. */
function Section({
  number,
  title,
  note,
  children,
}: {
  number: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-control bg-paper px-4 py-3">
      <h3 className="flex flex-wrap items-baseline gap-x-2.5 text-meta font-semibold text-ink">
        <span className="tabular-nums text-muted-fg">{number}</span>
        {title}
        <span className="text-small font-normal text-muted-fg">{note}</span>
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function CoverageList({
  title,
  scope,
  items,
  note,
}: {
  title: string;
  /** Which layers the list belongs to. Every heading reserves this line, so the lists start level. */
  scope?: string;
  items: readonly string[];
  note?: string;
}) {
  return (
    <div>
      <h3 className="text-meta font-semibold text-ink">{title}</h3>
      <p className="min-h-[1.25rem] text-small text-muted-fg">{scope}</p>
      <ul className="mt-1.5 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-meta text-muted-fg">
            {item}
          </li>
        ))}
      </ul>
      {note && <p className="mt-2.5 text-small text-muted-fg">{note}</p>}
    </div>
  );
}
