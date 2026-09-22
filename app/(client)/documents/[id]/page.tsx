"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { PipelineProgress } from "@/components/domain/pipeline-progress";
import { DocumentWorkspace } from "@/components/document/workspace";
import { Provenance } from "@/components/document/provenance";
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

  const settled = doc.status === "settled" || doc.status === "executed";

  return (
    <DocumentWorkspace
      doc={doc}
      role="client"
      back={{ href: "/documents", label: "Documents" }}
      subheader={<Provenance doc={doc} />}
      actions={
        settled && (
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/documents/${doc.id}/checklist`}>
                Execution checklist
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Icon name="print" size={18} />
              Save as PDF
            </Button>
          </>
        )
      }
      // Read-only. Only an advocate adjudicates, so this carries no settle
      // control, no rule ids and no override notes.
      onSettle={() => undefined}
      onReopen={() => undefined}
    />
  );
}
