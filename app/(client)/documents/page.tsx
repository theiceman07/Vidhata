"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StateLabel } from "@/components/document/state-label";
import { Dateline } from "@/components/document/dateline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocuments } from "@/lib/api/documents";
import { openFindingCount, hasBlockedCitation } from "@/lib/findings";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * The work queue.
 *
 * Deliberately not a KPI dashboard. It answers one question — what
 * requires a decision — so documents needing attention sort first and
 * the count of them is the headline rather than a total.
 */

/** Documents awaiting attention sort above settled work. */
const STATUS_ORDER: Record<ContractDocument["status"], number> = {
  revision: 0,
  pending_review: 1,
  under_review: 2,
  analysing: 3,
  draft: 4,
  settled: 5,
  executed: 6,
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

/** The one line that says why this document is in front of you. */
function standing(doc: ContractDocument): string {
  const open = openFindingCount(doc);
  if (doc.status === "analysing") return "First pass running";
  if (doc.status === "draft") return "Not yet submitted";
  if (hasBlockedCitation(doc)) return "1 citation unresolved";
  if (open > 0) return `${open} open ${open === 1 ? "finding" : "findings"}`;
  if (doc.settledAt) {
    return `Last reviewed ${format(new Date(doc.settledAt), "d MMM yyyy")}`;
  }
  return "No open findings";
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      // QA 3.5: every client used to see every tenant's documents on one
      // dashboard. Scoped in the data layer, not with a .filter() here.
      const result = await listDocuments(MOCK_CLIENT_ORG.id);
      setDocs(result);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load your documents.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-12 w-2/3" />
        <div className="mt-decision space-y-px">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  if (docs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No documents yet"
          description="Describe a deal and the first pass will draft it. An advocate settles it before it reaches you."
          action={
            <Button asChild>
              <Link href="/new">Start a document</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sorted = [...docs].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
  const needing = sorted.filter(
    (d) => STATUS_ORDER[d.status] <= STATUS_ORDER.under_review,
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <Dateline segments={[greeting()]} />
        {/* The one display moment on this screen. */}
        <h1 className="mt-3 font-display text-h1 text-ink">
          {needing === 0
            ? "Nothing is waiting on you."
            : `${needing} ${needing === 1 ? "document is" : "documents are"} awaiting advocate review.`}
        </h1>
      </header>

      <ul className="mt-decision border-t border-line">
        {sorted.map((doc) => (
          <li key={doc.id} className="border-b border-line">
            <Link
              href={`/documents/${doc.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-5 transition-colors hover:bg-parchment/60"
            >
              <div className="min-w-0">
                <p className="font-display text-h3 text-ink">{doc.title}</p>
                <Dateline
                  segments={[doc.type.toUpperCase(), standing(doc)]}
                  className="mt-1"
                />
              </div>
              <StateLabel state={doc.status} />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-decision">
        <Button asChild variant="outline">
          <Link href="/new">Start a document</Link>
        </Button>
      </div>
    </div>
  );
}
