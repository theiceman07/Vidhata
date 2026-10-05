"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { BackButton } from "@/components/shared/back-button";
import { ErrorState } from "@/components/shared/error-state";
import { AuditTrail } from "@/components/document/audit-trail";
import {
  ExecutionChecklist,
  STEP_TITLE,
  nextStep,
} from "@/components/domain/execution-checklist";
import {
  ContextPanel,
  DealOnFile,
  OnYourDesk,
} from "@/components/domain/document-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  attachClientEvidence,
  getClientDocument,
  toggleClientStep,
} from "@/lib/api/client/documents";
import { getClientTrail } from "@/lib/api/client/trail";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ClientAuditEntry, ClientDocument, ExecutionStep } from "@/lib/types";

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

  async function save(kind: Kind, action: () => Promise<ClientDocument>, failure: string) {
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
    save(kind, () => toggleClientStep(ORG, doc.id, kind, complete), "Could not update the checklist.");
  }

  function handleAttach(kind: Kind, fileName: string | null) {
    if (!doc) return;
    save(kind, () => attachClientEvidence(ORG, doc.id, kind, fileName), "Could not attach this file.");
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
      <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6 print:hidden">
        <div className="flex min-w-0 items-start gap-4">
          <BackButton fallbackHref={`/documents/${doc.id}`} label="Back" />
          <div className="min-w-0">
            <p className="truncate text-meta text-muted-fg">{doc.title}</p>
            <h1 className="mt-1 font-display text-h1 text-ink">Execution checklist</h1>
            <p className="mt-2 text-body text-muted-fg">
              What remains before the settled document takes effect.
            </p>
          </div>
        </div>

        {isSettled && (
          <div className="flex flex-wrap items-center gap-3 sm:pt-7">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/documents/${doc.id}`}>
                <Icon name="description" size={18} />
                Settled document
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Icon name="print" size={18} />
              Print this page (browser)
            </Button>
          </div>
        )}
      </header>

      {/* Print-only heading: the screen header above is hidden in print. */}
      <div className="hidden print:mb-6 print:block">
        <h1 className="font-display text-h1 text-ink">{doc.title}</h1>
        <p className="text-body text-muted-fg">
          {doc.deal.clientName} and {doc.deal.counterpartyName} · Execution checklist ·
          Generated {format(new Date(), "d MMM yyyy, HH:mm")}
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
          <div className="mt-8">
            <ExecutionChecklist
              steps={doc.executionSteps}
              owners={owners}
              onToggle={handleToggle}
              onAttach={handleAttach}
              busyKind={busyKind}
            />

            {doc.status === "executed" && (
              <p className="mt-6 inline-flex items-center gap-1.5 text-meta text-verified">
                <Icon name="check_circle" size={18} />
                Every step is complete. The document is recorded as executed.
              </p>
            )}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:hidden">
            <ContextPanel title="Activity" className="md:col-span-2 xl:col-span-1">
              <AuditTrail entries={trail} title={null} />
            </ContextPanel>
            <DealOnFile doc={doc} />
            <div className="flex min-w-0 flex-col gap-4">
              <ContextPanel title="The settled document">
                <p className="text-meta text-ink">
                  Read the text {doc.signOff?.advocate ?? "the advocate"} signed
                  off, and ask its agent what any clause means.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="group flex items-center gap-3 rounded-control bg-paper px-4 py-3 text-meta text-ink transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Icon name="description" size={18} className="text-muted-fg" />
                    <span className="flex-1">Read the settled document</span>
                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="text-muted-fg transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                  <Link
                    href={`/documents/${doc.id}/chat`}
                    className="group flex items-center gap-3 rounded-control bg-paper px-4 py-3 text-meta text-ink transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Icon name="send" size={18} className="text-muted-fg" />
                    <span className="flex-1">Ask about a clause</span>
                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="text-muted-fg transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </div>
              </ContextPanel>
              <OnYourDesk currentId={doc.id} className="flex-1" />
            </div>
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
      className="tile-grain mt-10 grid gap-3 rounded-modal bg-parchment p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] print:hidden"
    >
      {/* How far. */}
      <div className="flex flex-col justify-between gap-6 rounded-card bg-paper p-6">
        <p className="text-label font-medium text-muted-fg">Execution</p>
        <div>
          <p className="font-display text-h1 tabular-nums text-ink">
            {done}
            <span className="text-muted-fg"> of {applicable.length}</span>
          </p>
          <p className="mt-1 text-meta text-muted-fg">
            {left === 0
              ? "Every step is complete"
              : `${left} ${left === 1 ? "step" : "steps"} before it takes effect`}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={applicable.length}
            aria-valuenow={done}
            aria-label="Execution steps complete"
            className="mt-4 flex gap-1.5"
          >
            {applicable.map((step) => (
              <span
                key={step.kind}
                className="h-2 flex-1 overflow-hidden rounded-full bg-parchment"
              >
                <span
                  className={`block h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none ${step.complete ? "w-full" : "w-0"}`}
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Up next. */}
      <div className="flex flex-col justify-between gap-6 rounded-card bg-paper p-6">
        <p className="text-label font-medium text-muted-fg">Up next</p>
        {next ? (
          <div>
            <p className="font-display text-h3 text-ink">{STEP_TITLE[next.kind]}</p>
            <p className="mt-1 text-meta text-muted-fg">Owner · {owners[next.kind]}</p>
            <a
              href={`#step-${next.kind}`}
              className="mt-4 inline-flex items-center gap-1 text-meta font-medium text-ink underline-offset-2 hover:underline"
            >
              Go to the step
              <Icon name="arrow_forward" size={18} />
            </a>
          </div>
        ) : (
          <p className="text-meta text-ink">
            Nothing is left. The document is recorded as executed.
          </p>
        )}
      </div>

      {/* The sign-off the sheet rests on: a decision, so it carries the accent. */}
      <div className="flex flex-col justify-between gap-6 rounded-card bg-paper p-6">
        <p className="text-label font-medium text-muted-fg">Signed off</p>
        {doc.signOff ? (
          <div>
            <p className="inline-flex items-center gap-1.5 font-display text-h3 text-ink">
              <Icon name="check_circle" size={20} className="text-accent" />
              {doc.signOff.advocate}
            </p>
            <p className="mt-1 text-meta text-muted-fg">
              <span className="font-mono">{doc.signOff.enrolment}</span>
              {" · "}
              {format(new Date(doc.signOff.at), "d MMM yyyy")}
            </p>
          </div>
        ) : (
          <p className="text-meta text-muted-fg">No sign-off is recorded.</p>
        )}
      </div>

      {/* Proof on file. */}
      <div className="flex flex-col justify-between gap-6 rounded-card bg-paper p-6">
        <p className="text-label font-medium text-muted-fg">Proof on file</p>
        {proof.length > 0 ? (
          <ul className="space-y-1.5">
            {proof.map((step) => (
              <li key={step.kind} className="flex min-w-0 items-center gap-2 text-meta text-ink">
                <Icon name="attach_file" size={16} className="text-muted-fg" />
                <span className="truncate">{step.evidence?.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-meta text-muted-fg">
            Nothing attached yet. Proof you attach stays with this document.
          </p>
        )}
      </div>
    </section>
  );
}
