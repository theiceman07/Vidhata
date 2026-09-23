"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/shared/icon";
import {
  usePalette,
  useRegisterCommands,
  type PaletteCommand,
} from "@/components/shared/command-palette";
import {
  blockingCitations,
  canSettle,
  findingNumbers as numberFindings,
  findingState,
  findingsWithClient,
  settleNeedsNote,
  severityCounts,
  unsettledFindings,
  type Blocker,
} from "@/lib/findings";
import { buildAuditTrail } from "@/lib/audit";
import type { ContractDocument, MarginNotes } from "@/lib/types";
import { StateLabel } from "./state-label";
import { SeverityCounts } from "./severity";
import { ClauseIndex } from "./clause-index";
import { DocumentSurface } from "./document-surface";
import { FindingDetail } from "./finding-detail";
import { AuditTrail } from "./audit-trail";
import { ReviewShortcuts } from "./review-shortcuts";

/**
 * The document workspace.
 *
 * One compact header, one status strip, then three panes: the clause
 * index, the contract, and a contextual third pane holding either the
 * finding in hand or the document's activity. One component tree for both
 * portals, separated by role: the client reads the same document the
 * advocate adjudicates, minus the controls and the rule machinery.
 *
 * The header is deliberately small. The document is the subject of this
 * screen; the chrome around it states what it is, whose it is, what is
 * left, and what stands between it and sign-off, in two lines.
 */
export function DocumentWorkspace({
  doc,
  role,
  back,
  owner,
  canAdjudicate = false,
  claim,
  actions,
  blockers,
  aside,
  companion,
  commands,
  initialFindingId = null,
  onSettle,
  onReopen,
  onRequestChange,
  onWithdrawSource,
  notes,
  busy = false,
}: {
  doc: ContractDocument;
  role: "client" | "advocate";
  back: { href: string; label: string };
  /** Who holds the document, as a phrase: "Claimed by you". */
  owner?: string;
  canAdjudicate?: boolean;
  claim?: { onClaim: () => void; claiming: boolean; disabledReason: string | null };
  actions?: React.ReactNode;
  /** What stands between this document and sign-off. Advocate only. */
  blockers?: Blocker[];
  /** Right side of the status strip when there are no blockers to show. */
  aside?: React.ReactNode;
  /**
   * What the right pane holds when no finding or activity is open, e.g.
   * the document agent. It keeps the full height of the pane, so it stays
   * beside the reader while the document scrolls.
   */
  companion?: (api: {
    goToClause: (clauseNumber: string) => void;
    openFinding: (findingId: string) => void;
  }) => React.ReactNode;
  /** Page-level commands for the palette, e.g. sign off. */
  commands?: PaletteCommand[];
  /** Open on this finding, e.g. when arriving from a sign-off blocker. */
  initialFindingId?: string | null;
  onSettle?: (findingId: string, note: string | null) => void | Promise<void>;
  onReopen?: (findingId: string) => void | Promise<void>;
  onRequestChange?: (findingId: string, request: string) => void | Promise<void>;
  onWithdrawSource?: (findingId: string, citationId: string, note: string) => void | Promise<void>;
  /** The advocate's own margin notes. Never passed on the client's side. */
  notes?: MarginNotes;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const { open: openPalette } = usePalette();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(
    doc.clauses[0]?.id ?? null,
  );
  const [activityOpen, setActivityOpen] = useState(false);
  const [indexOpen, setIndexOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Display ordinals, fixed by the order the pipeline raised the
  // findings, so "finding 04" means one thing across every pane.
  const findingNumbers = useMemo(() => numberFindings(doc), [doc]);

  const selectedFinding =
    doc.findings.find((f) => f.findingId === selectedFindingId) ?? null;
  const unsettled = unsettledFindings(doc);
  const withClient = findingsWithClient(doc).length;
  const blockedFindings = doc.findings.filter(
    (f) => blockingCitations(f).length > 0,
  );
  const panel = selectedFinding ? "finding" : activityOpen ? "activity" : null;
  const panelOpenRef = useRef(false);
  panelOpenRef.current = panel !== null;

  const scrollToClause = useCallback(
    (clauseId: string, opensPanel = false) => {
      setActiveClauseId(clauseId);
      // Opening the third pane narrows the document and reflows it, over
      // the 200ms the column transition takes. Scrolling before that ends
      // aims at where the clause *was*, so wait for the final layout.
      const scroll = () =>
        document.getElementById(`clause-${clauseId}`)?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      if (opensPanel && !reduced) {
        window.setTimeout(() => requestAnimationFrame(scroll), 220);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(scroll));
      }
    },
    [reduced],
  );

  // Selecting a finding carries the document to it. The three panes
  // always describe the same place.
  const selectFinding = useCallback(
    (findingId: string) => {
      setSelectedFindingId(findingId);
      const clause = doc.clauses.find((c) => c.findingIds.includes(findingId));
      if (clause) scrollToClause(clause.id, !panelOpenRef.current);
    },
    [doc.clauses, scrollToClause],
  );

  // Arriving with a finding named opens it and carries the document to it,
  // once. Later changes to the URL are the reader's own navigation.
  const openedInitial = useRef(false);
  useEffect(() => {
    if (openedInitial.current || !initialFindingId) return;
    openedInitial.current = true;
    if (doc.findings.some((f) => f.findingId === initialFindingId)) {
      selectFinding(initialFindingId);
    }
  }, [initialFindingId, doc.findings, selectFinding]);

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

  const closePanel = useCallback(() => {
    setSelectedFindingId(null);
    setActivityOpen(false);
  }, []);

  const toggleActivity = useCallback(() => {
    setSelectedFindingId(null);
    setActivityOpen((v) => !v);
  }, []);

  /**
   * J and K step between findings, C settles the one in hand. Escape puts
   * the panel down. Every one of them has a visible control.
   *
   * The guard checks Radix surfaces as well as form fields, so a "c"
   * typed into an open select, a dialog or a contenteditable node cannot
   * settle a finding. Modified keystrokes belong to the OS, the browser
   * and the command palette.
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
      if (e.key === "Escape" && panel) {
        closePanel();
        return;
      }

      const key = e.key.toLowerCase();
      if (doc.findings.length > 0 && (key === "j" || key === "k")) {
        e.preventDefault();
        stepFinding(key === "j" ? 1 : -1);
        return;
      }

      // Only the advocate holding the document settles, and never past a
      // blocked source or a missing note.
      if (key === "c" && canAdjudicate && selectedFinding && onSettle) {
        if (findingState(selectedFinding) === "settled") return;
        if (!canSettle(selectedFinding) || settleNeedsNote(selectedFinding)) return;
        e.preventDefault();
        onSettle(selectedFinding.findingId, null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc.findings.length, panel, closePanel, stepFinding, canAdjudicate, selectedFinding, onSettle]);

  const paletteCommands = useMemo<PaletteCommand[]>(() => {
    const clauseCommands: PaletteCommand[] = doc.clauses.map((clause) => ({
      id: `clause-${clause.id}`,
      group: "Clauses",
      label: `${clause.number}  ${clause.heading}`,
      hint: "Clause",
      searchText: clause.body,
      onSelect: () => scrollToClause(clause.id),
    }));
    const findingCommands: PaletteCommand[] = doc.findings.map((f) => ({
      id: `finding-${f.findingId}`,
      group: "Findings",
      label: `Finding ${findingNumbers[f.findingId]} · ${f.clauseReference} · ${f.description}`,
      hint:
        findingState(f) === "settled"
          ? "Settled"
          : blockingCitations(f).length > 0
            ? "Blocked"
            : f.severity,
      searchText: f.clauseText,
      onSelect: () => selectFinding(f.findingId),
    }));
    const documentCommands: PaletteCommand[] = [
      ...(doc.findings.length > 0
        ? [
            {
              id: "next-finding",
              group: "Document",
              label: "Next finding",
              hint: "J",
              icon: "keyboard_arrow_down" as IconName,
              onSelect: () => stepFinding(1),
            },
            {
              id: "prev-finding",
              group: "Document",
              label: "Previous finding",
              hint: "K",
              icon: "keyboard_arrow_up" as IconName,
              onSelect: () => stepFinding(-1),
            },
          ]
        : []),
      {
        id: "activity",
        group: "Document",
        label: "Show activity",
        icon: "history",
        onSelect: () => {
          setSelectedFindingId(null);
          setActivityOpen(true);
        },
      },
    ];
    return [...(commands ?? []), ...documentCommands, ...findingCommands, ...clauseCommands];
  }, [doc, findingNumbers, commands, scrollToClause, selectFinding, stepFinding]);

  useRegisterCommands("workspace", paletteCommands);

  const counts = severityCounts(unsettled);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-line bg-paper">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 md:px-8">
          <Link
            href={back.href}
            aria-label={`Back to ${back.label}`}
            title={back.label}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-parchment"
          >
            <Icon name="arrow_back" size={20} />
          </Link>

          <div className="min-w-0 flex-1 basis-72">
            <h1 className="truncate font-display text-[26px] font-medium leading-tight tracking-[-0.015em] text-ink">
              {doc.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-muted-fg">
              <span>{doc.clientName}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-line" />
              <span>{doc.counterpartyName}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-line" />
              <span>Draft {doc.version}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-line" />
              <span><span className="capitalize">{doc.tier}</span> tier</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StateLabel state={doc.status} />
            {owner && <span className="text-meta text-muted-fg">{owner}</span>}
            <span aria-hidden className="mx-2 hidden h-6 w-px bg-line md:block" />
            <HeaderButton
              icon="history"
              label="Activity"
              pressed={panel === "activity"}
              onClick={toggleActivity}
            />
            <HeaderButton icon="search" label="Search" onClick={openPalette} />
            <ReviewShortcuts
              open={shortcutsOpen}
              onOpenChange={setShortcutsOpen}
              includeSettle={canAdjudicate}
            />
            {actions}
          </div>
        </div>

        {/* The status strip. The shape of the remaining work on the left,
            what stands between it and sign-off on the right. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-paper px-5 py-3 md:px-8">
          <span className="flex items-center gap-3">
            <span className="text-meta text-muted-fg">
              {doc.findings.length === 0
                ? "No findings raised"
                : unsettled.length === 0
                  ? `All ${doc.findings.length} findings settled`
                  : `${unsettled.length} of ${doc.findings.length} findings undecided`}
            </span>
            {unsettled.length > 0 && <SeverityCounts counts={counts} />}
          </span>

          {blockedFindings.length > 0 && (
            <button
              type="button"
              onClick={() => selectFinding(blockedFindings[0].findingId)}
              className="inline-flex items-center gap-1 text-meta text-flagged underline-offset-2 hover:underline"
            >
              <Icon name="error" size={16} />
              {blockedFindings.length} {blockedFindings.length === 1 ? "source" : "sources"} blocked
            </button>
          )}
          {withClient > 0 && (
            <span className="text-meta text-muted-fg">{withClient} with the client</span>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:ml-auto">
            {blockers ? (
              blockers.length === 0 ? (
                <span className="inline-flex items-center gap-1 text-meta text-verified">
                  <Icon name="check_circle" size={16} />
                  Ready for sign-off
                </span>
              ) : (
                <>
                  <span className="text-meta text-muted-fg">Before sign-off:</span>
                  {blockers.slice(0, 3).map((b) =>
                    b.findingId ? (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => selectFinding(b.findingId as string)}
                        className="rounded-control border border-line bg-paper px-1.5 py-px text-meta text-ink transition-colors hover:border-muted-fg/50"
                      >
                        {b.label}
                      </button>
                    ) : (
                      <span key={b.label} className="text-meta text-ink">
                        {b.label}
                      </span>
                    ),
                  )}
                  {blockers.length > 3 && (
                    <span className="text-meta text-muted-fg">
                      +{blockers.length - 3} more
                    </span>
                  )}
                </>
              )
            ) : (
              aside
            )}
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIndexOpen((v) => !v)}
          aria-expanded={indexOpen}
          className="flex w-full items-center gap-2 border-b border-line px-4 py-2 text-left text-meta text-muted-fg"
        >
          <Icon name={indexOpen ? "expand_less" : "expand_more"} size={18} />
          {indexOpen ? "Hide clauses and findings" : "Clauses and findings"}
        </button>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
          panel
            ? "lg:grid-cols-[240px_minmax(0,1fr)_minmax(340px,400px)]"
            : companion
              ? "lg:grid-cols-[240px_minmax(0,1fr)_minmax(360px,440px)]"
              : "lg:grid-cols-[240px_minmax(0,1fr)_0px]",
        )}
      >
        {/* Left · the document's own structure, and the work on it. */}
        <aside
          className={cn(
            "order-first border-line bg-canvas lg:block lg:overflow-hidden lg:border-r",
            indexOpen ? "block max-h-[60svh] overflow-y-auto border-b" : "hidden",
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
            onHoverFinding={setHoveredFindingId}
          />
        </aside>

        {/* Centre · the contract. */}
        <main className="min-w-0 bg-paper lg:overflow-y-auto">
          <DocumentSurface
            doc={doc}
            findingNumbers={findingNumbers}
            selectedFindingId={selectedFindingId}
            hoveredFindingId={hoveredFindingId}
            onSelectFinding={selectFinding}
            onHoverFinding={setHoveredFindingId}
            onActiveClauseChange={setActiveClauseId}
            notes={role === "advocate" ? notes : undefined}
          />
        </main>

        {/* Right, when nothing else is open · the companion, full height.
            It is hidden rather than unmounted while a finding is open, so
            the conversation is still there when the reader comes back. */}
        {companion && (
          <aside
            aria-label="Document assistant"
            className={cn(
              "hidden min-h-0 border-l border-line bg-paper lg:overflow-hidden",
              !panel && "lg:block",
            )}
          >
            {companion({
              goToClause: (n) => {
                const clause = doc.clauses.find((c) => c.number === n);
                if (clause) scrollToClause(clause.id);
              },
              openFinding: selectFinding,
            })}
          </aside>
        )}

        {/* Right · the finding in hand, or the record. On a small screen
            it is a sheet over the foot of the document. */}
        {panel && (
          <aside
            aria-label={panel === "finding" ? "Finding" : "Activity"}
            className={cn(
              "border-line bg-canvas",
              "fixed inset-x-0 bottom-0 z-40 max-h-[75svh] overflow-y-auto rounded-t-modal border-t shadow-float",
              "lg:static lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none",
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-canvas px-3 py-1.5">
              {panel === "finding" && selectedFinding ? (
                <div className="flex items-center gap-1">
                  <PaneButton icon="keyboard_arrow_up" label="Previous finding" onClick={() => stepFinding(-1)} />
                  <PaneButton icon="keyboard_arrow_down" label="Next finding" onClick={() => stepFinding(1)} />
                  <span className="ml-1 font-mono text-label text-muted-fg">
                    {findingNumbers[selectedFinding.findingId]} of{" "}
                    {String(doc.findings.length).padStart(2, "0")}
                  </span>
                </div>
              ) : (
                <span className="px-1 text-label font-medium text-muted-fg">Activity</span>
              )}
              <PaneButton icon="close" label="Close the panel" onClick={closePanel} />
            </div>

            {panel === "finding" && selectedFinding ? (
              <FindingDetail
                doc={doc}
                finding={selectedFinding}
                number={findingNumbers[selectedFinding.findingId]}
                role={role}
                canAdjudicate={canAdjudicate}
                claim={claim}
                onSettle={(note) => onSettle?.(selectedFinding.findingId, note)}
                onReopen={() => onReopen?.(selectedFinding.findingId)}
                onRequestChange={(request) =>
                  onRequestChange?.(selectedFinding.findingId, request)
                }
                onWithdrawSource={(citationId, note) =>
                  onWithdrawSource?.(selectedFinding.findingId, citationId, note)
                }
                busy={busy}
              />
            ) : (
              <div className="p-4 lg:p-5">
                <AuditTrail
                  entries={buildAuditTrail(doc)}
                  title={null}
                  onSelectFinding={selectFinding}
                />
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function HeaderButton({
  icon,
  label,
  onClick,
  pressed,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-3 text-meta font-medium transition-colors",
        pressed ? "bg-ink text-paper" : "text-muted-fg hover:bg-parchment hover:text-ink",
      )}
    >
      <Icon name={icon} size={18} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function PaneButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
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
