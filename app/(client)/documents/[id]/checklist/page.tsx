"use client";

import { TextLink } from "@/components/shared/text-link";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { Tick } from "@/components/shared/tick";
import { ErrorState } from "@/components/shared/error-state";
import {
  ExecutionChecklist,
  STEP_TITLE,
  nextStep,
} from "@/components/domain/execution-checklist";
import { dealRows } from "@/components/domain/document-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  attachClientEvidence,
  getClientDocument,
  toggleClientStep,
} from "@/lib/api/client/documents";
import { getClientTrail } from "@/lib/api/client/trail";
import { scrollBehavior } from "@/lib/motion";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type {
  ClientAuditEntry,
  ClientDocument,
  ExecutionStep,
} from "@/lib/types";
import { documentIdentity } from "@/lib/documentTitle";
import { StateLabel } from "@/components/document/state-label";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentTabs } from "@/components/document/document-tabs";

type LoadState = "loading" | "error" | "loaded";
type Kind = ExecutionStep["kind"];

const ORG = MOCK_CLIENT_ORG.id;


/**
 * The execution checklist, from what a client is handed: the document, its
 * checklist and the client's own activity. The advocate is named only by the
 * sign-off record, and a step is ticked as the client's organisation.
 */
export default function ChecklistPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ClientDocument | null>(null);
  const [trail, setTrail] = useState<ClientAuditEntry[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyKind, setBusyKind] = useState<Kind | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      // Read together, so the activity never disagrees with the document.
      const [result, entries] = await Promise.all([
        getClientDocument(ORG, params.id),
        getClientTrail(ORG, params.id),
      ]);
      if (!result || !entries) throw new Error("Document not found.");
      setDoc(result);
      setTrail(entries);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this document.",
      );
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(
    kind: Kind,
    action: () => Promise<ClientDocument>,
    failure: string,
  ) {
    setBusyKind(kind);
    try {
      const changed = await action();
      setDoc(changed);
      // A step ticked is activity, so the trail is read again with it.
      setTrail((await getClientTrail(ORG, changed.id)) ?? trail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : failure);
    } finally {
      setBusyKind(null);
    }
  }

  function handleToggle(kind: Kind, complete: boolean) {
    if (!doc) return;
    save(
      kind,
      () => toggleClientStep(ORG, doc.id, kind, complete),
      "Could not update the checklist.",
    );
  }

  function handleAttach(kind: Kind, fileName: string | null) {
    if (!doc) return;
    save(
      kind,
      () => attachClientEvidence(ORG, doc.id, kind, fileName),
      "Could not attach this file.",
    );
  }

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-1/3" />
        <Skeleton className="mt-10 h-44 w-full rounded-modal" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-card" />
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-72 rounded-card" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const isSettled = doc.status === "settled" || doc.status === "executed";
  const owners: Record<Kind, string> = {
    stamping: doc.deal.clientName,
    registration: doc.deal.clientName,
    esignature: "Both signatories",
  };

  return (
    <div className="w-full">
      {/* The title and way back on the left, the record the sheet rests
          on and the way to print it on the right. */}
      <PageHeader
        stacked
        className="print:hidden"
        status={<StateLabel state={doc.status} />}
        back={{ fallbackHref: `/documents/${doc.id}` }}
        title={documentIdentity(doc.title).name}
        meta={[documentIdentity(doc.title).with]}
        tabs={<DocumentTabs documentId={doc.id} signedOff={Boolean(doc.signOff)} checklist={doc.checklist} />}
        actions={
          isSettled ? (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/documents/${doc.id}`}>
                  <Icon name="description" size={18} />
                  Settled document
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Icon name="print" size={18} />
                Print
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Print-only heading: the screen header above is hidden in print. */}
      <div className="hidden print:mb-6 print:block">
        <p role="heading" aria-level={1} className="font-display text-h1 text-ink">{doc.title}</p>
        <p className="text-body text-muted-fg">
          {doc.deal.clientName} and {doc.deal.counterpartyName} · Execution
          checklist · Generated {format(new Date(), "d MMM yyyy, HH:mm")}
        </p>
      </div>

      {!isSettled ? (
        <p className="mt-10 max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
          The execution checklist becomes available once this document is
          settled and signed off.
        </p>
      ) : (
        <>
          <ExecutionSummary doc={doc} owners={owners} />

          {/* The sheet takes the full width; the record and the context
              sit beneath it in three even columns, so neither side of the
              page runs out before the other. */}
          <div className="mt-6">
            <ExecutionChecklist
              steps={doc.executionSteps}
              owners={owners}
              onToggle={handleToggle}
              onAttach={handleAttach}
              busyKind={busyKind}
            />

            {doc.status === "executed" && (
              <p className="mt-6 inline-flex items-center gap-1.5 text-meta text-ink">
                <Tick state="done" size="sm" />
                Every step is complete. The document is recorded as executed.
              </p>
            )}
          </div>

          {/* The close of the page: what has been recorded, then the deal and the way
              back to the document. One divider above, space between. */}
          <div className="mt-4 space-y-4 print:hidden">
            <ActivityTimeline trail={trail} />
            <AgreementAndDocument doc={doc} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The sheet at a glance, before the sheet itself: how far it has got,
 * what is up next and whose it is, the sign-off it rests on, and the
 * proof already on file.
 */
function ExecutionSummary({
  doc,
  owners,
}: {
  doc: ClientDocument;
  owners: Record<Kind, string>;
}) {
  const applicable = doc.executionSteps.filter((s) => s.applicable);
  const done = applicable.filter((s) => s.complete).length;
  const next = nextStep(doc.executionSteps);
  const proof = doc.executionSteps.filter((s) => s.evidence);
  const left = applicable.length - done;

  return (
    <section
      aria-label="Execution at a glance"
      className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] print:hidden"
    >
      {/* How far, and what is next. */}
      <div className="rounded-card bg-surface p-6">
        <p className="mb-3 text-label font-medium text-muted-fg">Progress</p>
        <div className="flex items-baseline gap-3">
          <p className="font-display text-h2 tabular-nums text-ink">
            {done}
            <span className="text-muted-fg"> of {applicable.length}</span>
          </p>
          <p className="text-meta text-muted-fg">
            {left === 0
              ? "Every step is complete"
              : `${left} ${left === 1 ? "step" : "steps"} before it takes effect`}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={applicable.length}
          aria-valuenow={done}
          aria-label="Execution steps complete"
          className="mt-3 flex gap-1.5"
        >
          {applicable.map((step) => (
            <span key={step.kind} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className={`block h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none ${step.complete ? "w-full" : "w-0"}`}
              />
            </span>
          ))}
        </div>
        <p className="mt-3 text-meta text-ink">
          {next ? (
            <>
              <span className="text-muted-fg">Up next · </span>
              <span className="font-medium">{STEP_TITLE[next.kind]}</span>
              <span className="text-muted-fg"> · {owners[next.kind]}</span>
              <TextLink
                href={`#step-${next.kind}`}
                className="link ml-3 inline-flex min-h-6 items-center gap-1 text-meta font-medium"
              >
                Go to the step
                <Icon name="arrow_forward" size={16} />
              </TextLink>
            </>
          ) : (
            "Nothing is left. The document is recorded as executed."
          )}
        </p>
      </div>

      {/* The record already on file: secondary. */}
      <div className="rounded-card bg-surface p-6">
        <p className="mb-3 text-label font-medium text-muted-fg">Record</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 items-start gap-3 rounded-control bg-paper p-4">
            <span aria-hidden className="mt-0.5 shrink-0">
              <Tick state="done" size="sm" />
            </span>
            <div className="min-w-0">
              <dt className="text-label text-muted-fg">Signed off</dt>
              <dd className="mt-0.5">
                {doc.signOff ? (
                  <>
                    <span className="block truncate text-body font-medium text-ink">
                      {doc.signOff.advocate}
                    </span>
                    <span className="block text-label text-muted-fg">
                      <span className="font-mono">{doc.signOff.enrolment}</span>
                      {" · "}
                      {format(new Date(doc.signOff.at), "d MMM yyyy")}
                    </span>
                  </>
                ) : (
                  <span className="text-meta text-muted-fg">No sign-off is recorded.</span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-3 rounded-control bg-paper p-4">
            <Icon name="attach_file" size={20} className="mt-0.5 shrink-0 text-muted-fg" />
            <div className="min-w-0">
              <dt className="text-label text-muted-fg">Proof on file</dt>
              <dd className="mt-0.5">
                {proof.length > 0 ? (
                  <ul className="space-y-0.5">
                    {proof.map((step) => (
                      <li key={step.kind} className="truncate text-body font-medium text-ink">
                        {step.evidence?.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-meta text-muted-fg">Nothing attached yet.</span>
                )}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </section>
  );
}

/**
 * The whole record as one horizontal timeline, newest first, older to the
 * right. It is a native scroller (trackpad, swipe, arrow keys once it has
 * focus), with snap points so it rests on an event, and two buttons that move
 * it by two events. Every entry is in the page whether or not it is in view.
 *
 * A decision is a filled marker and an event a hollow one, and a decision says
 * so in words for a screen reader, so colour is never the only sign.
 */
function ActivityTimeline({ trail }: { trail: ClientAuditEntry[] }) {
  // Newest first by the time each entry carries, and by its place in the record where two share one.
  const entries = trail
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => new Date(b.entry.at).getTime() - new Date(a.entry.at).getTime() || b.index - a.index)
    .map(({ entry }) => entry);

  const scroller = useRef<HTMLOListElement>(null);
  const [view, setView] = useState({ first: 1, last: Math.min(4, entries.length), atStart: true, atEnd: true });

  // Which events are wholly in view, and whether there is more either way.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    let first = 0;
    let last = 0;
    Array.from(el.children).forEach((child, i) => {
      const item = child as HTMLElement;
      // An event counts as in view when its text column (not the line to the next) is.
      const start = item.offsetLeft;
      const end = start + item.offsetWidth - 24;
      if (start >= left - 4 && end <= right + 4) {
        if (first === 0) first = i + 1;
        last = i + 1;
      }
    });
    setView({
      first: first || 1,
      last: last || 1,
      atStart: left <= 2,
      atEnd: left + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, entries.length]);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    const item = el?.firstElementChild as HTMLElement | undefined;
    if (!el || !item) return;
    el.scrollBy({ left: direction * item.offsetWidth * 2, behavior: scrollBehavior() });
  }

  const n = entries.length;

  return (
    <section aria-labelledby="activity-heading" className="rounded-card bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="activity-heading" className="font-display text-h3 text-ink">
            Activity
          </h2>
          <p className="text-meta text-muted-fg">
            Agreement history · {n} {n === 1 ? "entry" : "entries"}
          </p>
        </div>
        {n > 1 && (
          <div className="flex items-center gap-2">
            <p className="text-meta tabular-nums text-muted-fg" aria-live="polite">
              {view.first === view.last ? view.first : `${view.first}–${view.last}`} of {n}
            </p>
            <button
              type="button"
              onClick={() => page(-1)}
              disabled={view.atStart}
              aria-label="Show newer activity"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:text-muted-fg/50"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <button
              type="button"
              onClick={() => page(1)}
              disabled={view.atEnd}
              aria-label="Show older activity"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:text-muted-fg/50"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        )}
      </div>

      {n === 0 ? (
        <p className="mt-3 text-meta text-muted-fg">Nothing has been recorded against this document yet.</p>
      ) : (
        <div className="@container mt-4">
          <p className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-label text-muted-fg">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-accent bg-accent" />
              Decision by the advocate
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-2 w-2 rounded-full border border-muted-fg bg-paper" />
              Event recorded
            </span>
          </p>
          <ol
            ref={scroller}
            tabIndex={0}
            aria-label="Agreement history, newest first"
            className="relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:scroll-auto"
          >
            {entries.map((entry, i) => {
              const decision = entry.kind === "decision";
              return (
                <li
                  key={`${entry.at}-${i}`}
                  className="relative w-[78%] shrink-0 snap-start pr-3 @xl:w-1/2 @3xl:w-1/3 @5xl:w-1/4"
                >
                  <div
                    className={cn(
                      "h-full rounded-control bg-paper p-4",
                      decision && "ring-1 ring-inset ring-accent/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={
                          decision
                            ? "h-2.5 w-2.5 shrink-0 rounded-full border border-accent bg-accent"
                            : "h-2 w-2 shrink-0 rounded-full border border-muted-fg bg-paper"
                        }
                      />
                      <time dateTime={entry.at} className="text-label tabular-nums text-muted-fg">
                        {format(new Date(entry.at), "d MMM yyyy · HH:mm")}
                      </time>
                    </div>
                    <p className="mt-2 text-body font-medium leading-snug text-ink">
                      {entry.action}
                      {decision && <span className="sr-only"> (decision by the advocate)</span>}
                    </p>
                    {entry.ref && <p className="mt-0.5 text-meta leading-snug text-muted-fg">{entry.ref}</p>}
                    <p className="mt-1 text-label text-muted-fg">{entry.actor}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

/**
 * The deal on file and the way into the settled text, in one sand surface: the
 * facts take the width, the two actions sit beside them. Facts are small
 * labels over plain values; the key terms are set apart as the client's own
 * words.
 */
function AgreementAndDocument({ doc }: { doc: ClientDocument }) {
  const [parties, ...facts] = dealRows(doc);
  const advocate = doc.signOff?.advocate ?? "the advocate";

  return (
    <div className="grid gap-4 rounded-card bg-surface p-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <section aria-labelledby="agreement-heading" className="@container min-w-0">
        <h2 id="agreement-heading" className="font-display text-h3 text-ink">
          The agreement
        </h2>
        <dl className="mt-3 grid gap-2">
          <div className="rounded-control bg-paper px-4 py-3">
            <dt className="text-label text-muted-fg">{parties[0]}</dt>
            <dd className="mt-0.5 font-display text-h3 text-ink">{parties[1]}</dd>
          </div>
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
            {facts.map(([term, value]) => (
              <div key={term} className="min-w-0 rounded-control bg-paper px-4 py-3">
                <dt className="text-label text-muted-fg">{term}</dt>
                <dd className="mt-0.5 text-body font-medium text-ink">{value}</dd>
              </div>
            ))}
          </div>
        </dl>
        {doc.deal.keyTerms && (
          <div className="mt-2 rounded-control bg-paper px-4 py-3">
            <p className="text-label text-muted-fg">Key terms, as you stated them</p>
            <p className="mt-0.5 text-body font-medium text-ink">{doc.deal.keyTerms}</p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="settled-heading"
        className="flex min-w-0 flex-col rounded-control bg-paper p-4"
      >
        <h2 id="settled-heading" className="font-display text-h3 text-ink">
          The settled document
        </h2>
        <p className="mt-1 text-meta text-muted-fg">
          The text {advocate} signed off. The assistant explains it; it never advises.
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row xl:flex-col">
          <Button asChild size="sm">
            <Link href={`/documents/${doc.id}`}>
              <Icon name="description" size={18} />
              Read the settled document
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/documents/${doc.id}/chat`}>
              <Icon name="send" size={18} />
              Ask about a clause
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
