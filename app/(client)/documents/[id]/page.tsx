"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/domain/status-badge";
import { DocumentStatusTrail } from "@/components/domain/document-status-trail";
import { PipelineProgress, PIPELINE_DURATION_MS } from "@/components/domain/pipeline-progress";
import { FindingCard } from "@/components/domain/finding-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  getDocument,
  startAnalysis,
  completeAnalysis,
} from "@/lib/api/documents";
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

    if (doc.status === "analysing") {
      kickedOffForStatus.current = "analysing";
      const timer = setTimeout(() => {
        completeAnalysis(doc.id).then(setDoc);
      }, PIPELINE_DURATION_MS);
      return () => clearTimeout(timer);
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
      />

      <div className="mb-6 rounded-card border border-line bg-paper p-4 shadow-card">
        <DocumentStatusTrail status={doc.status} />
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
            : "No findings on this document — the full settled text is available in the downloadable PDF."}
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
