"use client";

import { useEffect, useRef } from "react";
import type { ContractDocument, Finding, MarginNotes } from "@/lib/types";
import { ClauseBlock } from "./clause-block";
import { FindingBar } from "./finding-bar";

/**
 * The contract, set as a document.
 *
 * Paper, a reading measure, hairlines between clauses. No cards, and no
 * second title: the header above already says which document this is,
 * so the page opens on the first clause.
 *
 * The surface also reports which clause the reader is currently on, so
 * the position readout can state it. That readout is the reason this pane
 * keeps native scroll rather than inertial scroll: an interpolated offset
 * would make the reported position an approximation.
 */
export function DocumentSurface({
  doc,
  findingNumbers,
  selectedFindingId,
  hoveredFindingId,
  onSelectFinding,
  onHoverFinding,
  onActiveClauseChange,
  notes,
}: {
  doc: ContractDocument;
  findingNumbers: Record<string, string>;
  selectedFindingId: string | null;
  hoveredFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onHoverFinding: (findingId: string | null) => void;
  onActiveClauseChange: (clauseId: string) => void;
  /** The advocate's margin notes. Absent on the client's copy. */
  notes?: MarginNotes;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the callback in a ref so the observer is built once per document
  // rather than torn down and rebuilt on every parent render.
  const reportRef = useRef(onActiveClauseChange);
  reportRef.current = onActiveClauseChange;

  const clauseCount = doc.clauses.length;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-clause]"));
    if (nodes.length === 0) return;

    // The pane scrolls, not the window, so positions are measured against
    // the pane. At a boundary two clauses intersect any band at once, and
    // the one the reader is on is the last whose heading has passed the
    // top of the pane.
    const scrollRoot = root.parentElement;
    if (!scrollRoot) return;

    // Matches scroll-mt-12 on ClauseBlock plus the sticky readout.
    const ANCHOR = 24;

    const report = () => {
      const top = scrollRoot.getBoundingClientRect().top + ANCHOR;
      let current = nodes[0];
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= top) current = node;
        else break;
      }
      const id = current?.dataset.clause;
      if (id) reportRef.current(id);
    };

    scrollRoot.addEventListener("scroll", report, { passive: true });
    report();
    return () => scrollRoot.removeEventListener("scroll", report);
  }, [doc.id, clauseCount]);

  const byId = new Map(doc.findings.map((f) => [f.findingId, f]));

  // An advocate can raise a finding against a clause reference this
  // contract does not contain. It still belongs to the record, so it is
  // listed at the foot of the document rather than dropped.
  const attached = new Set(doc.clauses.flatMap((c) => c.findingIds));
  const unattached = doc.findings.filter((f) => !attached.has(f.findingId));

  return (
    <article
      ref={containerRef}
      className="@container mx-auto max-w-[76rem] px-6 pb-10 pt-4 md:px-10"
    >
      <div className="divide-y divide-line">
        {doc.clauses.map((clause) => (
          <ClauseBlock
            key={clause.id}
            clause={clause}
            findings={clause.findingIds
              .map((id) => byId.get(id))
              .filter((f): f is Finding => Boolean(f))}
            findingNumbers={findingNumbers}
            selectedFindingId={selectedFindingId}
            hoveredFindingId={hoveredFindingId}
            onSelectFinding={onSelectFinding}
            onHoverFinding={onHoverFinding}
            notes={
              notes && {
                ...notes,
                items: notes.items.filter((n) => n.clauseId === clause.id),
              }
            }
          />
        ))}
      </div>

      {unattached.length > 0 && (
        <section className="max-w-measure border-t border-line pt-6">
          <p className="text-label font-medium text-muted-fg">
            Findings not attached to a clause
          </p>
          <div className="mt-3 space-y-1">
            {unattached.map((finding) => (
              <FindingBar
                key={finding.findingId}
                finding={finding}
                number={findingNumbers[finding.findingId] ?? "--"}
                selected={selectedFindingId === finding.findingId}
                onSelect={() => onSelectFinding(finding.findingId)}
                onHover={(on) => onHoverFinding(on ? finding.findingId : null)}
              />
            ))}
          </div>
        </section>
      )}

      {/* The end of the instrument is marked, so the run-out below reads
          as the foot of the page rather than a rendering gap. */}
      <p className="mt-10 pt-2 text-center text-meta text-muted-fg">
        End of document · {doc.clauses.length} clauses
      </p>
    </article>
  );
}
