"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { TIER_PENDING_LABEL } from "@/lib/config/pricing";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/shared/icon";
import { Tick } from "@/components/shared/tick";
import {
  usePalette,
  useRegisterCommands,
  type PaletteCommand,
} from "@/components/shared/command-palette";
import {
  findingState,
  findingsWithClient,
  severityCounts,
  unsettledFindings,
  type Blocker,
} from "@/lib/findings";
import type { ReviewScope } from "@/lib/reviewScope";
import {
  revisionBlockedReason,
  revisionCounter,
  revisionNotice,
  type RevisionCycle,
} from "@/lib/revisions";
import type {
  ClientSettlementNote,
  MarginNotes,
  WorkspaceDocument,
} from "@/lib/types";
import { ReviewScopePanel } from "@/components/domain/review-scope-panel";
import { ReviewScopeProvider } from "./review-scope-context";
import { StateLabel } from "./state-label";
import { SeverityCounts } from "./severity";
import { ClauseIndex } from "./clause-index";
import { DocumentSurface } from "./document-surface";
import { FindingDetail } from "./finding-detail";
import { AuditTrail, type TrailEntry } from "./audit-trail";
import { ReviewShortcuts } from "./review-shortcuts";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceMenu } from "@/components/document/workspace-menu";

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
  next,
  blockers,
  aside,
  tabs,
  companion,
  commands,
  initialFindingId = null,
  initialClause = null,
  notice: callerNotice = null,
  onSettle,
  onReopen,
  onRequestChange,
  notes,
  settlementNotes,
  scope,
  revisions,
  busy = false,
  numbering,
  trail,
}: {
  doc: WorkspaceDocument;
  role: "client" | "advocate";
  back: { href: string; label: string };
  /** Who holds the document, as a phrase: "Claimed by you". */
  owner?: string;
  canAdjudicate?: boolean;
  claim?: {
    onClaim: () => void;
    claiming: boolean;
    disabledReason: string | null;
  };
  actions?: React.ReactNode;
  /** A client's next step as one control, at the right of the header. */
  next?: React.ReactNode;
  /** What stands between this document and sign-off. Advocate only. */
  blockers?: Blocker[];
  /** Right side of the status strip when there are no blockers to show. */
  aside?: React.ReactNode;
  /** The way between the document's pages (DocumentTabs), under the status strip. */
  tabs?: React.ReactNode;
  /**
   * What the right pane holds when no finding or activity is open, e.g.
   * the document agent. It keeps the full height of the pane, so it stays
   * beside the reader while the document scrolls.
   */
  companion?: (api: {
    /** The number of the clause in view, or null. */
    activeClause: string | null;
    goToClause: (clauseNumber: string) => void;
    openFinding: (findingId: string) => void;
  }) => React.ReactNode;
  /** Page-level commands for the palette, e.g. sign off. */
  commands?: PaletteCommand[];
  /** Open on this finding, e.g. when arriving from a sign-off blocker. */
  initialFindingId?: string | null;
  /** A clause number to carry the document to on arrival ("4.1"), from a link such as the summary's. */
  initialClause?: string | null;
  /**
   * A plain line for the status strip, e.g. that some findings could not be shown. It sits
   * with the revision notice and reads the same way: said once, and not an alarm.
   */
  notice?: string | null;
  onSettle?: (findingId: string, note: string | null) => void | Promise<void>;
  onReopen?: (findingId: string) => void | Promise<void>;
  onRequestChange?: (
    findingId: string,
    request: string,
  ) => void | Promise<void>;
  /** The advocate's own margin notes. Never passed on the client's side. */
  notes?: MarginNotes;
  /**
   * The advocate's notes to the client, released at sign-off, to be read beside their
   * clauses. The client's reader passes them; the advocate's page does not.
   */
  settlementNotes?: { items: ClientSettlementNote[]; label: string };
  /**
   * What the last round changed, for an advocate re-reviewing a draft. Read
   * only on the advocate's side, whatever is passed; null on a first review.
   */
  scope?: ReviewScope | null;
  /** Where the document stands against the revision limit. Advocate only. */
  revisions?: RevisionCycle;
  busy?: boolean;
  /**
   * The number each finding is read by, by the id this workspace holds it under.
   * Each portal gives its own: a client's numbers are their own and stored, an
   * advocate's are the document's. The workspace works none out itself.
   */
  numbering: Record<string, string>;
  /**
   * The record to show. Each portal gives its own, because the full record names
   * the advocate and what they decided, and a client is shown only what the API
   * hands over. The workspace builds none from the document.
   */
  trail: TrailEntry[];
}) {
  const reduced = useReducedMotion();
  const { open: openPalette } = usePalette();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null,
  );
  const [hoveredFindingId, setHoveredFindingId] = useState<string | null>(null);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(
    doc.clauses[0]?.id ?? null,
  );
  const [activityOpen, setActivityOpen] = useState(false);
  // Below xl the assistant is not beside the document; it opens from the More menu, over it.
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantRef = useRef<HTMLElement>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Display ordinals, so "finding 04" means one thing across every pane.
  const findingNumbers = numbering;

  // The re-review is scoped to what the last round changed. Only an
  // advocate has a scope, and the full set is one switch away.
  const activeScope = role === "advocate" ? (scope ?? null) : null;
  const scoped = activeScope !== null && !showAll;

  // The revision limit is the advocate's to see; the client is not told how
  // many rounds the advocate has left.
  const cycle = role === "advocate" ? (revisions ?? null) : null;
  const counter = cycle ? revisionCounter(cycle) : null;
  const notices = [callerNotice, cycle ? revisionNotice(cycle) : null].filter(
    (n): n is string => Boolean(n),
  );

  // What the panes show. The counts below it are over the whole document
  // (what sign-off checks); every finding needing a decision is in scope, so
  // the two never disagree. Numbers, detail and the trail keep using `doc`.
  const view = useMemo<WorkspaceDocument>(() => {
    if (!activeScope || showAll) return doc;
    const keep = new Set(activeScope.inScope);
    return {
      ...doc,
      findings: doc.findings.filter((f) => keep.has(f.findingId)),
      clauses: doc.clauses.map((c) => ({
        ...c,
        findingIds: c.findingIds.filter((id) => keep.has(id)),
      })),
    };
  }, [doc, activeScope, showAll]);

  const selectedFinding =
    doc.findings.find((f) => f.findingId === selectedFindingId) ?? null;
  const unsettled = unsettledFindings(doc);
  const withClient = findingsWithClient(doc).length;
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
      // A link to a finding the scoped view hides (the agent's, a sign-off
      // blocker, a URL) shows everything rather than going nowhere.
      if (activeScope?.tags[findingId] === "carried_forward" && !showAll) {
        setShowAll(true);
        // A tick later, so it also lands when the page itself opens on this
        // finding, before the toaster has mounted.
        window.setTimeout(
          () => toast("Showing all findings to open this one"),
          0,
        );
      }
      setSelectedFindingId(findingId);
      const clause = doc.clauses.find((c) => c.findingIds.includes(findingId));
      if (clause) scrollToClause(clause.id, !panelOpenRef.current);
    },
    [doc.clauses, scrollToClause, activeScope, showAll],
  );

  const changeShowAll = useCallback(
    (next: boolean) => {
      setShowAll(next);
      // Narrowing again puts down a finding the scoped view does not hold.
      if (
        !next &&
        selectedFindingId &&
        activeScope?.tags[selectedFindingId] === "carried_forward"
      ) {
        setSelectedFindingId(null);
      }
    },
    [activeScope, selectedFindingId],
  );

  const goToClauseNumber = useCallback(
    (clauseNumber: string) => {
      const clause = doc.clauses.find((c) => c.number === clauseNumber);
      if (clause) scrollToClause(clause.id);
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

  // The same for a clause: a link that names one carries the document to it, once.
  const openedClause = useRef(false);
  useEffect(() => {
    if (openedClause.current || !initialClause) return;
    openedClause.current = true;
    goToClauseNumber(initialClause);
  }, [initialClause, goToClauseNumber]);

  const stepFinding = useCallback(
    (direction: 1 | -1) => {
      if (view.findings.length === 0) return;
      const ids = view.findings.map((f) => f.findingId);
      if (!selectedFindingId) {
        selectFinding(direction === 1 ? ids[0] : ids[ids.length - 1]);
        return;
      }
      const at = ids.indexOf(selectedFindingId);
      selectFinding(ids[(at + direction + ids.length) % ids.length]);
    },
    [view.findings, selectedFindingId, selectFinding],
  );

  const closePanel = useCallback(() => {
    setSelectedFindingId(null);
    setActivityOpen(false);
    setAssistantOpen(false);
  }, []);

  // A finding or the activity record takes the pane; the assistant steps aside.
  useEffect(() => {
    if (panel) setAssistantOpen(false);
  }, [panel]);

  // Opening the drawer puts the keyboard in its field; closing it gives the keyboard back to
  // the menu it came from, so focus is never left on a hidden element.
  const assistantWasOpen = useRef(false);
  useEffect(() => {
    if (assistantOpen) {
      window.setTimeout(
        () => assistantRef.current?.querySelector("textarea")?.focus(),
        300,
      );
    } else if (assistantWasOpen.current) {
      document.querySelector<HTMLElement>('[aria-label="More"]')?.focus();
    }
    assistantWasOpen.current = assistantOpen;
  }, [assistantOpen]);

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
      if (e.key === "Escape" && (panel || assistantOpen)) {
        closePanel();
        return;
      }

      const key = e.key.toLowerCase();
      if (view.findings.length > 0 && (key === "j" || key === "k")) {
        e.preventDefault();
        stepFinding(key === "j" ? 1 : -1);
        return;
      }

      // Only the advocate holding the document settles.
      if (key === "c" && canAdjudicate && selectedFinding && onSettle) {
        if (findingState(selectedFinding) === "settled") return;
        e.preventDefault();
        onSettle(selectedFinding.findingId, null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    view.findings.length,
    panel,
    assistantOpen,
    closePanel,
    stepFinding,
    canAdjudicate,
    selectedFinding,
    onSettle,
  ]);

  const paletteCommands = useMemo<PaletteCommand[]>(() => {
    const clauseCommands: PaletteCommand[] = doc.clauses.map((clause) => ({
      id: `clause-${clause.id}`,
      group: "Clauses",
      label: `${clause.number}  ${clause.heading}`,
      hint: "Clause",
      searchText: clause.body,
      onSelect: () => scrollToClause(clause.id),
    }));
    const findingCommands: PaletteCommand[] = view.findings.map((f) => ({
      id: `finding-${f.findingId}`,
      group: "Findings",
      label: `Finding ${findingNumbers[f.findingId]} · ${f.clauseReference} · ${f.description}`,
      hint: findingState(f) === "settled" ? "Settled" : f.severity,
      searchText: f.clauseText,
      onSelect: () => selectFinding(f.findingId),
    }));
    const documentCommands: PaletteCommand[] = [
      ...(view.findings.length > 0
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
      ...(activeScope
        ? [
            {
              id: "show-all-findings",
              group: "Document",
              label: showAll
                ? "Show this round's findings"
                : "Show all findings",
              icon: "visibility" as IconName,
              onSelect: () => changeShowAll(!showAll),
            },
          ]
        : []),
    ];
    return [
      ...(commands ?? []),
      ...documentCommands,
      ...findingCommands,
      ...clauseCommands,
    ];
  }, [
    doc.clauses,
    view.findings,
    findingNumbers,
    commands,
    activeScope,
    showAll,
    changeShowAll,
    scrollToClause,
    selectFinding,
    stepFinding,
  ]);

  useRegisterCommands("workspace", paletteCommands);

  const counts = severityCounts(unsettled);

  // The advocate needs both parties and the revision count; a client reads the
  // counterparty in the title and their own name on the rail, so only the draft
  // and the tier are left for them, and they sit beside the title.
  const facts = [
    role === "advocate" ? owner : null,
    role === "advocate" ? doc.clientName : null,
    role === "advocate" ? doc.counterpartyName : null,
    `Draft ${doc.version}`,
    counter,
    doc.tier ? (
      <span key="tier">
        <span className="capitalize">{doc.tier}</span> tier
      </span>
    ) : (
      `Tier ${TIER_PENDING_LABEL.toLowerCase()}`
    ),
    // A client is told who signed off with the document's other facts, not in the row of tabs.
    role === "client" ? aside : null,
  ];

  const statusStrip = (
    <>
            {/* A client reading a signed-off document is told so on the right; "all
              settled" would say it twice. */}
            {!(
              role === "client" &&
              view.findings.length > 0 &&
              unsettled.length === 0
            ) && (
              <span className="flex items-center gap-3">
                <span className="text-meta text-muted-fg">
                  {view.findings.length === 0
                    ? scoped
                      ? "No findings in this round"
                      : "No findings raised"
                    : unsettled.length === 0
                      ? `All ${view.findings.length} findings ${scoped ? "in this round " : ""}settled`
                      : `${unsettled.length} of ${view.findings.length} findings ${scoped ? "in this round " : ""}undecided`}
                </span>
                {unsettled.length > 0 && <SeverityCounts counts={counts} />}
              </span>
            )}

            {withClient > 0 && (
              <span className="text-meta text-muted-fg">
                {withClient} with the client
              </span>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:ml-auto">
              {blockers ? (
                blockers.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-meta text-ink">
                    <Tick state="done" size="sm" />
                    Ready for sign-off
                  </span>
                ) : (
                  <>
                    <span className="text-meta text-muted-fg">
                      Before sign-off:
                    </span>
                    {blockers.slice(0, 3).map((b) =>
                      b.findingId ? (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => selectFinding(b.findingId as string)}
                          className="rounded-full border border-line bg-paper px-3 py-1 text-meta text-ink transition-colors hover:border-muted-fg/50"
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
              ) : role === "client" ? null : (
                aside
              )}
            </div>
    </>
  );

  return (
    <ReviewScopeProvider value={activeScope}>
      {/* Height-bound only where the three panes scroll for themselves (lg and up).
        Below that the page stacks and scrolls as one, so the clauses and findings
        dropdown has room to open. */}
      <div className="flex min-h-0 flex-col lg:h-full">
        <header className="border-b border-line bg-paper">
          {/* The title is a PageHeader like every other page's, so it wraps
            instead of truncating and its separators never dangle. */}
          <div className="px-5 pt-3 md:px-8">
            {role === "client" ? (
              // A client's header: the way back above, the title and its state, who it is with
              // beneath, and the next step at the right, level with the facts. The tabs follow.
              <PageHeader
                stacked
                back={{ fallbackHref: back.href, label: back.label }}
                title={doc.title.split(" · ")[0]}
                status={<StateLabel state={doc.status} />}
                meta={[`with ${doc.counterpartyName}`]}
                actions={
                  <>
                    {next}
                    <WorkspaceMenu
                      activityOpen={panel === "activity"}
                      onActivity={toggleActivity}
                      onSearch={openPalette}
                      onShortcuts={() => setShortcutsOpen(true)}
                      onAssistant={companion ? () => setAssistantOpen(true) : undefined}
                      onPrint={() => window.print()}
                    />
                    <ReviewShortcuts
                      open={shortcutsOpen}
                      onOpenChange={setShortcutsOpen}
                      includeSettle={canAdjudicate}
                    />
                    {actions}
                  </>
                }
              />
            ) : (
              <PageHeader
                stacked
                dense
                back={{ fallbackHref: back.href, label: back.label }}
                title={doc.title}
                status={<StateLabel state={doc.status} />}
                meta={facts}
                actions={
                  <>
                    <WorkspaceMenu
                      activityOpen={panel === "activity"}
                      onActivity={toggleActivity}
                      onSearch={openPalette}
                      onShortcuts={() => setShortcutsOpen(true)}
                      onAssistant={
                        companion ? () => setAssistantOpen(true) : undefined
                      }
                    />
                    <ReviewShortcuts
                      open={shortcutsOpen}
                      onOpenChange={setShortcutsOpen}
                      includeSettle={canAdjudicate}
                    />
                    {actions}
                  </>
                }
              />
            )}
          </div>

          {/* The second row: the document's tabs when it has them, then the
            status strip. The shape of the remaining work, and what stands
            between it and sign-off on the right. One row, so the header
            leaves the reading column as much height as it can. */}
          {tabs && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-paper px-5 pb-2 pt-1 md:px-8">
              {tabs}
              {role === "client" && statusStrip}
            </div>
          )}
          {role === "advocate" && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-paper px-5 py-2 md:px-8">
              {statusStrip}
            </div>
          )}

          {notices.map((text) => (
            <div
              key={text}
              role="status"
              className="flex items-start gap-2 border-t border-line bg-parchment px-5 py-3 text-meta text-ink md:px-8"
            >
              <Icon name="info" size={18} />
              <span className="max-w-measure">{text}</span>
            </div>
          ))}

          {activeScope && (
            <ReviewScopePanel
              scope={activeScope}
              findings={doc.findings}
              findingNumbers={findingNumbers}
              showAll={showAll}
              onShowAllChange={changeShowAll}
              onGoToClause={goToClauseNumber}
              onOpenFinding={selectFinding}
            />
          )}
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
            "grid transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none lg:min-h-0 lg:flex-1",
            // The reader gets the room: about a fifth for the clauses, a little over a
            // quarter for the assistant or the finding, the rest for the text. The
            // assistant sits beside the text only from xl; narrower, it is a drawer.
            panel
              ? "lg:grid-cols-[clamp(220px,20%,264px)_minmax(0,1fr)_clamp(320px,30%,400px)]"
              : companion
                ? "lg:grid-cols-[clamp(220px,20%,264px)_minmax(0,1fr)_0px] xl:grid-cols-[clamp(220px,20%,264px)_minmax(0,1fr)_clamp(300px,28%,380px)]"
                : "lg:grid-cols-[clamp(220px,20%,264px)_minmax(0,1fr)_0px]",
          )}
        >
          {/* Left · the document's own structure, and the work on it. */}
          <aside
            className={cn(
              "order-first border-line bg-canvas lg:block lg:overflow-hidden lg:border-r",
              indexOpen
                ? "block max-h-[60svh] overflow-y-auto border-b"
                : "hidden",
            )}
          >
            <ClauseIndex
              clauses={view.clauses}
              findings={view.findings}
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
          <section
            aria-label="Contract text"
            className="min-w-0 bg-paper lg:overflow-y-auto"
          >
            <DocumentSurface
              doc={view}
              findingNumbers={findingNumbers}
              selectedFindingId={selectedFindingId}
              hoveredFindingId={hoveredFindingId}
              onSelectFinding={selectFinding}
              onHoverFinding={setHoveredFindingId}
              onActiveClauseChange={setActiveClauseId}
              notes={role === "advocate" ? notes : undefined}
              settlementNotes={settlementNotes}
            />
          </section>

          {/* Right, when nothing else is open · the companion, full height.
            It is hidden rather than unmounted while a finding is open, so
            the conversation is still there when the reader comes back. */}
          {companion && (
            <aside
              ref={assistantRef}
              aria-label="Document assistant"
              className={cn(
                "min-h-0 flex-col overflow-hidden border-line bg-paper",
                assistantOpen && !panel
                  ? // The drawer: a sheet over the foot of the page, a panel at the right from lg.
                    "fixed inset-x-0 bottom-0 z-40 flex h-[75svh] rounded-t-modal border-t shadow-float lg:inset-x-auto lg:right-0 lg:top-9 lg:h-auto lg:w-[26rem] lg:rounded-none lg:border-l lg:border-t-0"
                  : "hidden",
                // Beside the text from xl, whenever nothing else holds the pane.
                !panel &&
                  "xl:static xl:z-auto xl:flex xl:h-auto xl:w-auto xl:rounded-none xl:border-l xl:border-t-0 xl:shadow-none",
              )}
            >
              {assistantOpen && !panel && (
                <div className="flex shrink-0 items-center justify-end border-b border-line px-2 py-1 xl:hidden">
                  <PaneButton
                    icon="close"
                    label="Close assistant"
                    onClick={() => setAssistantOpen(false)}
                  />
                </div>
              )}
              <div className="min-h-0 flex-1 [&>*]:h-full">
                {companion({
                  activeClause: doc.clauses.find((c) => c.id === activeClauseId)?.number ?? null,
                  goToClause: goToClauseNumber,
                  openFinding: selectFinding,
                })}
              </div>
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
                    <span className="ml-1 font-mono text-label text-muted-fg">
                      {scoped
                        ? String(
                            view.findings.findIndex(
                              (f) => f.findingId === selectedFinding.findingId,
                            ) + 1,
                          ).padStart(2, "0")
                        : findingNumbers[selectedFinding.findingId]}{" "}
                      of {String(view.findings.length).padStart(2, "0")}
                    </span>
                  </div>
                ) : (
                  <span className="px-1 text-label font-medium text-muted-fg">
                    Activity
                  </span>
                )}
                <PaneButton
                  icon="close"
                  label="Close the panel"
                  onClick={closePanel}
                />
              </div>

              {panel === "finding" && selectedFinding ? (
                <FindingDetail
                  doc={doc}
                  finding={selectedFinding}
                  number={findingNumbers[selectedFinding.findingId]}
                  role={role}
                  canAdjudicate={canAdjudicate}
                  claim={claim}
                  onSettle={(note) =>
                    onSettle?.(selectedFinding.findingId, note)
                  }
                  onReopen={onReopen ? () => onReopen?.(selectedFinding.findingId) : undefined}
                  onRequestChange={(request) =>
                    onRequestChange?.(selectedFinding.findingId, request)
                  }
                  requestBlockedReason={
                    cycle ? revisionBlockedReason(cycle) : null
                  }
                  busy={busy}
                  trail={trail}
                />
              ) : (
                <div className="p-4 lg:p-5">
                  <AuditTrail
                    entries={trail}
                    title={null}
                    onSelectFinding={selectFinding}
                  />
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </ReviewScopeProvider>
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
