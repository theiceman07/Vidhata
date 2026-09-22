"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StateLabel } from "@/components/document/state-label";
import { Dateline } from "@/components/document/dateline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listDocuments,
  claimDocument,
  getQueuePriority,
} from "@/lib/api/documents";
import { getAdvocateProfile } from "@/lib/api/advocate";
import { openFindingCount, hasBlockedCitation } from "@/lib/findings";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument, Severity } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * The review queue.
 *
 * A queue, not a personal document list: it is ordered by what most
 * needs an advocate, and every row states the shape of the work waiting
 * inside it rather than a generic status.
 */

/** "3 findings · 1 high, 2 medium" — the shape of the work in one line. */
function findingSummary(doc: ContractDocument): string | null {
  if (doc.findings.length === 0) return null;

  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  doc.findings.forEach((f) => {
    counts[f.severity] += 1;
  });

  const parts = (["high", "medium", "low"] as Severity[])
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`);

  const total = doc.findings.length;
  return `${total} ${total === 1 ? "finding" : "findings"} · ${parts.join(", ")}`;
}

function QueueRow({
  doc,
  action,
}: {
  doc: ContractDocument;
  action: React.ReactNode;
}) {
  const open = openFindingCount(doc);

  return (
    <li className="border-b border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 py-5">
        <div className="min-w-0">
          <p className="font-display text-h3 text-ink">{doc.title}</p>
          <Dateline
            segments={[
              doc.clientName,
              `${doc.tier} tier`,
              findingSummary(doc),
              open > 0 ? `${open} open` : null,
              hasBlockedCitation(doc) ? "Citation blocked" : null,
              `In queue ${formatDistanceToNow(new Date(doc.createdAt))}`,
            ]}
            className="mt-1"
          />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StateLabel state={doc.status} />
          {action}
        </div>
      </div>
    </li>
  );
}

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
      // Unscoped on purpose: an advocate must see documents from every
      // client company, unlike the client queue (QA 3.5).
      const [result, profile] = await Promise.all([
        listDocuments(),
        getAdvocateProfile(),
      ]);
      setDocs(result);
      setAvailable(profile.available);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load the queue.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // QA 7.3: tier ordering is real routing behaviour, which is what backs
  // the pricing page's priority turnaround claim. Within a tier, oldest
  // first, so nothing is starved.
  const unclaimed = useMemo(
    () =>
      docs
        .filter((d) => d.status === "pending_review")
        .sort((a, b) => {
          const byTier = getQueuePriority(a) - getQueuePriority(b);
          if (byTier !== 0) return byTier;
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }),
    [docs],
  );

  const claimed = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.status === "under_review" && d.advocate?.id === CURRENT_ADVOCATE.id,
      ),
    [docs],
  );

  const settled = useMemo(
    () =>
      docs.filter(
        (d) =>
          (d.status === "settled" || d.status === "executed") &&
          d.advocate?.id === CURRENT_ADVOCATE.id,
      ),
    [docs],
  );

  async function claim(id: string) {
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

  const waiting = unclaimed.length + claimed.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <Dateline segments={[CURRENT_ADVOCATE.name, CURRENT_ADVOCATE.bar]} />
        {/* The one display moment on this screen. */}
        <h1 className="mt-3 font-display text-h1 text-ink">
          {waiting === 0
            ? "Nothing is awaiting review."
            : `${waiting} ${waiting === 1 ? "document needs" : "documents need"} your review.`}
        </h1>
      </header>

      {!available && (
        <p className="mt-6 border-l-2 border-caution pl-4 text-meta text-ink">
          You are marked unavailable for new claims. Change this in{" "}
          <Link href="/profile" className="text-accent underline">
            your profile
          </Link>
          .
        </p>
      )}

      {claimed.length > 0 && (
        <section className="mt-decision">
          <h2 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
            Claimed by you
          </h2>
          <ul className="mt-4 border-t border-line">
            {claimed.map((doc) => (
              <QueueRow
                key={doc.id}
                doc={doc}
                action={
                  <Button asChild size="sm">
                    <Link href={`/review/${doc.id}`}>Continue review</Link>
                  </Button>
                }
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-decision">
        <h2 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
          Unclaimed
        </h2>
        {unclaimed.length === 0 ? (
          <div className="mt-4 border-t border-line pt-6">
            <EmptyState
              title="No documents awaiting review"
              description="Work arrives here once the first pass completes. Documents on the enhanced and senior tiers are offered first."
            />
          </div>
        ) : (
          <ul className="mt-4 border-t border-line">
            {unclaimed.map((doc) => (
              <QueueRow
                key={doc.id}
                doc={doc}
                action={
                  <Button
                    size="sm"
                    disabled={!available || claimingId === doc.id}
                    onClick={() => claim(doc.id)}
                  >
                    {claimingId === doc.id ? "Claiming" : "Claim"}
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      {settled.length > 0 && (
        <section className="mt-decision">
          <h2 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
            Settled by you
          </h2>
          <ul className="mt-4 border-t border-line">
            {settled.map((doc) => (
              <QueueRow
                key={doc.id}
                doc={doc}
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/review/${doc.id}`}>Read</Link>
                  </Button>
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
