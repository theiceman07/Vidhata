"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import {
  canSettle,
  findingState,
  hasBlockedCitation,
  openFindingCount,
} from "@/lib/findings";
import type { ContractDocument } from "@/lib/types";
import { Dateline } from "./dateline";
import { StateLabel } from "./state-label";
import { ClauseIndex } from "./clause-index";
import { DocumentSurface } from "./document-surface";
import { FindingDetail } from "./finding-detail";
import { ReviewShortcuts } from "./review-shortcuts";

/**
 * The document workspace.
 *
 * One header, then three panes: the clause index, the contract, and the
 * finding in hand with its evidence. One component tree for both
 * portals, separated by role rather than by a parallel set of screens —
 * the client reads the same document the advocate adjudicates, minus the
 * controls and the rule machinery.
 *
 * The third pane is contextual. With no finding selected the document
 * takes the width instead of a standing empty panel; selecting a finding
 * opens the evidence beside the document, never over it, so inspecting a
 * source never costs the reader their place. On a small screen that
 * third pane becomes a sheet pinned to the bottom of the document.
 */
export function DocumentWorkspace({
  doc,
  role,
  back,
  actions,
  /** The chain of custody, on settled documents. */
  subheader,
  /** Why the primary action is unavailable. Stated, never hidden. */
  notice,
  onSettle,
  onReopen,
  busy = false,
}: {
  doc: ContractDocument;
  role: "client" | "advocate";
  back: { href: string; label: string };
  actions?: React.ReactNode;
  subheader?: React.ReactNode;
  notice?: string | null;
  onSettle: (findingId: string, note: string | null) => void | Promise<void>;
  onReopen: (findingId: string) => void | Promise<void>;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null,
  );
  const [activeClauseId, setActiveClauseId] = useState<string | null>(
    doc.clauses[0]?.id ?? null,
  );
  const [indexOpen, setIndexOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
  const blocked = hasBlockedCitation(doc);

  const scrollToClause = useCallback(
    (clauseId: string) => {
      setActiveClauseId(clauseId);
      // Selecting a finding opens the third pane, which narrows the
      // document and reflows it. Scrolling in the same frame aims at
      // where the clause *was*, so wait for the new layout first.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(`clause-${clauseId}`)?.scrollIntoView({
            behavior: reduced ? "auto" : "smooth",
            block: "start",
          });
        });
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

  const stepFinding = useCallback(
    (direction: 1 | -1) => {
      if (doc.findings.length === 0) return;
      const ids = doc.findings.map((f) => f.findingId);
      if (!selectedFindingId) {
        selectFinding(direction === 1 ? ids[0] : ids[ids.length - 1]);
        return;
      }
      const at = ids.indexOf(selectedFindingId);
      selectFinding(ids[(at + direction + ids.length) % ids.length]);
    },
    [doc.findings, selectedFindingId, selectFinding],
  );

  /**
   * J and K step between findings, C settles the one in hand — the
   * convention for a reviewer working a queue without leaving the
   * keyboard. Escape puts the finding down. Selection lives here, so the
   * shortcuts do too, and every one of them has a visible control.
   *
   * QA 4.3: the guard checks Radix surfaces as well as form fields, so a
   * "c" typed into an open Select, a dialog or a contenteditable node
   * cannot silently settle a finding. Modified keystrokes are OS or
   * browser shortcuts and are left alone.
   */
  useEffect(() => {
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

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }

      if (e.key === "Escape" && selectedFindingId) {
        setSelectedFindingId(null);
        return;
      }

      if (doc.findings.length === 0) return;
      const key = e.key.toLowerCase();

      if (key === "j" || key === "k") {
        e.preventDefault();
        stepFinding(key === "j" ? 1 : -1);
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
    doc.findings.length,
    selectedFindingId,
    stepFinding,
    role,
    selectedFinding,
    onSettle,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* One header. What document, whose, what state, what is left to
          decide, and the one action that follows from it. */}
      <header className="border-b border-line bg-paper px-4 py-4 md:px-6">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 font-mono text-notation uppercase tracking-notation text-muted-fg transition-colors hover:text-ink"
        >
          <Icon name="chevron_left" size={16} />
          {back.label}
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="font-display text-h1 text-ink">{doc.title}</h1>
            <p className="mt-1 text-meta text-muted-fg">
              {doc.clientName} · {doc.counterpartyName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-col gap-1">
              <StateLabel state={doc.status} className="self-start" />
              <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
                {openCount === 0
                  ? "No open findings"
                  : `${openCount} open ${openCount === 1 ? "finding" : "findings"}`}
                {blocked && (
                  <>
                    <span className="mx-2 text-line">·</span>
                    <span className="text-flagged">1 citation blocked</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ReviewShortcuts
                open={shortcutsOpen}
                onOpenChange={setShortcutsOpen}
                includeSettle={role === "advocate"}
              />
              {actions}
            </div>
          </div>
        </div>

        {subheader && <div className="mt-4">{subheader}</div>}

        {notice && (
          <p className="mt-3 border-l-2 border-caution pl-3 text-meta text-ink">
            {notice}
          </p>
        )}
      </header>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIndexOpen((v) => !v)}
          aria-expanded={indexOpen}
          className="flex w-full items-center gap-2 border-b border-line px-4 py-2.5 text-left font-mono text-notation uppercase tracking-notation text-muted-fg"
        >
          <Icon name={indexOpen ? "expand_less" : "expand_more"} size={18} />
          {indexOpen ? "Hide clauses" : "Clauses and findings"}
        </button>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 transition-[grid-template-columns] duration-200 ease-out",
          selectedFinding
            ? "lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)_minmax(340px,400px)]"
            : "lg:grid-cols-[minmax(200px,240px)_minmax(0,1fr)_0px]",
        )}
      >
        {/* Left · the document's own structure. */}
        <aside
          className={cn(
            "order-first border-line bg-canvas p-4 lg:block lg:overflow-y-auto lg:border-r",
            indexOpen ? "block border-b" : "hidden",
          )}
        >
          <ClauseIndex
            clauses={doc.clauses}
            findings={doc.findings}
            findingNumbers={findingNumbers}
            activeClauseId={activeClauseId}
            selectedFindingId={selectedFindingId}
            onSelectClause={(id) => {
              scrollToClause(id);
              setIndexOpen(false);
            }}
            onSelectFinding={(id) => {
              selectFinding(id);
              setIndexOpen(false);
            }}
            openCount={openCount}
          />
        </aside>

        {/* Centre · the contract. */}
        <main className="min-w-0 bg-paper lg:overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-line bg-paper/95 px-6 py-2 backdrop-blur-sm">
            <Dateline
              segments={[
                activeClause && `Clause ${activeClause.number}`,
                activeClause?.heading,
                selectedFinding &&
                  `Finding ${findingNumbers[selectedFinding.findingId]}`,
              ]}
            />
          </div>
          <DocumentSurface
            doc={doc}
            findingNumbers={findingNumbers}
            selectedFindingId={selectedFindingId}
            onSelectFinding={selectFinding}
            activeClauseId={activeClauseId}
            onActiveClauseChange={setActiveClauseId}
          />
        </main>

        {/* Right · the finding in hand, with its source adjacent. On a
            small screen it is a sheet over the foot of the document. */}
        {selectedFinding && (
          <aside
            aria-label="Finding"
            className={cn(
              "border-line bg-canvas",
              "fixed inset-x-0 bottom-0 z-40 max-h-[70svh] overflow-y-auto border-t shadow-card",
              "lg:static lg:max-h-none lg:overflow-y-auto lg:border-l lg:border-t-0 lg:shadow-none",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 lg:px-6">
              <div className="flex items-center gap-1">
                <PaneButton
                  icon="keyboard_arrow_up"
                  label="Previous finding"
                  onClick={() => stepFinding(-1)}
                />
                <PaneButton
                  icon="keyboard_arrow_down"
                  label="Next finding"
                  onClick={() => stepFinding(1)}
                />
              </div>
              <PaneButton
                icon="close"
                label="Close the finding"
                onClick={() => setSelectedFindingId(null)}
              />
            </div>

            <div className="p-4 lg:p-6">
              <FindingDetail
                doc={doc}
                finding={selectedFinding}
                number={findingNumbers[selectedFinding.findingId]}
                role={role}
                onSettle={(note) => onSettle(selectedFinding.findingId, note)}
                onReopen={() => onReopen(selectedFinding.findingId)}
                busy={busy}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function PaneButton({
  icon,
  label,
  onClick,
}: {
  icon: "keyboard_arrow_up" | "keyboard_arrow_down" | "close";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-control p-1.5 text-muted-fg transition-colors hover:bg-parchment hover:text-ink"
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
