"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canSettle, findingState, openFindingCount } from "@/lib/findings";
import type { ContractDocument } from "@/lib/types";
import { Dateline } from "./dateline";
import { StateLabel } from "./state-label";
import { ClauseIndex } from "./clause-index";
import { DocumentSurface } from "./document-surface";
import { FindingDetail } from "./finding-detail";

/**
 * The document workspace.
 *
 * Three panes: the clause index, the contract, and the selected finding
 * with its evidence. One component tree for both portals, separated by
 * role rather than by a parallel set of screens — the client reads the
 * same document the advocate adjudicates, minus the controls and the
 * rule machinery.
 *
 * Selection is shared: choosing a finding anywhere moves the document to
 * its clause and marks it in the index. Evidence opens beside the
 * document, never over it, so inspecting a source never costs the
 * reader their place.
 */
export function DocumentWorkspace({
  doc,
  role,
  onSettle,
  onReopen,
  busy = false,
}: {
  doc: ContractDocument;
  role: "client" | "advocate";
  onSettle: (findingId: string, note: string | null) => void | Promise<void>;
  onReopen: (findingId: string) => void | Promise<void>;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    doc.findings[0]?.findingId ?? null,
  );
  const [activeClauseId, setActiveClauseId] = useState<string | null>(
    doc.clauses[0]?.id ?? null,
  );
  const [indexOpen, setIndexOpen] = useState(false);

  // Display ordinals, fixed by the order the pipeline raised the
  // findings, so "finding 04" means one thing across every pane.
  const findingNumbers = useMemo(() => {
    const map: Record<string, string> = {};
    doc.findings.forEach((f, i) => {
      map[f.findingId] = String(i + 1).padStart(2, "0");
    });
    return map;
  }, [doc.findings]);

  const selectedFinding =
    doc.findings.find((f) => f.findingId === selectedFindingId) ?? null;
  const activeClause = doc.clauses.find((c) => c.id === activeClauseId) ?? null;
  const openCount = openFindingCount(doc);

  const scrollToClause = useCallback(
    (clauseId: string) => {
      setActiveClauseId(clauseId);
      document.getElementById(`clause-${clauseId}`)?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    },
    [reduced],
  );

  // Selecting a finding carries the document to it. The three panes
  // always describe the same place.
  const selectFinding = useCallback(
    (findingId: string) => {
      setSelectedFindingId(findingId);
      const clause = doc.clauses.find((c) => c.findingIds.includes(findingId));
      if (clause) scrollToClause(clause.id);
    },
    [doc.clauses, scrollToClause],
  );

  /**
   * J and K step between findings, C settles the one in hand — the
   * convention for a reviewer working a queue without leaving the
   * keyboard. Selection lives here, so the shortcuts do too.
   *
   * QA 4.3: the guard checks Radix surfaces as well as form fields, so a
   * "c" typed into an open Select, a dialog or a contenteditable node
   * cannot silently settle a finding. Modified keystrokes are OS or
   * browser shortcuts and are left alone.
   */
  useEffect(() => {
    if (doc.findings.length === 0) return;

    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
      if (target.isContentEditable) return true;
      return !!target.closest(
        '[role="dialog"], [role="listbox"], [data-radix-popper-content-wrapper]',
      );
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();

      if (key === "j" || key === "k") {
        e.preventDefault();
        const ids = doc.findings.map((f) => f.findingId);
        const at = ids.indexOf(selectedFindingId ?? ids[0]);
        const next = (at + (key === "j" ? 1 : -1) + ids.length) % ids.length;
        selectFinding(ids[next]);
        return;
      }

      // Only an advocate adjudicates, and a blocked source blocks the
      // settle here exactly as it does on the button.
      if (key === "c" && role === "advocate" && selectedFinding) {
        if (findingState(selectedFinding) === "settled") return;
        if (!canSettle(selectedFinding)) return;
        e.preventDefault();
        onSettle(selectedFinding.findingId, null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    doc.findings,
    selectedFindingId,
    selectFinding,
    role,
    selectedFinding,
    onSettle,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The dateline: where you are, at all times. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3">
        <Dateline
          segments={[
            doc.title,
            activeClause && `Clause ${activeClause.number}`,
            selectedFinding &&
              `Finding ${findingNumbers[selectedFinding.findingId]}`,
          ]}
        />
        <StateLabel state={doc.status} />
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)_minmax(320px,380px)]">
        <div className="lg:hidden">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-none border-b border-line"
            onClick={() => setIndexOpen((v) => !v)}
            aria-expanded={indexOpen}
          >
            {indexOpen ? "Hide clauses" : "Clauses"}
          </Button>
        </div>

        {/* Left · clause index. Collapsible on small screens. */}
        <aside
          className={cn(
            "order-first border-line bg-canvas p-4 lg:block lg:overflow-y-auto lg:border-r",
            indexOpen ? "block border-b" : "hidden",
          )}
        >
          <ClauseIndex
            clauses={doc.clauses}
            findings={doc.findings}
            activeClauseId={activeClauseId}
            onSelect={(id) => {
              scrollToClause(id);
              setIndexOpen(false);
            }}
            openCount={openCount}
          />
        </aside>

        {/* Centre · the contract. */}
        <main className="min-w-0 bg-paper lg:overflow-y-auto">
          <DocumentSurface
            doc={doc}
            findingNumbers={findingNumbers}
            selectedFindingId={selectedFindingId}
            onSelectFinding={selectFinding}
            activeClauseId={activeClauseId}
            onActiveClauseChange={setActiveClauseId}
          />
        </main>

        {/* Right · the finding, with its source adjacent. */}
        <aside className="border-line bg-canvas p-6 lg:overflow-y-auto lg:border-l">
          {selectedFinding ? (
            <FindingDetail
              doc={doc}
              finding={selectedFinding}
              number={findingNumbers[selectedFinding.findingId]}
              role={role}
              onSettle={(note) => onSettle(selectedFinding.findingId, note)}
              onReopen={() => onReopen(selectedFinding.findingId)}
              busy={busy}
            />
          ) : (
            <div>
              <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
                Findings
              </p>
              <p className="mt-3 text-meta text-muted-fg">
                {doc.findings.length === 0
                  ? "The first pass raised no findings against this document."
                  : "Select a finding to read it with its source."}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
