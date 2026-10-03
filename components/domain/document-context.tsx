"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Icon } from "@/components/shared/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocuments } from "@/lib/api/documents";
import { tierLabel } from "@/lib/config/pricing";
import { clientVisibleFindings } from "@/lib/findings";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { groupOf, yourMove } from "@/lib/moves";
import type { ContractDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The context a document sits in, for the panels beside it: the deal as
 * the client described it, the advocate answerable for it, what happens
 * after the current move, and what else is waiting on the client.
 *
 * Every panel is a parchment sheet with a small label; space and tint
 * divide them, never rules.
 */

export function ContextPanel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  /** A small note or link set against the title. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card bg-parchment p-6", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-label font-medium text-muted-fg">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** The deal as the client stated it at intake. Nothing here is inferred. */
export function DealOnFile({ doc, className }: { doc: ContractDocument; className?: string }) {
  const rows: [string, React.ReactNode][] = [
    ["Parties", `${doc.clientName} · ${doc.counterpartyName}`],
    ["Executed in", doc.stateOfExecution],
    ["Governing law", doc.governingLaw],
  ];
  if (doc.transactionValue > 0) rows.push(["Value", rupees.format(doc.transactionValue)]);
  rows.push(["Term", `${doc.durationMonths} months`]);
  if (doc.counterpartyIsMsme) rows.push(["Counterparty", "Registered MSME"]);
  rows.push(["Review", tierLabel(doc.tier)]);

  return (
    <ContextPanel title="The deal on file" className={className}>
      <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-meta">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-fg">{term}</dt>
            <dd className="min-w-0 text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {doc.keyTerms && (
        <div className="mt-5 rounded-control bg-paper px-4 py-3">
          <p className="text-label text-muted-fg">Key terms, as you stated them</p>
          <p className="mt-1 text-meta text-ink">{doc.keyTerms}</p>
        </div>
      )}
    </ContextPanel>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** The named advocate answerable for this document. */
export function AdvocatePanel({ doc, className }: { doc: ContractDocument; className?: string }) {
  const advocate = doc.advocate;

  return (
    <ContextPanel title="Your advocate" className={className}>
      {advocate ? (
        <>
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper font-display text-[17px] text-ink"
            >
              {initials(advocate.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-ink">{advocate.name}</p>
              <p className="text-label text-muted-fg">
                Empanelled advocate · <span className="font-mono">{advocate.bar}</span>
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-meta">
            {doc.claimedAt && (
              <>
                <dt className="text-muted-fg">Claimed</dt>
                <dd className="text-ink">{format(new Date(doc.claimedAt), "d MMM yyyy")}</dd>
              </>
            )}
            {doc.settledAt && (
              <>
                <dt className="text-muted-fg">Signed off</dt>
                <dd className="text-ink">{format(new Date(doc.settledAt), "d MMM yyyy")}</dd>
              </>
            )}
          </dl>
        </>
      ) : (
        <p className="text-meta text-muted-fg">
          No advocate has claimed this document yet. The first to claim it
          is named here, with their enrolment number.
        </p>
      )}
    </ContextPanel>
  );
}

interface Station {
  title: string;
  body: string;
  current: boolean;
}

function stationsFor(doc: ContractDocument): Station[] {
  const advocate = doc.advocate?.name ?? "The advocate";
  const checklist: Station = {
    title: "Execution checklist",
    body: `Stamping, registration and e-signature for ${doc.stateOfExecution}, set out step by step, with a place to keep the proof.`,
    current: false,
  };
  const signOff: Station = {
    title: "Sign-off",
    body: "The advocate records the sign-off. Only then do you read the settled document, and its agent can explain any clause.",
    current: false,
  };

  if (doc.status === "revision") {
    const n = clientVisibleFindings(doc).filter(
      (f) => f.changeRequest && !f.changeRequest.response,
    ).length;
    return [
      {
        title: "You answer",
        body: `${n} ${n === 1 ? "request" : "requests"} from ${advocate}. Your answers go back together.`,
        current: true,
      },
      {
        title: `${advocate} settles each finding`,
        body: `Your answer is weighed against the finding it concerns, and the document becomes Draft ${doc.version + 1}.`,
        current: false,
      },
      signOff,
      checklist,
    ];
  }

  if (doc.status === "pending_review") {
    return [
      {
        title: "An advocate claims it",
        body: "It is in the queue. The advocate who claims it holds it alone until sign-off.",
        current: true,
      },
      {
        title: "Review of each finding",
        body: "Every finding from the first pass is settled by the advocate, with its source.",
        current: false,
      },
      signOff,
      checklist,
    ];
  }

  return [
    {
      title: `${advocate} reviews the findings`,
      body: "Each finding from the first pass is settled with its source. If an answer is needed from you, it appears on your documents.",
      current: true,
    },
    signOff,
    checklist,
  ];
}

/** What follows the move in hand, so the client knows when to come back. */
export function WhatHappensNext({ doc, className }: { doc: ContractDocument; className?: string }) {
  const stations = stationsFor(doc);

  return (
    <ContextPanel title="What happens next" className={className}>
      <ol>
        {stations.map((station, i) => (
          <li
            key={station.title}
            className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3.5 pb-5 last:pb-0"
          >
            {i < stations.length - 1 && (
              <span
                aria-hidden
                className="absolute bottom-0.5 left-[12.5px] top-9 w-[3px] rounded-full bg-line"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full font-mono text-label",
                station.current
                  ? "bg-ink text-paper"
                  : "bg-paper text-muted-fg ring-1 ring-inset ring-line",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-meta font-medium", station.current ? "text-ink" : "text-ink/80")}>
                {station.title}
                {station.current && (
                  <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-label font-normal text-muted-fg">
                    Now
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-meta text-muted-fg">{station.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </ContextPanel>
  );
}

type LoadState = "loading" | "error" | "loaded";

/**
 * Everything else waiting on the client. A visit to one document ends
 * with the way to the next, so nothing waits for the client to remember.
 */
export function OnYourDesk({ currentId, className }: { currentId: string; className?: string }) {
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setDocs(await listDocuments(MOCK_CLIENT_ORG.id));
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const others = docs.filter((d) => d.id !== currentId);
  const waiting = others.filter((d) => groupOf(d) === "you");
  const withAdvocate = others.filter((d) => groupOf(d) === "advocate").length;

  return (
    <ContextPanel
      title="Also on your desk"
      className={className}
      aside={
        <Link
          href="/documents"
          className="text-label text-ink underline-offset-2 hover:underline"
        >
          All documents
        </Link>
      }
    >
      {state === "loading" ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-control" />
          <Skeleton className="h-14 w-full rounded-control" />
        </div>
      ) : state === "error" ? (
        <p className="text-meta text-muted-fg">
          Could not load your other documents.{" "}
          <button
            type="button"
            onClick={load}
            className="text-ink underline underline-offset-2"
          >
            Try again
          </button>
        </p>
      ) : waiting.length === 0 ? (
        <p className="text-meta text-muted-fg">
          Nothing else is waiting on you.
          {withAdvocate > 0 &&
            ` ${withAdvocate} ${withAdvocate === 1 ? "document is" : "documents are"} with an advocate.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {waiting.map((d) => {
            const move = yourMove(d);
            return (
              <li key={d.id}>
                <Link
                  href={move?.href ?? `/documents/${d.id}`}
                  className="group flex items-center gap-3 rounded-control bg-paper px-4 py-3 transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[16px] text-ink">
                      {d.title}
                    </span>
                    {move && (
                      <span className="block truncate text-label text-muted-fg">
                        {move.note}
                      </span>
                    )}
                  </span>
                  <Icon
                    name="arrow_forward"
                    size={18}
                    className="text-muted-fg transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ContextPanel>
  );
}
