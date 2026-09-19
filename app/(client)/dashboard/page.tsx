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
      const result = await listDocuments();
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
  const needsAttentionCount = docs.filter(
    (d) => d.status === "revision" || d.status === "draft",
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total documents" value={docs.length} />
        <StatCard label="Settled" value={settledCount} />
        <StatCard label="Needs your attention" value={needsAttentionCount} />
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
        <div className="overflow-hidden rounded-card border border-line bg-paper shadow-card">
          <table className="w-full text-left text-body">
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
                  <tr key={doc.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      {doc.title}
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
      )}
    </div>
  );
}
