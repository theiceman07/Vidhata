"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BackButton } from "@/components/shared/back-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SummaryView } from "@/components/domain/summary-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument } from "@/lib/api/documents";
import { getSettledSummary, type SummaryResult } from "@/lib/api/summaries";

type Load =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; title: string; result: SummaryResult };

/**
 * A one-page summary of the settled document's key terms.
 *
 * Whether it exists is the API's to say: before sign-off the answer is
 * `not_available` and this page shows only that, so there is nothing of the
 * content here to hint at. The summary explains the document and never the
 * reader's situation.
 */
export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const [load, setLoad] = useState<Load>({ phase: "loading" });

  const fetchSummary = useCallback(async () => {
    setLoad({ phase: "loading" });
    try {
      // The summary call owns the gate; the title is only the page's heading.
      const [result, doc] = await Promise.all([
        getSettledSummary(params.id),
        getDocument(params.id),
      ]);
      setLoad({ phase: "loaded", title: doc?.title ?? "Document", result });
    } catch (err) {
      setLoad({
        phase: "error",
        message: err instanceof Error ? err.message : "Could not load the summary.",
      });
    }
  }, [params.id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (load.phase === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-1/3" />
        <Skeleton className="mt-10 h-72 w-full max-w-4xl rounded-card" />
      </div>
    );
  }

  if (load.phase === "error") {
    return <ErrorState message={load.message} onRetry={fetchSummary} />;
  }

  const { result, title } = load;

  return (
    <div className="w-full">
      <header className="flex items-start gap-4">
        <BackButton fallbackHref={`/documents/${params.id}`} label="Document" />
        <div className="min-w-0">
          {/* Before sign-off the page says only that it is not available. */}
          {result.state !== "not_available" && (
            <p className="truncate text-meta text-muted-fg">{title}</p>
          )}
          <h1 className="mt-1 font-display text-h1 text-ink">Summary</h1>
        </div>
      </header>

      <div className="mt-10">
        {result.state === "ready" && (
          <div className="rounded-card bg-parchment p-6 md:p-8">
            <SummaryView summary={result.summary} />
          </div>
        )}

        {result.state === "not_available" && (
          <div className="max-w-xl">
            <EmptyState
              title="Not available yet"
              description="A summary is written once the document is settled and signed off."
              action={
                <Button asChild variant="outline">
                  <Link href={`/documents/${params.id}`}>Back to the document</Link>
                </Button>
              }
            />
          </div>
        )}

        {result.state === "none" && (
          <div className="max-w-xl">
            <EmptyState
              title="No summary for this draft"
              description="A summary has not been written for this draft of the settled document in this preview."
              action={
                <Button asChild variant="outline">
                  <Link href={`/documents/${params.id}`}>Read the settled document</Link>
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
