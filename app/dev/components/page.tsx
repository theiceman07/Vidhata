"use client";

import { useState } from "react";
import { Dateline } from "@/components/document/dateline";
import { StateLabel } from "@/components/document/state-label";
import { MarginMark } from "@/components/document/margin-mark";
import { CitationBlock } from "@/components/document/citation-block";
import { FindingBar } from "@/components/document/finding-bar";
import { FindingDetail } from "@/components/document/finding-detail";
import { DocumentSurface } from "@/components/document/document-surface";
import { getMockDocumentById } from "@/lib/mock/documents.mock";

/**
 * Development-only gallery for the document primitives.
 *
 * Rendered against the real MSA fixture rather than invented props, so
 * what shows here is what the workspace shows: three findings at high,
 * medium and low severity, one of them carrying a blocked citation.
 */
export default function ComponentsPage() {
  const doc = getMockDocumentById("doc-msa-pending");
  const [selected, setSelected] = useState<string | null>(null);

  if (!doc) return <p className="p-8">Fixture missing.</p>;

  const findingNumbers: Record<string, string> = {};
  doc.findings.forEach((f, i) => {
    findingNumbers[f.findingId] = String(i + 1).padStart(2, "0");
  });

  const selectedFinding =
    doc.findings.find((f) => f.findingId === selected) ?? doc.findings[0];

  return (
    <div className="mx-auto max-w-5xl space-y-decision p-8">
      <header>
        <h1 className="font-display text-h1 text-ink">Document primitives</h1>
        <Dateline
          segments={["Development only", "Not linked from the product"]}
          className="mt-2"
        />
      </header>

      <Section title="Dateline">
        <Dateline
          segments={[doc.title, "Clause 7.2", "Finding 01", "Awaiting advocate"]}
        />
      </Section>

      <Section title="StateLabel">
        <div className="flex flex-wrap gap-2">
          <StateLabel state="draft" />
          <StateLabel state="analysing" />
          <StateLabel state="pending_review" />
          <StateLabel state="under_review" />
          <StateLabel state="revision" />
          <StateLabel state="settled" />
          <StateLabel state="open" />
          <StateLabel state="citation_verified" />
          <StateLabel state="citation_blocked" />
          <StateLabel state="settled" tone="solid" />
        </div>
      </Section>

      <Section title="MarginMark">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <MarginMark kind="machine" />
            <span className="text-meta text-muted-fg">
              A concern was raised
            </span>
          </span>
          <span className="flex items-center gap-2">
            <MarginMark kind="human" />
            <span className="text-meta text-muted-fg">
              An advocate has touched this
            </span>
          </span>
        </div>
      </Section>

      <Section title="FindingBar">
        <div className="space-y-1 bg-paper">
          {doc.findings.map((f) => (
            <FindingBar
              key={f.findingId}
              finding={f}
              number={findingNumbers[f.findingId]}
              selected={selectedFinding?.findingId === f.findingId}
              onSelect={() => setSelected(f.findingId)}
            />
          ))}
        </div>
      </Section>

      <Section title="CitationBlock · verified and blocked">
        <div className="space-y-8 bg-paper p-4">
          <CitationBlock
            citations={doc.findings[0].citations}
            showWithdrawalNote
          />
          <CitationBlock
            citations={doc.findings[2].citations}
            showWithdrawalNote
          />
        </div>
      </Section>

      <Section title="FindingDetail · advocate">
        <div className="bg-canvas p-6">
          {selectedFinding && (
            <FindingDetail
              doc={doc}
              finding={selectedFinding}
              number={findingNumbers[selectedFinding.findingId]}
              role="advocate"
              canAdjudicate
              onSettle={() => undefined}
              onReopen={() => undefined}
              onRequestChange={() => undefined}
              onWithdrawSource={() => undefined}
            />
          )}
        </div>
      </Section>

      <Section title="FindingDetail · client">
        <div className="bg-canvas p-6">
          {selectedFinding && (
            <FindingDetail
              doc={doc}
              finding={selectedFinding}
              number={findingNumbers[selectedFinding.findingId]}
              role="client"
              canAdjudicate={false}
              onSettle={() => undefined}
              onReopen={() => undefined}
              onRequestChange={() => undefined}
              onWithdrawSource={() => undefined}
            />
          )}
        </div>
      </Section>

      <Section title="DocumentSurface">
        <div className="max-h-[70vh] overflow-y-auto bg-paper">
          <DocumentSurface
            doc={doc}
            findingNumbers={findingNumbers}
            selectedFindingId={selected}
            hoveredFindingId={null}
            onSelectFinding={setSelected}
            onHoverFinding={() => undefined}
            onActiveClauseChange={() => undefined}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-6">
      <h2 className="mb-4 font-mono text-notation uppercase tracking-notation text-muted-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}
