import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { LayerBadge } from "@/components/domain/layer-badge";
import { SeverityPill } from "@/components/domain/severity-pill";
import { CitationBadge } from "@/components/domain/citation-badge";
import { ClauseViewer } from "@/components/domain/clause-viewer";
import { FindingCard } from "@/components/domain/finding-card";
import { mockDocuments } from "@/lib/mock/documents.mock";
import type {
  Citation,
  DocumentStatus,
  PipelineLayer,
  Severity,
} from "@/lib/types";

const ALL_STATUSES: DocumentStatus[] = [
  "draft",
  "analysing",
  "pending_review",
  "under_review",
  "revision",
  "settled",
  "executed",
];

const ALL_LAYERS: PipelineLayer[] = [0, 1, 2, 3, 4, 5, 6];
const ALL_SEVERITIES: Severity[] = ["high", "medium", "low"];

const VERIFIED_CITATION: Citation = {
  id: "dev-verified",
  text: "Indian Contract Act, 1872, s.27",
  status: "verified",
  corpusRef: "ica-1872-s27",
};

const BLOCKED_CITATION: Citation = {
  id: "dev-blocked",
  text: "Unverifiable precedent",
  status: "blocked",
  corpusRef: null,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-h2 text-ink">{title}</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-paper p-4 shadow-card">
        {children}
      </div>
    </section>
  );
}

export default function DevComponentsPage() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <PageHeader
        title="Component inventory"
        description="Every domain component variant, side by side."
      />

      <Section title="StatusBadge">
        {ALL_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </Section>

      <Section title="LayerBadge">
        {ALL_LAYERS.map((layer) => (
          <LayerBadge key={layer} layer={layer} />
        ))}
      </Section>

      <Section title="SeverityPill">
        {ALL_SEVERITIES.map((severity) => (
          <SeverityPill key={severity} severity={severity} />
        ))}
      </Section>

      <Section title="CitationBadge">
        <CitationBadge citation={VERIFIED_CITATION} />
        <CitationBadge citation={BLOCKED_CITATION} />
      </Section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-h2 text-ink">ClauseViewer</h2>
        <div className="rounded-card border border-line bg-paper p-4 shadow-card">
          <ClauseViewer
            clauseReference="Clause 7.2"
            clauseText="The Service Provider shall not, for a period of three (3) years following termination, engage in any business activity within India that competes with the Client."
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-h2 text-ink">FindingCard</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-small text-muted-fg">
              Adjudicable (pending)
            </p>
            <FindingCard
              finding={mockDocuments[1].findings[0]}
              mode="adjudicable"
            />
          </div>
          <div>
            <p className="mb-2 text-small text-muted-fg">
              Read-only (overridden)
            </p>
            <FindingCard
              finding={mockDocuments[3].findings[0]}
              mode="read-only"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
