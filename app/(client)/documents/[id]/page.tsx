"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { DocumentStatusTrail } from "@/components/domain/document-status-trail";
import { PipelineProgress } from "@/components/domain/pipeline-progress";
import { DocumentWorkspace } from "@/components/document/workspace";
import { Dateline } from "@/components/document/dateline";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getDocument, startAnalysis } from "@/lib/api/documents";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function DocumentPage({ params }: { params: { id: string } }) {
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

    // QA 4.5: analysis completion is tracked in the data layer (see
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
      <div className="grid min-h-[60vh] gap-px lg:grid-cols-[240px_1fr_360px]">
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="hidden h-full rounded-none lg:block" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  // There is no settled text to read yet, so the first pass owns the
  // screen until it finishes.
  if (doc.status === "analysing" || doc.status === "draft") {
    return (
      <div className="py-10">
        <PipelineProgress />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-line bg-canvas px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1 text-meta text-muted-fg hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Documents
          </Link>

          {doc.status === "settled" && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/documents/${doc.id}/checklist`}>
                Execution checklist
              </Link>
            </Button>
          )}
        </div>

        <DocumentStatusTrail status={doc.status} />

        {/* QA 3.3: duration, governing law and key terms were collected at
            intake and silently discarded. They are the deal brief the
            draft was built from, so they stay visible with it. */}
        <Dateline
          segments={[
            doc.counterpartyName,
            doc.durationMonths > 0 ? `${doc.durationMonths} months` : null,
            doc.governingLaw || null,
            doc.keyTerms,
          ]}
        />

        {doc.status === "settled" && doc.advocate && (
          <p className="text-meta text-ink">
            Settled by {doc.advocate.name}
            {doc.settledAt &&
              ` on ${format(new Date(doc.settledAt), "d MMM yyyy")}`}
            .
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {/* Read-only. Only an advocate adjudicates, so this carries no
            settle control, no rule ids and no override notes. */}
        <DocumentWorkspace
          doc={doc}
          role="client"
          onSettle={() => undefined}
          onReopen={() => undefined}
        />
      </div>
    </div>
  );
}
