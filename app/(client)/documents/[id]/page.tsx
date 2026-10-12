"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BackButton } from "@/components/shared/back-button";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { AuditTrail } from "@/components/document/audit-trail";
import {
  AdvocatePanel,
  ContextPanel,
  DealOnFile,
  OnYourDesk,
  WhatHappensNext,
} from "@/components/domain/document-context";
import { CoveragePanel } from "@/components/domain/coverage-panel";
import { DraftBanner } from "@/components/domain/draft-banner";
import { PaymentPanel } from "@/components/domain/payment-panel";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { PipelineProgress } from "@/components/domain/pipeline-progress";
import { ClientReader } from "@/components/document/client-reader";
import { Provenance } from "@/components/document/provenance";
import { ChangeRequests } from "@/components/document/change-requests";
import { DocumentAgent } from "@/components/document/document-agent";
import { StateLabel } from "@/components/document/state-label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  getClientDocument,
  respondToClientRequests,
  startClientAnalysis,
} from "@/lib/api/client/documents";
import { getClientSettlementNotes } from "@/lib/api/client/settlement-notes";
import { getClientTrail } from "@/lib/api/client/trail";
import { tierLabel } from "@/lib/config/pricing";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ClientAuditEntry, ClientDocument, ClientSettlementNote } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

const ORG = MOCK_CLIENT_ORG.id;

/**
 * One document, as the client meets it.
 *
 * No document reaches a client without a recorded advocate sign-off, so
 * what this page shows depends on where the document is. While the first
 * pass runs, its progress. While an advocate has it, where it is, but not the
 * draft and not who holds it. When the advocate needs something, exactly
 * what, on which clause. Once signed off, the settled document itself.
 *
 * Everything here is read from what a client is handed (a ClientDocument and
 * the client's own trail), and the answers go back keyed by the number the
 * client reads each finding by. Nothing on this page can show an advocate's
 * name before sign-off, because the type it holds has no name to show.
 */
export default function DocumentPage() {
  // Read from the router, not a prop: in Next 15 the page's params prop is a
  // Promise, and this is a client component.
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ClientDocument | null>(null);
  const [trail, setTrail] = useState<ClientAuditEntry[]>([]);
  const [notes, setNotes] = useState<ClientSettlementNote[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);

  /** The document and its trail, read together so they never disagree. */
  const read = useCallback(async () => {
    const [result, entries, released] = await Promise.all([
      getClientDocument(ORG, params.id),
      getClientTrail(ORG, params.id),
      // Empty before the recorded sign-off, whatever the advocate has written.
      getClientSettlementNotes(ORG, params.id),
    ]);
    if (!result || !entries) throw new Error("Document not found.");
    setDoc(result);
    setTrail(entries);
    setNotes(released);
  }, [params.id]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      await read();
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this document.",
      );
      setState("error");
    }
  }, [read]);

  useEffect(() => {
    load();
  }, [load]);

  const failWith = useCallback((err: unknown) => {
    setErrorMessage(
      err instanceof Error ? err.message : "Could not load this document.",
    );
    setState("error");
  }, []);

  // Keyed on the document's id and status, not the document itself: every
  // poll returns a fresh object, and keying on that tore the interval down
  // after its first tick. The interval now lives until the status leaves
  // "analysing", the load state leaves "loaded" (an error), or the page
  // unmounts.
  const docId = doc?.id;
  const docStatus = doc?.status;
  useEffect(() => {
    if (!docId || state !== "loaded") return;

    if (docStatus === "draft") {
      startClientAnalysis(ORG, docId).then(setDoc).catch(failWith);
      return;
    }

    // Analysis completion is tracked in the data layer against a stored
    // analysisCompletesAt, so it resolves whether or not this page stays
    // mounted. Polling here only picks up that change.
    if (docStatus === "analysing") {
      const interval = setInterval(() => {
        read().catch((err) => {
          clearInterval(interval);
          failWith(err);
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [docId, docStatus, state, failWith, read]);

  async function handleRespond(responses: Record<string, string>) {
    // A second press while the first is in flight is dropped: no request, no toast.
    // State would not do it: two presses in one tick both see `submitting` as false.
    // The API refuses a repeat as well, and that is the guard; this only keeps the screen quiet.
    if (!doc || sending.current) return;
    sending.current = true;
    setSubmitting(true);
    try {
      const updated = await respondToClientRequests(ORG, doc.id, responses);
      setDoc(updated);
      setTrail((await getClientTrail(ORG, doc.id)) ?? trail);
      toast.success("Sent to the advocate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your responses.");
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <Frame>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-9 w-2/3 max-w-lg" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Frame>
    );
  }

  if (state === "error" || !doc) {
    return (
      <Frame>
        <ErrorState message={errorMessage} onRetry={load} />
      </Frame>
    );
  }

  if (doc.status === "analysing" || doc.status === "draft") {
    return (
      <Frame>
        <PipelineProgress />
      </Frame>
    );
  }

  if (doc.signOff && (doc.status === "settled" || doc.status === "executed")) {
    return <SettledDocument doc={doc} trail={trail} notes={notes} />;
  }

  // Screened and tiered, not yet paid. Only the tier, the fee and the deal
  // facts behind it are shown: nothing from the review, because a client
  // reads no finding before sign-off.
  if (doc.status === "awaiting_payment") {
    return (
      <Frame>
        <header className="flex min-w-0 items-start gap-4">
          <BackButton fallbackHref="/documents" label="Back" />
          <div className="min-w-0">
            <StateLabel state={doc.status} />
            <h1 className="mt-2 font-display text-h1 text-ink">{doc.title}</h1>
            <p className="mt-1 text-meta text-muted-fg">{doc.deal.counterpartyName}</p>
          </div>
        </header>

        <div className="mt-10 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
          <PaymentPanel
            doc={doc}
            onPaid={(paid) => {
              setDoc(paid);
              getClientTrail(ORG, paid.id).then((entries) => entries && setTrail(entries));
              toast.success("Fee paid. Your document is in the advocate queue.");
            }}
          />
          <ContextPanel title="Where it is" compact>
            <Provenance doc={doc} />
          </ContextPanel>
          <div className="min-w-0 lg:col-span-2">
            <WhatHappensNext
              doc={doc}
              wide
              compact
              footer={
                <div className="mt-4 rounded-control bg-paper px-4 py-3">
                  <h3 className="text-label font-medium text-muted-fg">What you receive at the end</h3>
                  <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-meta leading-[1.45] text-muted-fg md:grid-cols-2">
                    <li>The settled document, with your advocate&apos;s sign-off recorded on it.</li>
                    <li>A summary that explains the settled clauses in plain words.</li>
                    <li>An execution checklist: stamping, registration and e-signature validity.</li>
                    <li>The version history, with your advocate&apos;s dispositions, read-only.</li>
                  </ul>
                </div>
              }
            />
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      {/* Full width: who and what on the left, the terms of the review
          on the right, the way the settled workspace sets its header. */}
      <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4">
        <div className="flex min-w-0 items-start gap-4">
          <BackButton fallbackHref="/documents" label="Back" />
          <div className="min-w-0">
            <StateLabel state={doc.status} />
            {/* The one display moment on this screen. */}
            <h1 className="mt-1.5 font-display text-h1 text-ink">{doc.title}</h1>
            <p className="mt-1 text-meta text-muted-fg">
              {doc.deal.counterpartyName}
              <span className="mx-1.5 text-muted-fg/50">·</span>
              Draft {doc.version}
              <span className="mx-1.5 text-muted-fg/50">·</span>
              <Link
                href={`/documents/${doc.id}/history`}
                className="text-ink underline underline-offset-2 hover:no-underline"
              >
                Version history
              </Link>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-meta sm:pt-9 sm:text-right">
          <dt className="text-muted-fg">Review</dt>
          <dd className="text-ink">{tierLabel(doc.tier)}</dd>
          <dt className="text-muted-fg">Submitted</dt>
          <dd className="text-ink">{format(new Date(doc.createdAt), "d MMM yyyy")}</dd>
        </dl>
      </header>

      {/* Everything on this view is before sign-off, so say so up front. */}
      <DraftBanner className="mt-4" />

      {/* With an advocate, the summary and the client's responses lead at the
          full width of the page; the record and the rest sit below it. */}
      {doc.status !== "revision" && (
        <div className="mt-5">
          <WithAdvocate doc={doc} />
        </div>
      )}

      {/* The move in hand and everything that explains it on the left;
          the record the document carries on the right. */}
      <div className="mt-5 grid items-start gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="min-w-0">
          {doc.status === "revision" && (
            <>
              <MoveSummary doc={doc} />
              <div className="mt-4">
                <ChangeRequests doc={doc} onSubmit={handleRespond} submitting={submitting} />
              </div>
            </>
          )}

          <div className={cn("space-y-4", doc.status === "revision" && "mt-5")}>
            <WhatHappensNext doc={doc} wide compact />
            <DealOnFile doc={doc} compact />
            <CoveragePanel doc={doc} />
          </div>
        </div>

        {/* Plain flow: the record is taller than the screen, so holding it
            in place would add a second scroll inside the page's own. */}
        <aside className="min-w-0 space-y-4">
          <ContextPanel title="Where it is">
            <Provenance doc={doc} />
          </ContextPanel>
          <AdvocatePanel doc={doc} />
          <ContextPanel title="Activity">
            <AuditTrail entries={trail} title={null} />
          </ContextPanel>
          <OnYourDesk currentId={doc.id} />
        </aside>
      </div>
    </Frame>
  );
}

/**
 * The move, stated once in a sentence and then in one line of facts: how
 * many requests are open, how long they have waited, and what the document
 * becomes once they are answered.
 */
function MoveSummary({ doc }: { doc: ClientDocument }) {
  const open = doc.findingList.filter((f) => f.request && !f.request.response);
  const asked = open
    .map((f) => f.request?.requestedAt)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  const waiting = asked ? formatDistanceToNowStrict(new Date(asked)) : "today";

  return (
    <section className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2">
      <p className="max-w-2xl text-lead text-muted-fg">
        Your advocate asked for your answer before this document can be settled. The
        rest of the review continues in the meantime.
      </p>
      <p className="text-meta text-muted-fg">
        {open.length} {open.length === 1 ? "request" : "requests"} open
        <span aria-hidden className="mx-1.5">·</span>
        Waiting {waiting}
        <span aria-hidden className="mx-1.5">·</span>
        Then Draft {doc.version + 1}, then sign-off
      </p>
    </section>
  );
}

/**
 * The shell hands this route over whole, because the settled workspace
 * scrolls its own panes. Every other state is an ordinary page, so it
 * brings its own gutter and scroll.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-6">
      <div className="w-full">{children}</div>
    </div>
  );
}

/** Pending or under review: where it is, and why the draft is not shown. */
function WithAdvocate({ doc }: { doc: ClientDocument }) {
  const answered = doc.findingList.filter((f) => f.request?.response);

  return (
    <div className="space-y-5">
      <p className="max-w-measure text-lead text-ink">
        {doc.status === "pending_review"
          ? "The first pass has drafted and screened this document. It is in the advocate queue, and an empanelled advocate will claim it for review."
          : "An advocate is reviewing the findings the first pass raised."}{" "}
        You will read the document once it is settled and signed off. Nothing
        reaches you before an advocate has recorded a sign-off.
      </p>

      {answered.length > 0 && (
        <section>
          <h2 className="text-label font-medium text-muted-fg">Your responses</h2>
          <ul className="mt-3 space-y-2">
            {answered.map((f) => (
              <li key={f.number} className="rounded-card bg-parchment p-4">
                <p className="text-label text-muted-fg">
                  <span className="font-mono">{f.clauseReference}</span>
                  {f.request?.respondedAt && (
                    <> · {format(new Date(f.request.respondedAt), "d MMM yyyy")}</>
                  )}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-label font-medium text-muted-fg">Your advocate asked</p>
                    <p className="mt-1 text-meta text-ink">{f.request?.request}</p>
                  </div>
                  <div className="min-w-0 rounded-control bg-paper px-4 py-3">
                    <p className="text-label font-medium text-muted-fg">Your answer</p>
                    <p className="mt-1 text-meta text-ink">{f.request?.response}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Signed off: the settled document itself, read only. */
function SettledDocument({
  doc,
  trail,
  notes,
}: {
  doc: ClientDocument;
  trail: ClientAuditEntry[];
  notes: ClientSettlementNote[];
}) {
  const { done, total } = doc.checklist;

  return (
    <ClientReader
      doc={doc}
      trail={trail}
      settlementNotes={notes}
      back={{ href: "/documents", label: "Documents" }}
      aside={
        <>
          {doc.signOff && (
            <span className="inline-flex items-center gap-1 text-label text-verified">
              <Icon name="check_circle" size={16} />
              Signed off by {doc.signOff.advocate} ·{" "}
              {format(new Date(doc.signOff.at), "d MMM yyyy")}
            </span>
          )}
          <Link
            href={`/documents/${doc.id}/delivery`}
            className="text-label text-ink underline-offset-2 hover:underline"
          >
            Delivery
          </Link>
          <Link
            href={`/documents/${doc.id}/checklist`}
            className="text-label text-ink underline-offset-2 hover:underline"
          >
            Execution checklist · {done} of {total}
          </Link>
          <Link
            href={`/documents/${doc.id}/summary`}
            className="text-label text-ink underline-offset-2 hover:underline"
          >
            Summary
          </Link>
          <Link
            href={`/documents/${doc.id}/history`}
            className="text-label text-ink underline-offset-2 hover:underline"
          >
            Version history
          </Link>
          {doc.signOff && (
            <Link
              href={`/documents/${doc.id}/consultation`}
              className="text-label text-ink underline-offset-2 hover:underline"
            >
              Consultation
            </Link>
          )}
        </>
      }
      companion={({ goToClause }) => <DocumentAgent doc={doc} onCite={goToClause} />}
      actions={
        <>
          <Button variant="outline" onClick={() => window.print()}>
            <Icon name="print" size={18} />
            Print this page (browser)
          </Button>
        </>
      }
    />
  );
}
