"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Icon } from "@/components/shared/icon";
import { CalmDisclosure, useCalm } from "@/components/domain/calm";
import { Skeleton } from "@/components/ui/skeleton";
import { listClientDocuments } from "@/lib/api/client/documents";
import { tierLabel } from "@/lib/config/pricing";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { groupOf, yourMove } from "@/lib/moves";
import { termLabel } from "@/lib/term";
import type { ClientDocument, ClientDocumentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The context a document sits in, for the panels beside it: the deal as
 * the client described it, the advocate answerable for it, what happens
 * after the current move, and what else is waiting on the client.
 *
 * Every panel is a sand sheet with a small label; space and tint divide
 * them, never rules. Secondary panels are collapsible.
 */

export function ContextPanel({
  title,
  aside,
  children,
  className,
  compact = false,
  collapsible = false,
  hint,
}: {
  title: string;
  /** A small note or link set against the title. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Less padding and a shorter gap under the title, for panels whose content is short. */
  compact?: boolean;
  /**
   * Secondary detail: closed until opened, with the title as the toggle. A
   * native details element, so it works without script and by keyboard.
   */
  collapsible?: boolean;
  /** What is inside, said beside the toggle while it is closed. */
  hint?: string;
}) {
  const pad = compact ? "p-4 md:p-5" : "p-5 md:p-6";
  const calm = useCalm();

  // Calm: no card. A rule above, equal padding, the title as a small label.
  const labelClass =
    "text-label font-semibold uppercase leading-4 tracking-[0.08em] text-calm-secondary";

  if (calm && collapsible) {
    return (
      <CalmDisclosure
        id={`panel-${title.replace(/\W+/g, "-").toLowerCase()}`}
        className={cn("border-t border-calm-border first:border-t-0", className)}
        buttonClassName="flex w-full cursor-pointer items-center justify-between gap-3 rounded-calm-control py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-calm-focus"
        header={(open) => (
          <>
            <span role="heading" aria-level={2} className={labelClass}>
              {title}
            </span>
            <span className="flex items-center gap-2 text-meta text-calm-secondary">
              {hint && !open && <span>{hint}</span>}
              <Icon
                name="expand_more"
                size={16}
                className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")}
              />
            </span>
          </>
        )}
      >
        <div className="pb-4">{children}</div>
      </CalmDisclosure>
    );
  }

  if (calm) {
    return (
      <section className={cn("border-t border-calm-border py-4 first:border-t-0 first:pt-0", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={labelClass}>{title}</h2>
          {aside}
        </div>
        <div className="mt-3">{children}</div>
      </section>
    );
  }

  if (collapsible) {
    return (
      <details className={cn("group rounded-card bg-sand", className)}>
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-3 rounded-card [&::-webkit-details-marker]:hidden",
            pad,
          )}
        >
          <h2 className="text-h3 text-ink">{title}</h2>
          <span className="flex items-center gap-2 text-label text-muted">
            {hint && <span className="group-open:hidden">{hint}</span>}
            <Icon
              name="expand_more"
              size={20}
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </span>
        </summary>
        <div className={cn("px-4 pb-4 md:px-5 md:pb-5", compact && "pt-0")}>{children}</div>
      </details>
    );
  }

  return (
    <section className={cn("rounded-card bg-sand", pad, className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 text-ink">{title}</h2>
        {aside}
      </div>
      <div className={compact ? "mt-3" : "mt-4"}>{children}</div>
    </section>
  );
}

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** The deal as the client stated it at intake. Nothing here is inferred. */
export function DealOnFile({
  doc,
  className,
  compact = false,
  collapsible = false,
}: {
  doc: Pick<ClientDocument, "deal" | "tier">;
  className?: string;
  compact?: boolean;
  collapsible?: boolean;
}) {
  const { deal } = doc;
  const calm = useCalm();
  const rows: [string, React.ReactNode][] = [
    ["Parties", `${deal.clientName} · ${deal.counterpartyName}`],
    ["Executed in", deal.stateOfExecution],
    ["Governing law", deal.governingLaw],
  ];
  if (deal.transactionValue > 0) rows.push(["Value", rupees.format(deal.transactionValue)]);
  rows.push(["Term", termLabel(deal.durationMonths)]);
  if (deal.counterpartyIsMsme) rows.push(["Counterparty", "Registered MSME"]);
  rows.push(["Review", tierLabel(doc.tier)]);

  return (
    <ContextPanel
      title="The deal on file"
      className={className}
      compact={compact}
      collapsible={collapsible}
      hint="Parties, law, term"
    >
      <dl
        className={
          calm
            ? "grid gap-x-6 gap-y-2.5"
            : "grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {rows.map(([term, value]) => (
          <div
            key={term}
            className={cn(
              "min-w-0",
              !calm && term === "Parties" && "sm:col-span-2 xl:col-span-4",
            )}
          >
            <dt className={calm ? "text-meta text-calm-secondary" : "text-label text-muted-fg"}>{term}</dt>
            <dd
              className={cn(
                "mt-0.5 font-medium",
                calm ? "text-meta leading-5 text-calm-ink" : "text-body text-ink",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {deal.keyTerms && (
        <div
          className={cn(
            "mt-3",
            calm ? "rounded-calm-control border border-calm-border bg-calm-surface px-3 py-2.5" : "rounded-control bg-surface px-4 py-3",
          )}
        >
          <p className={calm ? "text-meta text-calm-secondary" : "text-meta text-muted-fg"}>
            Key terms, as you stated them
          </p>
          <p className={cn("mt-1 font-medium", calm ? "text-meta leading-5 text-calm-ink" : "text-body text-ink")}>
            {deal.keyTerms}
          </p>
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

/**
 * Who is answerable for this document.
 *
 * Named only by the sign-off record. Before it, a client is told that an
 * advocate holds the document and since when, and that the name and enrolment
 * number come with the sign-off: who holds a document is not for a client to
 * know before an advocate has put their name to it.
 */
export function AdvocatePanel({
  doc,
  className,
}: {
  doc: Pick<ClientDocument, "claimedAt" | "signOff">;
  className?: string;
}) {
  const { signOff } = doc;
  const calm = useCalm();
  const body = calm ? "text-meta leading-5 text-calm-ink" : "text-meta text-ink";
  const note = calm ? "text-meta leading-5 text-calm-secondary" : "text-label text-muted-fg";
  const rows = calm
    ? "mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-meta leading-5"
    : "mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-meta";

  return (
    <ContextPanel title="Your advocate" className={className}>
      {signOff ? (
        <>
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface font-display text-body text-ink"
            >
              {initials(signOff.advocate)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-ink">{signOff.advocate}</p>
              <p className="text-meta text-muted-fg">
                Empanelled advocate · <span className="font-mono">{signOff.enrolment}</span>
              </p>
            </div>
          </div>
          <dl className={rows}>
            {doc.claimedAt && (
              <>
                <dt className={calm ? "text-calm-secondary" : "text-muted-fg"}>Claimed</dt>
                <dd className={calm ? "text-calm-ink" : "text-ink"}>{format(new Date(doc.claimedAt), "d MMM yyyy")}</dd>
              </>
            )}
            <dt className={calm ? "text-calm-secondary" : "text-muted-fg"}>Signed off</dt>
            <dd className={calm ? "text-calm-ink" : "text-ink"}>{format(new Date(signOff.at), "d MMM yyyy")}</dd>
          </dl>
        </>
      ) : doc.claimedAt ? (
        <>
          <p className={body}>
            An empanelled advocate has claimed this document and holds it alone until sign-off.
          </p>
          <dl className={rows}>
            <dt className={calm ? "text-calm-secondary" : "text-muted-fg"}>Claimed</dt>
            <dd className={calm ? "text-calm-ink" : "text-ink"}>{format(new Date(doc.claimedAt), "d MMM yyyy")}</dd>
          </dl>
          <p className={cn("mt-3", note)}>
            Their name and enrolment number are recorded with the sign-off.
          </p>
        </>
      ) : (
        <p className={note}>
          No advocate has claimed this document yet. The advocate who does holds it alone,
          and is named with their enrolment number when they sign it off.
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

function stationsFor(doc: ClientDocument): Station[] {
  const checklist: Station = {
    title: "Execution checklist",
    body: `Stamping, registration and e-signature for ${doc.deal.stateOfExecution}, set out step by step, with a place to keep the proof.`,
    current: false,
  };
  const signOff: Station = {
    title: "Sign-off",
    body: "The advocate records the sign-off. Only then do you read the settled document, and its agent can explain any clause.",
    current: false,
  };

  if (doc.status === "revision") {
    const n = doc.findingList.filter((f) => f.request && !f.request.response).length;
    return [
      {
        title: "You answer",
        body: `${n} ${n === 1 ? "request" : "requests"} from your advocate. Your answers go back together.`,
        current: true,
      },
      {
        title: "Your advocate settles each finding",
        body: `Your answer is weighed against the finding it concerns, and the document becomes Draft ${doc.version + 1}.`,
        current: false,
      },
      signOff,
      checklist,
    ];
  }

  if (doc.status === "awaiting_payment") {
    return [
      {
        title: "You pay the fee",
        body: "One fixed fee for the tier screening assigned. Nothing reaches an advocate until it is paid.",
        current: true,
      },
      {
        title: "An advocate claims it",
        body: "Once paid it is in the queue. The advocate who claims it holds it alone until sign-off.",
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
      title: "An advocate reviews the findings",
      body: "Each finding from the first pass is settled with its source. If an answer is needed from you, it appears on your documents.",
      current: true,
    },
    signOff,
    checklist,
  ];
}

/** What follows the move in hand, so the client knows when to come back. */
export function WhatHappensNext({
  doc,
  className,
  compact = false,
  wide = false,
  footer,
  collapsible = false,
}: {
  doc: ClientDocument;
  className?: string;
  compact?: boolean;
  /** Steps run left to right in one row at lg and up, for a panel the full width of the page. */
  wide?: boolean;
  /** Further context set under the steps, inside the same panel. */
  footer?: React.ReactNode;
  collapsible?: boolean;
}) {
  const stations = stationsFor(doc);
  const calm = useCalm();

  if (calm) {
    // One connected track. The heading is kept for assistive technology only:
    // the status strip above already says "What happens next" once, in view.
    return (
      <section aria-labelledby="next-steps-title" className={className}>
        <h2 id="next-steps-title" className="sr-only">
          What happens next
        </h2>
        <ol
          className="grid gap-y-5 min-[600px]:grid-cols-[repeat(var(--steps),minmax(0,1fr))] min-[600px]:gap-x-6"
          style={{ "--steps": stations.length } as React.CSSProperties}
        >
          {stations.map((station, i) => (
            <li
              key={station.title}
              className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 min-[600px]:block"
            >
              {i < stations.length - 1 && (
                <>
                  <span
                    aria-hidden
                    className="absolute bottom-[-20px] left-[11.5px] top-8 w-px bg-calm-border-strong min-[600px]:hidden"
                  />
                  <span
                    aria-hidden
                    className="absolute left-9 right-[-12px] top-[11.5px] hidden h-px bg-calm-border-strong min-[600px]:block"
                  />
                </>
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-label font-semibold tabular-nums",
                  station.current
                    ? "bg-calm-strong text-white"
                    : "bg-calm-canvas text-calm-secondary ring-1 ring-inset ring-calm-border-strong",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 min-[600px]:mt-3">
                <p
                  className={cn(
                    "flex flex-wrap items-center gap-x-2 gap-y-1 text-meta font-medium leading-6",
                    station.current ? "text-calm-strong" : "text-calm-ink",
                  )}
                >
                  {station.title}
                  {station.current && (
                    <span className="rounded-calm-badge bg-calm-warning-muted px-1.5 py-px text-label font-semibold leading-4 text-calm-warning">
                      Now
                    </span>
                  )}
                </p>
                <p className="mt-1 max-w-[30ch] text-meta leading-[1.5] text-calm-secondary">
                  {station.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {footer}
      </section>
    );
  }

  return (
    <ContextPanel
      title="What happens next"
      className={className}
      compact={compact}
      collapsible={collapsible}
      hint="All the steps"
    >
      <ol className={cn(wide && "lg:grid lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:gap-x-5")}>
        {stations.map((station, i) => (
          <li
            key={station.title}
            className={cn(
              "relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3.5 last:pb-0",
              compact ? "pb-3.5" : "pb-4",
              wide && "lg:grid-cols-1 lg:content-start lg:gap-y-3 lg:pb-0",
            )}
          >
            {i < stations.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-0.5 left-[11px] top-8 w-0.5 rounded-full bg-line",
                  wide && "lg:bottom-auto lg:left-8 lg:right-2 lg:top-[11px] lg:h-0.5 lg:w-auto",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full font-mono text-label",
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
                  <span className="ml-2 rounded-full bg-progress-tint px-2 py-0.5 text-label font-normal text-progress">
                    Now
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-meta leading-[1.45] text-muted-fg">{station.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {footer}
    </ContextPanel>
  );
}

type LoadState = "loading" | "error" | "loaded";

/**
 * Everything else waiting on the client. A visit to one document ends
 * with the way to the next, so nothing waits for the client to remember.
 */
export function OnYourDesk({ currentId, className }: { currentId: string; className?: string }) {
  const [docs, setDocs] = useState<ClientDocumentSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setDocs(await listClientDocuments(MOCK_CLIENT_ORG.id));
      setState("loaded");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const calm = useCalm();
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
          className="link text-label"
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
            className="link"
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
        <ul className="space-y-1">
          {waiting.map((d) => {
            const move = yourMove(d);
            return (
              <li key={d.id}>
                <Link
                  href={move?.href ?? `/documents/${d.id}`}
                  className={cn(
                    "group flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2",
                    calm
                      ? "-mx-2 rounded-calm-control px-2 py-1.5 hover:bg-calm-muted focus-visible:ring-calm-focus"
                      : "rounded-control px-3 py-2 hover:bg-surface focus-visible:ring-accent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium", calm ? "text-meta text-calm-ink" : "text-meta text-ink")}>
                      {d.title}
                    </span>
                    {move && (
                      <span className={cn("block truncate", calm ? "text-meta text-calm-secondary" : "text-label text-muted-fg")}>
                        {move.note}
                      </span>
                    )}
                  </span>
                  <Icon
                    name="arrow_forward"
                    size={calm ? 16 : 18}
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
