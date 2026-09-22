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
 * requires a decision — so the document that needs one is set larger
 * than the rest, and everything settled recedes to a quiet list. The
 * count of what is waiting is the headline rather than a total.
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
      <div className="mx-auto max-w-[90rem]">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-12 w-2/3 max-w-xl" />
        <div className="mt-decision space-y-4">
          <Skeleton className="h-40 w-full max-w-3xl" />
          <Skeleton className="h-16 w-full max-w-3xl" />
          <Skeleton className="h-16 w-full max-w-3xl" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  if (docs.length === 0) {
    return (
      <div className="mx-auto max-w-[90rem]">
        <Dateline segments={[greeting()]} />
        <h1 className="mt-3 font-display text-h1 text-ink">
          The desk is clear.
        </h1>
        <div className="mt-decision max-w-xl">
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
      </div>
    );
  }

  const sorted = [...docs].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
  const waiting = sorted.filter(
    (d) => STATUS_ORDER[d.status] <= STATUS_ORDER.draft,
  );
  const settled = sorted.filter(
    (d) => STATUS_ORDER[d.status] > STATUS_ORDER.draft,
  );

  // The document that most needs a decision is the screen's subject.
  const [lead, ...rest] = waiting;
  const awaitingAdvocate = waiting.filter(
    (d) => d.status === "pending_review" || d.status === "under_review",
  ).length;
  // "Changes requested" is the one state where the next move is the
  // client's, so it outranks anything sitting with an advocate.
  const needsYou = waiting.filter((d) => d.status === "revision").length;

  // Execution is work the client still owes after sign-off, and it is the
  // only thing on this screen that is not about waiting.
  const outstanding = settled.filter((doc) =>
    doc.executionSteps.some((step) => step.applicable && !step.complete),
  );

  return (
    <div className="mx-auto max-w-[90rem]">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Dateline segments={[greeting(), MOCK_CLIENT_ORG.name]} />
          {/* The one display moment on this screen. */}
          <h1 className="mt-3 max-w-2xl font-display text-h1 text-ink">
            {needsYou > 0
              ? `${needsYou} ${needsYou === 1 ? "document needs" : "documents need"} your attention.`
              : awaitingAdvocate > 0
                ? `${awaitingAdvocate} ${awaitingAdvocate === 1 ? "document is" : "documents are"} awaiting advocate review.`
                : "Nothing is waiting on you."}
          </h1>
        </div>
        <Button asChild>
          <Link href="/new">Start a document</Link>
        </Button>
      </header>

      <div className="mt-decision grid gap-x-16 gap-y-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {lead && <LeadDocument doc={lead} />}

          {rest.length > 0 && (
            <section className="mt-decision">
              <SectionHeading>Also in progress</SectionHeading>
              <ul className="border-t border-line">
                {rest.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </ul>
            </section>
          )}

          {settled.length > 0 && (
            <section className="mt-decision">
              <SectionHeading>Settled</SectionHeading>
              <ul className="border-t border-line">
                {settled.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </ul>
            </section>
          )}
        </div>

        {outstanding.length > 0 && (
          <aside className="xl:border-l xl:border-line xl:pl-10">
            <SectionHeading>To execute</SectionHeading>
            <ul className="space-y-6 border-t border-line pt-5">
              {outstanding.map((doc) => {
                const steps = doc.executionSteps.filter((s) => s.applicable);
                const done = steps.filter((s) => s.complete).length;

                return (
                  <li key={doc.id}>
                    <Link
                      href={`/documents/${doc.id}/checklist`}
                      className="group block"
                    >
                      <p className="font-display text-h3 text-ink group-hover:underline">
                        {doc.title}
                      </p>
                      <p className="mt-1 text-meta text-muted-fg">
                        {done} of {steps.length} steps complete on the execution
                        checklist.
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
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

/** What is actually happening to this document, and whose move it is. */
const LEAD_NOTE: Record<ContractDocument["status"], string> = {
  draft: "This document has not been submitted yet. Nothing reaches an advocate until it is.",
  analysing:
    "The first pass is drafting and screening the document. Nothing reaches an advocate until it finishes.",
  pending_review:
    "The document is in the advocate queue. You will be able to read it once it is settled and signed off.",
  under_review:
    "An advocate is working through the findings. You will be able to read the settled document once it is signed off.",
  revision:
    "An advocate has asked for changes before this document can be settled. Open it to read what they need.",
  settled: "Settled and signed off. The execution checklist is ready.",
  executed: "Executed. Stamping and signature are recorded as complete.",
};

/**
 * The document in front of you, set at the size of its importance.
 * Hierarchy here is scale and space, not a coloured card.
 */
function LeadDocument({ doc }: { doc: ContractDocument }) {
  const open = openFindingCount(doc);
  const blocked = hasBlockedCitation(doc);
  const standingNote = LEAD_NOTE[doc.status];

  return (
    <section className="border-t-2 border-ink pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <StateLabel state={doc.status} />
        {blocked && (
          <span className="font-mono text-notation uppercase tracking-notation text-flagged">
            1 citation unresolved
          </span>
        )}
      </div>

      <h2 className="mt-4 max-w-3xl font-display text-h1 text-ink">
        {doc.title}
      </h2>
      <p className="mt-2 text-body text-ink">
        {doc.counterpartyName}
        <span className="mx-2 text-line">·</span>
        {open > 0
          ? `${open} open ${open === 1 ? "finding" : "findings"}`
          : standing(doc)}
      </p>

      <p className="mt-4 max-w-xl text-meta text-muted-fg">{standingNote}</p>

      <div className="mt-8">
        <Button asChild size="lg">
          <Link href={`/documents/${doc.id}`}>Open the document</Link>
        </Button>
      </div>
    </section>
  );
}

/** Everything that is not the subject of the screen. Quieter, in a row. */
function DocumentRow({ doc }: { doc: ContractDocument }) {
  return (
    <li className="border-b border-line">
      <Link
        href={`/documents/${doc.id}`}
        className="grid gap-x-8 gap-y-2 py-5 transition-colors hover:bg-parchment/50 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-baseline"
      >
        <div className="min-w-0">
          <p className="font-display text-h3 text-ink">{doc.title}</p>
          <p className="mt-1 text-meta text-muted-fg">{doc.counterpartyName}</p>
        </div>
        <p className="text-meta text-ink">{standing(doc)}</p>
        <StateLabel state={doc.status} className="justify-self-start" />
      </Link>
    </li>
  );
}
