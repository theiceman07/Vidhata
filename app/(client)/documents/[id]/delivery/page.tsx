"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { DownloadOptions } from "@/components/domain/download-options";
import { SummaryView } from "@/components/domain/summary-view";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { Tick } from "@/components/shared/tick";
import { SettlementNoteView } from "@/components/document/settlement-note-view";
import { StateLabel } from "@/components/document/state-label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientDelivery } from "@/lib/api/client/delivery";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { DeliveryResult } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";

type Load =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; result: DeliveryResult };

/**
 * The settled document, handed over.
 *
 * One place for what a client receives at sign-off: the recorded sign-off, the
 * summary of the document's terms, the way to the execution checklist, the
 * history and the consultation, and the downloads (which the preview does not
 * enable). Whether it exists is the API's to say. Before sign-off the answer
 * is `not_available` and this page shows only that.
 *
 * There is no draft banner and no coverage panel here: a settled document is
 * not a draft, and what was checked is not this page's business.
 */
export default function DeliveryPage() {
  const params = useParams<{ id: string }>();
  const [load, setLoad] = useState<Load>({ phase: "loading" });

  const fetchDelivery = useCallback(async () => {
    setLoad({ phase: "loading" });
    try {
      setLoad({ phase: "loaded", result: await getClientDelivery(MOCK_CLIENT_ORG.id, params.id) });
    } catch (err) {
      setLoad({
        phase: "error",
        message: err instanceof Error ? err.message : "Could not load this delivery.",
      });
    }
  }, [params.id]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  if (load.phase === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-1/3" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-96 w-full rounded-card" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (load.phase === "error") {
    return <ErrorState message={load.message} onRetry={fetchDelivery} />;
  }

  const { result } = load;

  if (result.state === "not_available") {
    return (
      <div className="w-full">
        <PageHeader
          back={{ fallbackHref: `/documents/${params.id}`, label: "Document" }}
          title="Your settled document"
        />
        <div className="max-w-xl">
          <EmptyState
            title="Not available yet"
            description="This is handed over once the document is settled and signed off by an advocate."
            action={
              <Button asChild variant="outline">
                <Link href={`/documents/${params.id}`}>Back to the document</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const { delivery } = result;
  const base = `/documents/${delivery.documentId}`;

  const links: { href: string; label: string; note: string }[] = [
    { href: base, label: "Read the settled document", note: "The text the advocate signed off." },
    {
      href: `${base}/checklist`,
      label: "Execution checklist",
      note: `${delivery.checklist.done} of ${delivery.checklist.total} steps complete.`,
    },
    { href: `${base}/history`, label: "Version history", note: "Every draft, with the advocate's decisions." },
    {
      href: `${base}/consultation`,
      label: "Consultation",
      note: `Ask ${delivery.signOff.advocate}, who settled it.`,
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        back={{ fallbackHref: `/documents/${delivery.documentId}`, label: "Document" }}
        eyebrow={delivery.counterparty}
        title={delivery.title}
        actions={<StateLabel state={delivery.status} />}
      />

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-10">
          {/* The sign-off is a decision, so it carries the accent. */}
          <section aria-labelledby="signoff-title" className="rounded-card bg-parchment p-6 md:p-8">
            <h2 id="signoff-title" className="text-body font-medium text-ink">
              Sign-off
            </h2>
            <p className="mt-3 inline-flex items-center gap-2 font-display text-h2 text-ink">
              <Tick state="done" size="lg" />
              Signed off by {delivery.signOff.advocate}
            </p>
            <dl className="mt-4 grid max-w-md grid-cols-[10rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-meta">
              <dt className="text-muted-fg">Bar enrolment</dt>
              <dd className="font-mono text-ink">{delivery.signOff.enrolment}</dd>
              <dt className="text-muted-fg">Date</dt>
              <dd className="text-ink">{format(new Date(delivery.signOff.at), "d MMMM yyyy")}</dd>
            </dl>
          </section>

          <section aria-labelledby="summary-title" className="rounded-card bg-parchment p-6 md:p-8">
            <h2 id="summary-title" className="text-body font-medium text-ink">
              Summary
            </h2>
            <div className="mt-3">
              {delivery.summary ? (
                <SummaryView summary={delivery.summary} />
              ) : (
                <p className="max-w-measure text-body text-muted-fg">
                  No summary has been prepared for this document.
                </p>
              )}
            </div>
          </section>

          {/* The advocate's own notes to the client, released at sign-off. Nothing is said of
              them when there are none, so nothing says that any were ever written. */}
          {delivery.settlementNotes.length > 0 && (
            <section aria-labelledby="notes-title">
              <h2 id="notes-title" className="text-body font-medium text-ink">
                Your advocate&apos;s notes
              </h2>
              <ul className="mt-3 space-y-3">
                {delivery.settlementNotes.map((n) => (
                  <li key={n.id}>
                    <SettlementNoteView
                      label={`Your advocate's note · ${delivery.signOff.advocate}`}
                      clauseNumber={n.clauseNumber}
                      text={n.text}
                      releasedAt={n.releasedAt}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-4 self-start">
          <section aria-labelledby="downloads-title" className="rounded-card bg-parchment p-6">
            <h2 id="downloads-title" className="text-body font-medium text-ink">
              Downloads
            </h2>
            <div className="mt-4">
              <DownloadOptions />
            </div>
          </section>

          <section aria-labelledby="next-title" className="rounded-card bg-parchment p-6">
            <h2 id="next-title" className="text-body font-medium text-ink">
              Around this document
            </h2>
            <ul className="mt-4 space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-3 rounded-control bg-paper px-4 py-3 transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-meta text-ink">{link.label}</span>
                      <span className="block text-meta text-muted-fg">{link.note}</span>
                    </span>
                    <Icon
                      name="arrow_forward"
                      size={18}
                      className="text-muted-fg transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
