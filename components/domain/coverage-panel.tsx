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
      <div>
        <p className="text-meta text-ink">
          {ran.length === 0
            ? "The first pass has not run yet."
            : `All ${ran.length} layers ran on the ${clauseCount} clauses of Draft ${doc.version}. The full pipeline runs again on every revision.`}
        </p>
        {ran.length > 0 && (
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 md:grid-cols-2">
            {ran.map((layer) => (
              <li key={layer} className="flex items-baseline gap-2.5 text-meta">
                <Icon name="check" size={16} className="shrink-0 translate-y-0.5 text-verified" />
                <span className="text-ink">{PIPELINE_LAYERS[layer].name}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-6 text-label text-muted-fg">The same for every document</p>
      <div className="mt-3 grid gap-6 lg:grid-cols-3">
        <CoverageList
          title="Checks run · Layer 2"
          items={COVERAGE.statutory}
          note={COVERAGE.statutoryNote}
        />
        {/* Non-breaking spaces keep "Layers 3 and 4" together, so the heading
            wraps before it rather than leaving the 4 on a line of its own. */}
        <CoverageList
          title={"Cross-clause checks · Layers 3 and 4"}
          items={COVERAGE.crossClause}
        />
        <CoverageList title="Out of scope" items={COVERAGE.outOfScope} />
      </div>
    </ContextPanel>
  );
}

function CoverageList({
  title,
  items,
  note,
}: {
  title: string;
  items: readonly string[];
  note?: string;
}) {
  return (
    <div>
      <h3 className="text-meta font-medium text-ink">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-meta text-muted-fg">
            {item}
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-label text-muted-fg">{note}</p>}
    </div>
  );
}
