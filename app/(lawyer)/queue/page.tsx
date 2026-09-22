"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
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
 * A queue, not a personal document list. It answers one question — what
 * requires my judgment — so work already in the advocate's hands leads
 * the screen, unclaimed work follows in the order it should be offered,
 * and everything settled is a record rather than a task.
 *
 * Monospace is for notation, not for sentences: the shape of the work is
 * said in words and only the states are set as notation.
 */

/** "1 high, 2 medium" — the shape of the work in one phrase. */
function severityPhrase(doc: ContractDocument): string | null {
  if (doc.findings.length === 0) return null;

  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  doc.findings.forEach((f) => {
    counts[f.severity] += 1;
  });

  return (["high", "medium", "low"] as Severity[])
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(", ");
}

function QueueRow({
  doc,
  action,
  lead = false,
}: {
  doc: ContractDocument;
  action: React.ReactNode;
  /** The work in hand is set larger than the work on offer. */
  lead?: boolean;
}) {
  const open = openFindingCount(doc);
  const blocked = hasBlockedCitation(doc);
  const shape = severityPhrase(doc);

  return (
    <li className="border-b border-line">
      <div className="grid gap-x-10 gap-y-4 py-6 lg:grid-cols-[minmax(0,1fr)_16rem_auto] lg:items-baseline">
        <div className="min-w-0">
          <h3
            className={cn(
              "font-display text-ink",
              lead ? "text-h2" : "text-h3",
            )}
          >
            <Link
              href={`/review/${doc.id}`}
              className="transition-colors hover:text-accent"
            >
              {doc.title}
            </Link>
          </h3>
          <p className="mt-1 text-meta text-muted-fg">
            {doc.clientName}
            <span className="mx-2 text-line">·</span>
            {doc.tier} tier
            <span className="mx-2 text-line">·</span>
            in queue {formatDistanceToNow(new Date(doc.createdAt))}
          </p>
        </div>

        <div>
          <p className="text-meta text-ink">
            {open > 0
              ? `${open} open ${open === 1 ? "finding" : "findings"}`
              : "No open findings"}
            {shape && (
              <span className="text-muted-fg">
                <span className="mx-2 text-line">·</span>
                {shape}
              </span>
            )}
          </p>
          {blocked && (
            <p className="mt-1 font-mono text-notation uppercase tracking-notation text-flagged">
              1 citation blocked
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 lg:justify-self-end">
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
      <div className="mx-auto max-w-[90rem]">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-12 w-2/3 max-w-xl" />
        <div className="mt-decision space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const inHand = [...claimed, ...unclaimed];
  const waiting = inHand.length;
  const unresolved = inHand.reduce((sum, d) => sum + openFindingCount(d), 0);
  const blockedCount = inHand.filter(hasBlockedCitation).length;

  return (
    <div className="mx-auto max-w-[90rem]">
      <header className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
        <div>
          <Dateline segments={[CURRENT_ADVOCATE.name, CURRENT_ADVOCATE.bar]} />
          {/* The one display moment on this screen. */}
          <h1 className="mt-3 max-w-2xl font-display text-h1 text-ink">
            {waiting === 0
              ? "Nothing is awaiting review."
              : `${waiting} ${waiting === 1 ? "document needs" : "documents need"} your review.`}
          </h1>
        </div>

        {waiting > 0 && (
          <p className="text-body text-ink">
            {unresolved} {unresolved === 1 ? "finding" : "findings"} unresolved
            {blockedCount > 0 && (
              <>
                <span className="mx-2 text-line">·</span>
                <span className="text-flagged">
                  {blockedCount} {blockedCount === 1 ? "citation" : "citations"}{" "}
                  blocked
                </span>
              </>
            )}
          </p>
        )}
      </header>

      {!available && (
        <p className="mt-8 border-l-2 border-caution pl-4 text-meta text-ink">
          You are marked unavailable for new claims. Change this in{" "}
          <Link href="/profile" className="text-accent underline">
            your profile
          </Link>
          .
        </p>
      )}

      {claimed.length > 0 && (
        <section className="mt-decision">
          <SectionHeading>Claimed by you</SectionHeading>
          <ul className="border-t-2 border-ink">
            {claimed.map((doc) => (
              <QueueRow
                key={doc.id}
                doc={doc}
                lead
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
        <SectionHeading>Unclaimed</SectionHeading>
        {unclaimed.length === 0 ? (
          <div className="border-t border-line pt-6">
            <EmptyState
              title="The desk is clear."
              description="Work arrives here once the first pass completes. Documents on the enhanced and senior tiers are offered first."
            />
          </div>
        ) : (
          <ul className="border-t border-line">
            {unclaimed.map((doc) => (
              <QueueRow
                key={doc.id}
                doc={doc}
                lead={claimed.length === 0}
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
          <SectionHeading>Settled by you</SectionHeading>
          <ul className="border-t border-line">
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 font-mono text-notation uppercase tracking-notation text-muted-fg">
      {children}
    </h2>
  );
}
