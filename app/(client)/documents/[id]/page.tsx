"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/domain/status-badge";
import { DocumentStatusTrail } from "@/components/domain/document-status-trail";
import { PipelineProgress } from "@/components/domain/pipeline-progress";
import { FindingCard } from "@/components/domain/finding-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getDocument, startAnalysis } from "@/lib/api/documents";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function DocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
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

    // QA 4.5: analysis completion is now tracked server-side (see
    // reconcileAnalysis in lib/api/documents.ts) via a stored
    // analysisCompletesAt timestamp, so it resolves whether or not this
    // component stays mounted. Polling here just picks up that change —
    // it is not what makes the state durable.
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

  if (state === "loading") {
    return (
      <div>
        <Skeleton className="mb-4 h-10 w-2/3 rounded-card" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  if (doc.status === "analysing") {
    return (
      <div className="py-10">
        <PipelineProgress />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={doc.title}
        description={`${doc.clientName} vs ${doc.counterpartyName}`}
        action={<StatusBadge status={doc.status} />}
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <div className="mb-6 rounded-card border border-line bg-paper p-4 shadow-card">
        <DocumentStatusTrail status={doc.status} />
      </div>

      {/* QA 3.3: duration, governing law and key terms used to be
          collected by the intake wizard and silently discarded — never
          persisted, never shown anywhere on the resulting document. */}
      <div className="mb-6 rounded-card border border-line bg-paper p-4 shadow-card">
        <p className="mb-3 text-small font-medium text-muted-fg">
          Deal brief
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-small text-muted-fg">Duration</dt>
            <dd className="text-body text-ink">
              {doc.durationMonths > 0
                ? `${doc.durationMonths} months`
                : "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-small text-muted-fg">Governing law</dt>
            <dd className="text-body text-ink">
              {doc.governingLaw || "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="text-small text-muted-fg">Key terms</dt>
            <dd className="text-body text-ink">
              {doc.keyTerms ?? "Not specified"}
            </dd>
          </div>
        </dl>
      </div>

      {doc.status === "settled" && (
        <div className="mb-6 flex items-center justify-between rounded-card border border-verified/30 bg-verified/10 p-4">
          <p className="text-body text-ink">
            Settled by {doc.advocate?.name} on{" "}
            {doc.settledAt && format(new Date(doc.settledAt), "d MMM yyyy")}.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/documents/${doc.id}/checklist`}>
              View execution checklist
            </Link>
          </Button>
        </div>
      )}

      {doc.findings.length === 0 ? (
        <div className="rounded-card border border-line bg-paper p-6 text-body text-muted-fg shadow-card">
          {doc.status === "draft"
            ? "Starting the pipeline…"
            : "No findings on this document — the full settled text is available on the execution checklist page, which you can print or save as a PDF."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          <nav className="space-y-1">
            <p className="mb-2 text-small font-medium text-muted-fg">
              Clause outline
            </p>
            {doc.findings.map((f) => (
              <a
                key={f.findingId}
                href={`#${f.findingId}`}
                className="block rounded-control px-2 py-1.5 text-small text-ink hover:bg-canvas"
              >
                {f.clauseReference}
              </a>
            ))}
          </nav>
          <div className="space-y-4">
            {doc.findings.map((f) => (
              <div key={f.findingId} id={f.findingId}>
                <FindingCard finding={f} mode="read-only" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
