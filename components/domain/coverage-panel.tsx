import { Tick } from "@/components/shared/tick";
import { Icon } from "@/components/shared/icon";
import { ContextPanel } from "@/components/domain/document-context";
import { CalmDisclosure, useCalm } from "@/components/domain/calm";
import { cn } from "@/lib/utils";
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
  collapsible = false,
}: {
  doc: Pick<ClientDocument, "status" | "version" | "clauses" | "otherClauseCount">;
  className?: string;
  collapsible?: boolean;
}) {
  const ran = layersRun(doc);
  const clauseCount = doc.clauses.length + doc.otherClauseCount;
  const calm = useCalm();
  const intro =
    ran.length === 0
      ? "The first pass has not run yet."
      : `All ${ran.length} layers ran on the ${clauseCount} clauses of Draft ${doc.version}. The full pipeline runs again on every revision.`;

  if (calm) {
    // One open section: a strong rule, the heading with its intro line, then
    // three columns set apart by soft dividers. A tick means a layer ran on
    // this draft, not that a clause passed it.
    return (
      <CalmDisclosure
        id="coverage-body"
        className={cn("border-t-2 border-calm-strong", className)}
        buttonClassName="flex w-full cursor-pointer items-baseline justify-between gap-6 rounded-calm-control py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-calm-focus"
        header={(open) => (
          <>
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-6 gap-y-1">
              <span role="heading" aria-level={2} className="font-display text-h3 font-medium leading-8 text-calm-strong">
                What this was checked against
              </span>
              <span className="text-meta leading-5 text-calm-secondary">{intro}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-meta text-calm-secondary">
              {!open && <span className="max-md:hidden">Layers and exclusions</span>}
              <Icon
                name="expand_more"
                size={16}
                className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")}
              />
            </span>
          </>
        )}
      >
        <div className="grid pb-2 md:grid-cols-3 md:divide-x md:divide-calm-divider">
          {ran.length > 0 && (
            <CalmColumn number="01" title="Layers that ran" note="A tick means the layer ran on this draft.">
              <ol className="space-y-1.5">
                {ran.map((layer) => (
                  <li key={layer} className="flex items-center gap-2.5 text-meta leading-5 text-calm-ink">
                    <Tick state="done" size="sm" className="!bg-calm-success" />
                    <span>{PIPELINE_LAYERS[layer].name}</span>
                  </li>
                ))}
              </ol>
            </CalmColumn>
          )}
          <CalmColumn number="02" title="Rules and references" note="The same for every document.">
            <div className="space-y-4">
              <CalmList title="Statutory checks" scope="Layer 2" items={COVERAGE.statutory} note={COVERAGE.statutoryNote} />
              <CalmList title="Cross-clause checks" scope="Layers 3 and 4" items={COVERAGE.crossClause} />
            </div>
          </CalmColumn>
          <CalmColumn number="03" title="Outside the review" note="Not covered by this review.">
            <ul className="space-y-1">
              {COVERAGE.outOfScope.map((item) => (
                <li key={item} className="text-meta leading-5 text-calm-secondary">
                  {item}
                </li>
              ))}
            </ul>
          </CalmColumn>
        </div>
      </CalmDisclosure>
    );
  }

  return (
    <ContextPanel
      title="What this was checked against"
      className={className}
      collapsible={collapsible}
      hint="Layers and exclusions"
    >
      <p className="text-meta text-ink">
        {ran.length === 0
          ? "The first pass has not run yet."
          : `All ${ran.length} layers ran on the ${clauseCount} clauses of Draft ${doc.version}. The full pipeline runs again on every revision.`}
      </p>

      {/* The pipeline as one strip, then what it checked and what it did not.
          A tick means a layer ran on this draft, not that a clause passed it. */}
      {ran.length > 0 && (
        <div className="mt-5">
          <p className="text-label font-medium text-muted">Layers that ran</p>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {ran.map((layer, i) => (
              <li key={layer} className="flex flex-col gap-2 rounded-control bg-surface p-3">
                <span className="flex items-center justify-between">
                  <span className="text-label tabular-nums text-muted-fg">Layer {i + 1}</span>
                  <Tick state="done" size="sm" />
                </span>
                <span className="text-meta font-medium leading-snug text-ink">
                  {PIPELINE_LAYERS[layer].name}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-label text-muted-fg">A tick means the layer ran on this draft.</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <div className="rounded-control bg-surface p-5">
          <p className="text-label font-medium text-muted">Rules and references, the same for every document</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <CoverageList title="Statutory checks" scope="Layer 2" items={COVERAGE.statutory} note={COVERAGE.statutoryNote} />
            <CoverageList title="Cross-clause checks" scope="Layers 3 and 4" items={COVERAGE.crossClause} />
          </div>
        </div>
        <div className="p-1 lg:p-2">
          <p className="text-label font-medium text-muted">Outside the review</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {COVERAGE.outOfScope.map((item) => (
              <li key={item} className="rounded-full border border-line px-3 py-1 text-meta text-muted-fg">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ContextPanel>
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
      <h3 className="text-meta font-medium text-ink">{title}</h3>
      <p className="min-h-[1.25rem] text-label text-muted-fg">{scope}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-sand px-3 py-1 text-meta text-ink">
            {item}
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-label text-muted-fg">{note}</p>}
    </div>
  );
}

/** One column of the calm layout: the number and heading share a line, so all three start level. */
function CalmColumn({
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
    <section className="min-w-0 py-3 md:px-6 md:first:pl-0 md:last:pr-0">
      <h3 className="flex items-baseline gap-2.5 text-meta font-semibold leading-5 text-calm-strong">
        <span className="tabular-nums text-label text-calm-secondary">{number}</span>
        {title}
      </h3>
      <p className="mt-0.5 min-h-5 text-meta leading-5 text-calm-secondary">{note}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CalmList({
  title,
  scope,
  items,
  note,
}: {
  title: string;
  scope?: string;
  items: readonly string[];
  note?: string;
}) {
  return (
    <div>
      <h4 className="text-meta font-medium leading-5 text-calm-ink">
        {title}
      </h4>
      {scope && <p className="text-meta leading-5 text-calm-secondary">{scope}</p>}
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-meta leading-5 text-calm-secondary">
            {item}
          </li>
        ))}
      </ul>
      {note && <p className="mt-2 text-meta leading-5 text-calm-secondary">{note}</p>}
    </div>
  );
}
