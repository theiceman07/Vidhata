"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocuments } from "@/lib/api/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-paper p-5 shadow-card">
      <p className="text-small text-muted-fg">{label}</p>
      <p className="mt-1 font-display text-h1 text-ink">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      // QA 3.5: every client used to see every tenant's documents on one
      // dashboard (Anaya Textiles, Bharosa Fintech, Trivandrum Cloud Labs
      // and an individual all appeared together). Scoped in the data
      // layer, not with a client-side .filter() here.
      const result = await listDocuments(MOCK_CLIENT_ORG.id);
      setDocs(result);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState message={errorMessage} onRetry={load} />
      </div>
    );
  }

  const settledCount = docs.filter(
    (d) => d.status === "settled" || d.status === "executed",
  ).length;
  // QA 4.2 / 10.4: this used to count only revision/draft and label itself
  // "Needs your attention" — a document already awaiting the advocate
  // (pending_review) is exactly the status a client most expects "needs
  // attention" to mean, but there's nothing the *client* can do about it.
  // Split into what the client can act on vs. what's just informational;
  // the actionable advocate-side version of "Needs your attention" now
  // lives on the queue (app/(lawyer)/queue/page.tsx).
  const awaitingResponseCount = docs.filter(
    (d) => d.status === "revision" || d.status === "draft",
  ).length;
  const withAdvocateCount = docs.filter(
    (d) => d.status === "pending_review" || d.status === "under_review",
  ).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        action={
          <Button asChild>
            <Link href="/new">
              <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
              New deal
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total documents" value={docs.length} />
        <StatCard label="Settled" value={settledCount} />
        <StatCard label="Awaiting your response" value={awaitingResponseCount} />
        <StatCard label="With your advocate" value={withAdvocateCount} />
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Start your first deal and we'll draft, screen and route it to an advocate."
          action={
            <Button asChild>
              <Link href="/new">Start your first deal</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* QA 6.1: below md this table used to sit in an overflow-hidden
              wrapper with no overflow-x — a 512px table clipped inside a
              356px box, with the Created/View columns unreachable. A
              6-column table is unreadable at 390px even scrollable, so it
              becomes a stacked card list instead. */}
          <div className="space-y-3 md:hidden">
            {[...docs]
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="block rounded-card border border-line bg-paper p-4 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{doc.title}</p>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-small text-muted-fg">
                    {doc.counterpartyName}
                  </p>
                  <p className="mt-1 text-small text-muted-fg">
                    Created {format(new Date(doc.createdAt), "d MMM yyyy")}
                  </p>
                </Link>
              ))}
          </div>

          <div className="hidden overflow-x-auto rounded-card border border-line bg-paper shadow-card md:block">
            <table className="w-full min-w-[560px] text-left text-body">
              <thead className="border-b border-line bg-canvas/50 text-small text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-medium">Document</th>
                  <th className="px-4 py-3 font-medium">Counterparty</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {[...docs]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )
                  .map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-line last:border-0 hover:bg-canvas/40"
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        {/* QA 4.7: only the View button used to navigate —
                            the title/row itself was inert. The title is
                            now a real link (keyboard- and
                            middle-click-friendly), not a non-focusable
                            onClick on the row. */}
                        <Link
                          href={`/documents/${doc.id}`}
                          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          {doc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-fg">
                        {doc.counterpartyName}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-fg">
                        {format(new Date(doc.createdAt), "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/documents/${doc.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
