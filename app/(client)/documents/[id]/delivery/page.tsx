"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { DownloadOptions } from "@/components/domain/download-options";
import { SummaryView } from "@/components/domain/summary-view";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Tick } from "@/components/shared/tick";
import { SettlementNoteView } from "@/components/document/settlement-note-view";
import { StateLabel } from "@/components/document/state-label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientDelivery } from "@/lib/api/client/delivery";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { DeliveryResult } from "@/lib/types";
import { documentIdentity } from "@/lib/documentTitle";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentTabs } from "@/components/document/document-tabs";
import { PageSkeleton } from "@/components/shared/page-skeleton";

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
      <PageSkeleton tabs description={false}>
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <Skeleton className="h-96 w-full rounded-card" />
          <Skeleton className="h-72 w-full rounded-card" />
        </div>
      </PageSkeleton>
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
    { href: base, label: "Read the settled document", note: "The text as signed off." },
    {
      href: `${base}/checklist`,
      label: "Execution checklist",
      note: `${delivery.checklist.done} of ${delivery.checklist.total} steps complete.`,
    },
    { href: `${base}/history`, label: "Version history", note: "Every draft and decision." },
    {
      href: `${base}/consultation`,
      label: "Consultation",
      note: `Ask ${delivery.signOff.advocate}, who settled it.`,
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        stacked
        back={{ fallbackHref: `/documents/${delivery.documentId}`, label: "Document" }}
        title={documentIdentity(delivery.title).name}
        meta={[documentIdentity(delivery.title).with ?? `with ${delivery.counterparty}`]}
        actions={<DownloadOptions compact />}
        status={<StateLabel state={delivery.status} />}
        tabs={<DocumentTabs documentId={delivery.documentId} signedOff={true} checklist={delivery.checklist} />}
      />

      <div className="min-w-0 space-y-4">
      <section
        aria-labelledby="signoff-title"
        className="grid grid-cols-[1fr_auto_auto] items-center gap-x-10 gap-y-1 rounded-card bg-parchment px-5 py-3.5 max-sm:grid-cols-1"
      >
        <h2 id="signoff-title" className="flex items-center gap-2 font-display text-h3 text-ink">
          <Tick state="done" size="lg" />
          Signed off by {delivery.signOff.advocate}
        </h2>
        <dl className="contents">
          <div className="flex flex-col gap-0.5">
            <dt className="text-label text-muted-fg">Bar enrolment</dt>
            <dd className="font-mono text-meta text-ink">{delivery.signOff.enrolment}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-label text-muted-fg">Date</dt>
            <dd className="text-meta text-ink">{format(new Date(delivery.signOff.at), "d MMMM yyyy")}</dd>
          </div>
        </dl>
      </section>
          <section aria-labelledby="next-title">
            <h2 id="next-title" className="sr-only">
              Around this document
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {links.map((link) => (
                <li key={link.href} className="flex">
                  <Link
                    href={link.href}
                    className="group flex w-full flex-col justify-center gap-1 rounded-card bg-parchment px-5 py-4 transition-colors hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-body font-medium leading-6 text-ink">{link.label}</span>
                      <Icon
                        name="arrow_forward"
                        size={18}
                        className="shrink-0 text-muted-fg transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </span>
                    <span className="text-meta leading-5 text-muted-fg">{link.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="summary-title">
            <h2 id="summary-title" className="font-display text-h3 text-ink">
              Summary
            </h2>
            <div className="mt-2">
              {delivery.summary ? (
                <SummaryView summary={delivery.summary} layout="bento" />
              ) : (
                <p className="rounded-card bg-parchment px-5 py-4 text-meta text-muted-fg">
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
    </div>
  );
}
