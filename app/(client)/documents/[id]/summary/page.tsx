"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SUMMARY_LABEL, SummaryView } from "@/components/domain/summary-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientSummary } from "@/lib/api/client/delivery";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { SummaryResult } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentTabs } from "@/components/document/document-tabs";
import { PageSkeleton } from "@/components/shared/page-skeleton";

type Load =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; title: string | null; result: SummaryResult };

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
      // The call owns the gate, and gives the title only once the summary is the client's to read.
      const { title, result } = await getClientSummary(MOCK_CLIENT_ORG.id, params.id);
      setLoad({ phase: "loaded", title, result });
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
      <PageSkeleton tabs>
        <Skeleton className="h-96 w-full rounded-card" />
      </PageSkeleton>
    );
  }

  if (load.phase === "error") {
    return <ErrorState message={load.message} onRetry={fetchSummary} />;
  }

  const { result, title } = load;

  return (
    <div className="w-full">
      {/* Before sign-off the page says only that it is not available, so no
          title is passed down until there is one. */}
      <PageHeader
        back={{ fallbackHref: `/documents/${params.id}`, label: "Document" }}
        eyebrow={title || undefined}
        title="Summary"
        description={result.state === "ready" ? SUMMARY_LABEL : undefined}
        tabs={<DocumentTabs documentId={params.id} signedOff={result.state === "ready"} />}
      />

      <div>
        {result.state === "ready" && (
          <div className="rounded-card bg-parchment p-6 md:p-8">
            <SummaryView summary={result.summary} showLabel={false} />
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
              title="No summary has been prepared for this document"
              description="The settled document is complete without one. You can read it in full."
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
