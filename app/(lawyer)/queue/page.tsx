"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocuments, claimDocument } from "@/lib/api/documents";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function QueuePage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);

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

  async function handleClaim(id: string) {
    setClaimingId(id);
    try {
      await claimDocument(id, CURRENT_ADVOCATE);
      router.push(`/review/${id}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not claim this document.",
      );
      setState("error");
    } finally {
      setClaimingId(null);
    }
  }

  const unclaimed = docs.filter((d) => d.status === "pending_review");
  const claimed = docs.filter(
    (d) => d.status === "under_review" && d.advocate?.id === CURRENT_ADVOCATE.id,
  );

  return (
    <div>
      <PageHeader title="Queue" description="Unclaimed and claimed documents." />

      {state === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-card" />
          <Skeleton className="h-20 w-full rounded-card" />
          <Skeleton className="h-20 w-full rounded-card" />
        </div>
      )}

      {state === "error" && <ErrorState message={errorMessage} onRetry={load} />}

      {state === "loaded" && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-h3 font-display text-ink">
              Unclaimed ({unclaimed.length})
            </h2>
            {unclaimed.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No documents waiting"
                description="New documents appear here once a client's pipeline finishes running."
              />
            ) : (
              <div className="space-y-3">
                {unclaimed.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 rounded-card border border-line bg-paper p-4 shadow-card"
                  >
                    <div>
                      <p className="font-medium text-ink">{doc.title}</p>
                      <p className="text-small text-muted-fg">
                        {doc.clientName} · {doc.findings.length} findings ·{" "}
                        {doc.tier} tier
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={doc.status} />
                      <Button
                        size="sm"
                        disabled={claimingId === doc.id}
                        onClick={() => handleClaim(doc.id)}
                      >
                        {claimingId === doc.id ? "Claiming…" : "Claim"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-h3 font-display text-ink">
              Claimed by you ({claimed.length})
            </h2>
            {claimed.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nothing claimed yet"
                description="Documents you claim from the unclaimed list appear here."
              />
            ) : (
              <div className="space-y-3">
                {claimed.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 rounded-card border border-line bg-paper p-4 shadow-card"
                  >
                    <div>
                      <p className="font-medium text-ink">{doc.title}</p>
                      <p className="text-small text-muted-fg">
                        {doc.clientName} · {doc.findings.length} findings
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={doc.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/review/${doc.id}`)}
                      >
                        Continue review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
