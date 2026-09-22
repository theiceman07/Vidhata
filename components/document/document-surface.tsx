"use client";

import { useEffect, useRef } from "react";
import type { ContractDocument, Finding } from "@/lib/types";
import { ClauseBlock } from "./clause-block";

/**
 * The contract, set as a document.
 *
 * Paper, a reading measure, hairlines between clauses. No cards.
 *
 * The surface also reports which clause the reader is currently on, so
 * the dateline can state their position. That readout is the reason this
 * pane keeps native scroll rather than inertial scroll: an interpolated
 * offset would make the reported position an approximation, and the
 * point of the readout is that it is exact.
 */
export function DocumentSurface({
  doc,
  findingNumbers,
  selectedFindingId,
  onSelectFinding,
  activeClauseId,
  onActiveClauseChange,
}: {
  doc: ContractDocument;
  findingNumbers: Record<string, string>;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  activeClauseId: string | null;
  onActiveClauseChange: (clauseId: string) => void;
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

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-clause]"),
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const topMost = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (topMost) {
          const id = (topMost.target as HTMLElement).dataset.clause;
          if (id) reportRef.current(id);
        }
      },
      // A band across the upper third of the viewport: the clause the
      // reader is actually looking at, not the one scrolling off.
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [doc.id, clauseCount]);

  const byId = new Map(doc.findings.map((f) => [f.findingId, f]));

  return (
    <article ref={containerRef} className="mx-auto max-w-measure px-6 py-8">
      <header className="border-b border-line pb-8">
        <h1 className="font-display text-h1 text-ink">{doc.title}</h1>
      </header>

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
            onSelectFinding={onSelectFinding}
            active={clause.id === activeClauseId}
          />
        ))}
      </div>
    </article>
  );
}
