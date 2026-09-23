"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/shared/back-button";
import { format } from "date-fns";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { PipelineProgress } from "@/components/domain/pipeline-progress";
import { DocumentWorkspace } from "@/components/document/workspace";
import { Provenance } from "@/components/document/provenance";
import { ChangeRequests } from "@/components/document/change-requests";
import { DocumentAgent } from "@/components/document/document-agent";
import { StateLabel } from "@/components/document/state-label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getDocument, respondToChanges, startAnalysis } from "@/lib/api/documents";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * One document, as the client meets it.
 *
 * No document reaches a client without a recorded advocate sign-off, so
 * what this page shows depends on where the document is. While the first
 * pass runs, its progress. While an advocate has it, where it is and who
 * holds it, but not the draft. When the advocate needs something, exactly
 * what, on which clause. Once signed off, the settled document itself.
 */
export default function DocumentPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const kickedOffForStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await getDocument(params.id);
      if (!result) throw new Error("Document not found.");
      setDoc(result);
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

  useEffect(() => {
    if (!doc || kickedOffForStatus.current === doc.status) return;

    if (doc.status === "draft") {
      kickedOffForStatus.current = "draft";
      startAnalysis(doc.id).then(setDoc);
      return;
    }

    // Analysis completion is tracked in the data layer against a stored
    // analysisCompletesAt, so it resolves whether or not this page stays
    // mounted. Polling here only picks up that change.
    if (doc.status === "analysing") {
      kickedOffForStatus.current = "analysing";
      const interval = setInterval(() => {
        getDocument(doc.id).then((result) => {
          if (result) setDoc(result);
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [doc]);

  async function handleRespond(responses: Record<string, string>) {
    if (!doc) return;
    setSubmitting(true);
    try {
      const updated = await respondToChanges(doc.id, responses);
      setDoc(updated);
      toast.success("Sent to the advocate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your responses.");
    } finally {
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

  if (doc.status === "settled" || doc.status === "executed") {
    return <SettledDocument doc={doc} />;
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
            <h1 className="mt-2 font-display text-h1 text-ink">{doc.title}</h1>
            <p className="mt-1 text-meta text-muted-fg">
              {doc.counterpartyName}
              <span className="mx-1.5 text-muted-fg/50">·</span>
              Draft {doc.version}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-meta sm:pt-9 sm:text-right">
          <dt className="text-muted-fg">Review</dt>
          <dd className="capitalize text-ink">{doc.tier}</dd>
          <dt className="text-muted-fg">Submitted</dt>
          <dd className="text-ink">{format(new Date(doc.createdAt), "d MMM yyyy")}</dd>
        </dl>
      </header>

      <div className="mt-10 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          {doc.status === "revision" ? (
            <>
              <p className="max-w-3xl text-lead text-ink">
                {doc.advocate?.name ?? "Your advocate"} needs your answer
                before this document can be settled. The rest of the review
                continues in the meantime.
              </p>
              <div className="mt-6">
                <ChangeRequests doc={doc} onSubmit={handleRespond} submitting={submitting} />
              </div>
            </>
          ) : (
            <WithAdvocate doc={doc} />
          )}
        </div>

        <aside className="self-start rounded-card bg-parchment p-6 lg:sticky lg:top-0">
          <h2 className="mb-4 text-label font-medium text-muted-fg">Where it is</h2>
          <Provenance doc={doc} />
        </aside>
      </div>
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
    <div className="h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="w-full">{children}</div>
    </div>
  );
}

/** Pending or under review: where it is, and why the draft is not shown. */
function WithAdvocate({ doc }: { doc: ContractDocument }) {
  const answered = doc.findings.filter((f) => f.changeRequest?.response);

  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-body text-ink">
        {doc.status === "pending_review"
          ? "The first pass has drafted and screened this document. It is in the advocate queue, and an empanelled advocate will claim it for review."
          : `${doc.advocate?.name ?? "An advocate"} is reviewing the findings the first pass raised.`}{" "}
        You will read the document once it is settled and signed off. Nothing
        reaches you before an advocate has recorded a sign-off.
      </p>

      {answered.length > 0 && (
        <section>
          <h2 className="text-label font-medium text-muted-fg">Your responses</h2>
          <ul className="mt-3 space-y-2">
            {answered.map((f) => (
              <li key={f.findingId} className="rounded-control bg-parchment px-4 py-3">
                <p className="text-label text-muted-fg">
                  <span className="font-mono">{f.clauseReference}</span>
                  {f.changeRequest?.respondedAt && (
                    <> · {format(new Date(f.changeRequest.respondedAt), "d MMM yyyy")}</>
                  )}
                </p>
                <p className="mt-0.5 text-meta text-muted-fg">{f.changeRequest?.request}</p>
                <p className="mt-1 text-meta text-ink">{f.changeRequest?.response}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-card bg-parchment p-6 text-meta">
        <dt className="text-muted-fg">Parties</dt>
        <dd className="text-ink">
          {doc.clientName} · {doc.counterpartyName}
        </dd>
        <dt className="text-muted-fg">Executed in</dt>
        <dd className="text-ink">{doc.stateOfExecution}</dd>
        <dt className="text-muted-fg">Governing law</dt>
        <dd className="text-ink">{doc.governingLaw}</dd>
      </dl>
    </div>
  );
}

/** Signed off: the settled document itself, read only. */
function SettledDocument({ doc }: { doc: ContractDocument }) {
  const steps = doc.executionSteps.filter((s) => s.applicable);
  const done = steps.filter((s) => s.complete).length;

  return (
    <DocumentWorkspace
      doc={doc}
      role="client"
      back={{ href: "/documents", label: "Documents" }}
      aside={
        <>
          {doc.settledAt && doc.advocate && (
            <span className="inline-flex items-center gap-1 text-label text-verified">
              <Icon name="check_circle" size={16} />
              Signed off by {doc.advocate.name} ·{" "}
              {format(new Date(doc.settledAt), "d MMM yyyy")}
            </span>
          )}
          <Link
            href={`/documents/${doc.id}/checklist`}
            className="text-label text-ink underline-offset-2 hover:underline"
          >
            Execution checklist · {done} of {steps.length}
          </Link>
        </>
      }
      companion={({ goToClause }) => <DocumentAgent doc={doc} onCite={goToClause} />}
      actions={
        <>
          <Button variant="outline" onClick={() => window.print()}>
            <Icon name="print" size={18} />
            Save as PDF
          </Button>
        </>
      }
    />
  );
}
