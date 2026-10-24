"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
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
import { Assurances, StatusHero, StatusStrip } from "@/components/domain/status-hero";
import { CalmProvider } from "@/components/domain/calm";
import { tierLabel } from "@/lib/config/pricing";
import { PaymentPanel } from "@/components/domain/payment-panel";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { Tick } from "@/components/shared/tick";
import { PipelineProgress } from "@/components/domain/pipeline-progress";
import { UploadContractPanel } from "@/components/domain/upload-contract-panel";
import { backendDataEnabled } from "@/lib/api/source";
import { ClientReader } from "@/components/document/client-reader";
import { Provenance } from "@/components/document/provenance";
import { ChangeRequests } from "@/components/document/change-requests";
import { DocumentAgent } from "@/components/document/document-agent";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  getClientDocument,
  respondToClientRequests,
  startClientAnalysis,
} from "@/lib/api/client/documents";
import { getClientSettlementNotes } from "@/lib/api/client/settlement-notes";
import { getClientTrail } from "@/lib/api/client/trail";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ClientAuditEntry, ClientDocument, ClientSettlementNote } from "@/lib/types";
import { outstandingSteps } from "@/lib/moves";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentTabs } from "@/components/document/document-tabs";

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
      // Real backend: nothing starts by itself; the client uploads the contract and asks for the review.
      if (backendDataEnabled()) return;
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

  if (doc.status === "draft" && backendDataEnabled()) {
    return (
      <Frame>
        <UploadContractPanel docId={doc.id} onReviewRequested={setDoc} />
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
        <PageHeader
          back={{ fallbackHref: "/documents", label: "Documents" }}
          title={doc.title}
          meta={[doc.deal.counterpartyName]}
          tabs={<DocumentTabs documentId={doc.id} signedOff={Boolean(doc.signOff)} />}
        />

        <StatusHero doc={doc} />

        <div className="mt-5 grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)]">
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
              collapsible
              footer={
                <div className="mt-4 rounded-control bg-surface px-4 py-3">
                  <h3 className="text-meta font-medium text-ink">What you receive at the end</h3>
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
      <CalmProvider>
        <PageHeader
          back={{ fallbackHref: "/documents", label: "Documents" }}
          title={doc.title}
          meta={[
            doc.deal.counterpartyName,
            `Draft ${doc.version}`,
            `Submitted ${format(new Date(doc.createdAt), "d MMM yyyy")}`,
            `${tierLabel(doc.tier)} review`,
          ]}
          tabs={<DocumentTabs documentId={doc.id} signedOff={Boolean(doc.signOff)} />}
        />

        {/* The state, who has the move and what comes next lead the page. */}
        <StatusStrip doc={doc} />

        {/* The move in hand on the left; the record on the right, one column
            with rules between its parts. Narrows below 1100px, stacks below 768px. */}
        <div className="mt-5 grid pb-8 gap-x-10 gap-y-7 md:grid-cols-[minmax(0,1fr)_272px] min-[1100px]:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
          <div className="space-y-7">
            {doc.status === "revision" ? (
              <ChangeRequests doc={doc} onSubmit={handleRespond} submitting={submitting} />
            ) : (
              <>
                <Assurances />
                <WithAdvocate doc={doc} />
              </>
            )}
            <div className="rounded-card border border-line bg-surface p-6 md:p-8">
              <WhatHappensNext doc={doc} wide />
            </div>
            <CoveragePanel doc={doc} collapsible />
          </div>

          <aside className="self-start rounded-card bg-sand p-6">
            <AdvocatePanel doc={doc} />
            <ContextPanel title="Where it is">
              <Provenance doc={doc} />
            </ContextPanel>
            <ContextPanel title="Activity" collapsible hint="What has happened">
              <AuditTrail entries={trail} title={null} />
            </ContextPanel>
            <OnYourDesk currentId={doc.id} />
            <DealOnFile doc={doc} collapsible />
          </aside>
        </div>
      </CalmProvider>
    </Frame>
  );
}

/**
 * The shell hands this route over whole, because the settled workspace
 * scrolls its own panes. Every other state is an ordinary page, so it
 * brings its own gutter and scroll.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-6 md:absolute md:inset-0 md:overflow-y-auto md:px-8 md:py-8">
      <div className="w-full">{children}</div>
    </div>
  );
}

/** Pending or under review: where it is, and why the draft is not shown. */
function WithAdvocate({ doc }: { doc: ClientDocument }) {
  const answered = doc.findingList.filter((f) => f.request?.response);

  return (
    <div className="space-y-5">
      {answered.length > 0 && (
        <section>
          <h2 className="font-display text-h3 text-ink">Your responses</h2>
          <ul className="mt-3 space-y-4">
            {answered.map((f) => (
              <li key={f.number} className="rounded-modal border border-line bg-surface p-6 md:p-8">
                <p className="text-meta text-muted">
                  <span className="font-mono">{f.clauseReference}</span>
                  {f.request?.respondedAt && (
                    <> · {format(new Date(f.request.respondedAt), "d MMM yyyy")}</>
                  )}
                </p>
                <div className="mt-4 flex gap-4 rounded-card bg-move-tint p-5">
                  <Icon name="rate_review" size={24} className="mt-0.5 text-move-text" />
                  <div className="min-w-0">
                    <p className="text-label font-medium text-move-text">Your advocate asked</p>
                    <p className="mt-1 text-body leading-[1.6] text-ink">{f.request?.request}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-card bg-sand px-5 py-4">
                  <p className="text-label font-medium text-muted">Your answer</p>
                  <p className="mt-1 text-body text-ink">{f.request?.response}</p>
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
  const stepsLeft = outstandingSteps(doc);

  return (
    <ClientReader
      doc={doc}
      trail={trail}
      settlementNotes={notes}
      back={{ href: "/documents", label: "Documents" }}
      aside={
        <>
          {doc.signOff && (
            <span className="inline-flex items-center gap-1 text-label text-done-text">
              <Tick state="done" size="sm" />
              Signed off by {doc.signOff.advocate} ·{" "}
              {format(new Date(doc.signOff.at), "d MMM yyyy")}
            </span>
          )}
        </>
      }
      tabs={<DocumentTabs documentId={doc.id} signedOff={Boolean(doc.signOff)} checklist={doc.checklist} />}
      companion={({ goToClause }) => <DocumentAgent doc={doc} onCite={goToClause} />}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Icon name="print" size={18} />
            Print
          </Button>
          {/* The one primary action on a settled document: the next thing to do. */}
          {stepsLeft > 0 && (
            <Button asChild size="sm">
              <Link href={`/documents/${doc.id}/checklist`}>
                Execution checklist · {stepsLeft} {stepsLeft === 1 ? "step" : "steps"} left
                <Icon name="arrow_forward" size={18} />
              </Link>
            </Button>
          )}
        </>
      }
    />
  );
}
