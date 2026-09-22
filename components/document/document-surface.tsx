"use client";

import { useEffect, useRef } from "react";
import type { ContractDocument, Finding } from "@/lib/types";
import { ClauseBlock } from "./clause-block";
import { FindingBar } from "./finding-bar";

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

    // The pane scrolls, not the window, so positions are measured
    // against the pane. The observer only says "something moved"; the
    // reading itself is taken from the nodes, because at a boundary two
    // clauses intersect any band at once and the one the reader is on is
    // the last one whose heading has passed the top of the pane.
    const scrollRoot = root.parentElement;
    if (!scrollRoot) return;

    // Matches scroll-mt-14 on ClauseBlock, so a clause scrolled to rest
    // reports itself rather than the clause above it.
    const ANCHOR = 57;

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

    const observer = new IntersectionObserver(report, {
      root: scrollRoot,
      threshold: [0, 1],
    });

    scrollRoot.addEventListener("scroll", report, { passive: true });
    report();

    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      scrollRoot.removeEventListener("scroll", report);
    };
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
      className="@container mx-auto max-w-[76rem] px-6 py-8 md:px-10"
    >
      {/* The document's own title page. The chrome above states which
          document this is for navigation; here it opens the instrument. */}
      <header className="max-w-measure border-b border-line pb-8">
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

      {unattached.length > 0 && (
        <section className="max-w-measure border-t border-line pt-8">
          <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
            Findings not attached to a clause
          </p>
          <div className="mt-4 space-y-1">
            {unattached.map((finding) => (
              <FindingBar
                key={finding.findingId}
                finding={finding}
                number={findingNumbers[finding.findingId] ?? "--"}
                selected={selectedFindingId === finding.findingId}
                onSelect={() => onSelectFinding(finding.findingId)}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
