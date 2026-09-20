"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  listDocuments,
  claimDocument,
  getQueuePriority,
} from "@/lib/api/documents";
import { getAdvocateProfile } from "@/lib/api/advocate";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function QueuePage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [result, profile] = await Promise.all([
        listDocuments(),
        getAdvocateProfile(),
      ]);
      setDocs(result);
      setAvailable(profile.available);
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

  // QA 7.3: "Priority turnaround" (pricing page, Enhanced/Senior tiers)
  // used to be decorative copy — nothing in the queue actually prioritised
  // higher tiers. Sorted by tier priority, then by age within a tier.
  const unclaimed = useMemo(
    () =>
      docs
        .filter((d) => d.status === "pending_review")
        .sort((a, b) => {
          const tierDelta = getQueuePriority(a) - getQueuePriority(b);
          if (tierDelta !== 0) return tierDelta;
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }),
    [docs],
  );
  const claimed = docs.filter(
    (d) => d.status === "under_review" && d.advocate?.id === CURRENT_ADVOCATE.id,
  );
  // QA 10.4: "Needs your attention" belongs on the advocate side, where
  // pending reviews and flagged findings are actually actionable — the
  // client dashboard's version of this stat is a separate, narrower metric
  // (see app/(client)/dashboard/page.tsx).
  const needsAttention = docs.filter(
    (d) =>
      d.status === "pending_review" ||
      (d.status === "under_review" &&
        d.advocate?.id === CURRENT_ADVOCATE.id &&
        d.findings.some((f) => f.disposition === "pending")),
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
          {needsAttention.length > 0 && (
            <section className="rounded-card border border-caution/30 bg-caution/10 p-4">
              <p className="flex items-center gap-2 font-medium text-ink">
                <AlertCircle className="h-4 w-4 text-caution-fg" aria-hidden />
                Needs your attention ({needsAttention.length})
              </p>
              <p className="mt-1 text-small text-muted-fg">
                {unclaimed.length} unclaimed document
                {unclaimed.length === 1 ? "" : "s"} waiting, plus any of your
                claimed documents with findings still pending adjudication.
              </p>
            </section>
          )}

          {!available && (
            <section className="rounded-card border border-line bg-canvas/50 p-4 text-small text-muted-fg">
              You&apos;re marked unavailable for new claims — update this in{" "}
              <a href="/profile" className="font-medium text-brand hover:underline">
                Profile
              </a>
              . You can still continue documents already claimed.
            </section>
          )}

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
                        {doc.tier !== "standard" && " · priority"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={doc.status} />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm"
                                disabled={claimingId === doc.id || !available}
                                onClick={() => handleClaim(doc.id)}
                              >
                                {claimingId === doc.id ? "Claiming…" : "Claim"}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!available && (
                            <TooltipContent>
                              <p className="text-small">
                                You&apos;re marked unavailable for new claims
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
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
