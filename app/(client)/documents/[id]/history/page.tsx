"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BackButton } from "@/components/shared/back-button";
import { ErrorState } from "@/components/shared/error-state";
import { VersionHistory } from "@/components/domain/version-history";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument, getDocumentVersions } from "@/lib/api/documents";
import type { ContractDocument, DocumentVersion } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * A document's drafts and what changed between them, for the client.
 *
 * What is shown, and what is held back until sign-off, is decided in
 * lib/clientVersions. This page loads the document and its snapshots and
 * hands them over.
 */
export default function VersionHistoryPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [document, snapshots] = await Promise.all([
        getDocument(params.id),
        getDocumentVersions(params.id),
      ]);
      if (!document) throw new Error("Document not found.");
      setDoc(document);
      setVersions(snapshots);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this document's drafts.",
      );
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-1/3" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-card" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3 rounded-control" />
            <Skeleton className="h-48 rounded-card" />
            <Skeleton className="h-48 rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div className="w-full">
      <header className="flex min-w-0 items-start gap-4">
        <BackButton fallbackHref={`/documents/${doc.id}`} label="Back" />
        <div className="min-w-0">
          <p className="truncate text-meta text-muted-fg">{doc.title}</p>
          <h1 className="mt-1 font-display text-h1 text-ink">Version history</h1>
          <p className="mt-2 max-w-measure text-body text-muted-fg">
            Each draft as it was handed on, and what changed between any two.
          </p>
        </div>
      </header>

      <div className="mt-10">
        <VersionHistory doc={doc} versions={versions} />
      </div>
    </div>
  );
}
