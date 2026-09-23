"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StateLabel } from "@/components/document/state-label";
import { SeverityCounts } from "@/components/document/severity";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listDocuments, claimDocument, getQueuePriority } from "@/lib/api/documents";
import { getAdvocateProfile } from "@/lib/api/advocate";
import {
  blockedCitationCount,
  severityCounts,
  unsettledFindings,
} from "@/lib/findings";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";
type Filter = "open" | "mine" | "unclaimed" | "client" | "blocked" | "settled";
type Sort = "priority" | "oldest" | "findings";

/**
 * The review queue.
 *
 * A working table, not a list of headlines. Every row answers the same
 * questions in the same column, so an advocate can read down the page:
 * what is it, how much is left and how serious, does its evidence hold,
 * how long has it waited, who holds it, and what can I do about it now.
 *
 * Claiming is exclusive. The queue says so once, above the unclaimed
 * work, rather than leaving the button to imply it.
 */

function isSettled(doc: ContractDocument) {
  return doc.status === "settled" || doc.status === "executed";
}

function isMine(doc: ContractDocument) {
  return doc.advocate?.id === CURRENT_ADVOCATE.id;
}

/** Answered requests waiting on the advocate: the client has moved. */
function clientAnswered(doc: ContractDocument) {
  return doc.findings.some(
    (f) => f.disposition === "pending" && f.changeRequest?.response,
  );
}

/** The order an advocate should meet the work in when nothing else is set. */
function rank(doc: ContractDocument): number {
  if (isMine(doc) && doc.status === "under_review") return 0;
  if (doc.status === "pending_review") return 1;
  if (doc.status === "revision") return 2;
  return 3;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "All open" },
  { value: "mine", label: "Claimed by you" },
  { value: "unclaimed", label: "Unclaimed" },
  { value: "client", label: "With client" },
  { value: "blocked", label: "Source blocked" },
  { value: "settled", label: "Settled by you" },
];

// Proportional, so the table uses the whole width it is given.
const COLUMNS =
  "lg:grid-cols-[minmax(0,2.4fr)_minmax(5rem,0.6fr)_minmax(8rem,0.9fr)_minmax(8rem,0.9fr)_minmax(5rem,0.6fr)_minmax(12rem,1.3fr)_8rem]";

export default function QueuePage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [sort, setSort] = useState<Sort>("priority");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      // Unscoped on purpose: an advocate must see documents from every
      // client company, unlike the client queue.
      const [result, profile] = await Promise.all([listDocuments(), getAdvocateProfile()]);
      setDocs(result);
      setAvailable(profile.available);
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load the queue.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Another advocate's claimed work is theirs, and nothing still in the
  // first pass is reviewable yet.
  const visible = useMemo(
    () =>
      docs.filter((d) => {
        if (d.status === "draft" || d.status === "analysing") return false;
        if (d.advocate && !isMine(d)) return false;
        return true;
      }),
    [docs],
  );

  const buckets = useMemo(() => {
    const open = visible.filter((d) => !isSettled(d));
    const result: Record<Filter, ContractDocument[]> = {
      open,
      mine: open.filter((d) => isMine(d) && d.status === "under_review"),
      unclaimed: open.filter((d) => d.status === "pending_review"),
      client: open.filter((d) => d.status === "revision"),
      blocked: open.filter((d) => blockedCitationCount(d) > 0),
      settled: visible.filter(isSettled),
    };
    return result;
  }, [visible]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = buckets[filter].filter(
      (d) =>
        !q ||
        [d.title, d.clientName, d.counterpartyName].some((s) =>
          s.toLowerCase().includes(q),
        ),
    );
    const age = (d: ContractDocument) => new Date(d.createdAt).getTime();
    return [...matched].sort((a, b) => {
      if (sort === "oldest") return age(a) - age(b);
      if (sort === "findings") {
        return unsettledFindings(b).length - unsettledFindings(a).length;
      }
      // Priority: what is already in hand, then tier routing (which is
      // what backs the pricing page's priority turnaround), then age, so
      // nothing is starved.
      return (
        rank(a) - rank(b) ||
        getQueuePriority(a) - getQueuePriority(b) ||
        age(a) - age(b)
      );
    });
  }, [buckets, filter, query, sort]);

  async function claim(id: string) {
    setClaimingId(id);
    try {
      await claimDocument(id, CURRENT_ADVOCATE);
      router.push(`/review/${id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not claim this document.");
      setState("error");
    } finally {
      setClaimingId(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-10 w-72" />
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <Skeleton className="mt-10 h-11 w-full max-w-3xl rounded-full" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const undecided = buckets.open.reduce((n, d) => n + unsettledFindings(d).length, 0);
  const blockedSources = buckets.open.reduce((n, d) => n + blockedCitationCount(d), 0);

  return (
    <div className="w-full">
      <header>
        <p className="text-meta text-muted-fg">
          {CURRENT_ADVOCATE.name}
          <span className="mx-1.5 text-muted-fg/50">·</span>
          <span className="font-mono">{CURRENT_ADVOCATE.bar}</span>
        </p>
        {/* The one display moment on this screen. */}
        <h1 className="mt-1 font-display text-h1 text-ink">Review queue</h1>

        <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure label="Open documents" value={buckets.open.length} />
          <Figure label="Unclaimed" value={buckets.unclaimed.length} />
          <Figure label="Undecided findings" value={undecided} />
          <Figure
            label="Sources blocked"
            value={blockedSources}
            tone={blockedSources > 0 ? "flagged" : undefined}
          />
        </dl>
      </header>

      {!available && (
        <p className="mt-6 border-l-2 border-caution pl-3 text-meta text-ink">
          You are marked unavailable, so you cannot claim new documents.{" "}
          <Link href="/profile" className="text-accent underline underline-offset-2">
            Change this in your profile
          </Link>
          .
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="Filter the queue" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-meta transition-colors",
                "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent",
                filter === f.value
                  ? "bg-ink text-paper"
                  : "text-muted-fg hover:bg-parchment hover:text-ink",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "font-mono text-label tabular-nums",
                  filter === f.value ? "text-paper/70" : "text-muted-fg",
                )}
              >
                {buckets[f.value].length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <label className="relative flex min-w-[14rem] flex-1 items-center sm:max-w-md">
            <span className="sr-only">Search the queue</span>
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute left-4 text-muted-fg"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by document or party"
              className="h-11 w-full rounded-full border border-line bg-paper pl-11 pr-4 text-meta text-ink placeholder:text-muted-fg focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
            />
          </label>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="h-11 w-[12rem] rounded-full px-4 text-meta" aria-label="Sort the queue">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Sort: priority</SelectItem>
              <SelectItem value="oldest">Sort: oldest first</SelectItem>
              <SelectItem value="findings">Sort: most findings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filter === "unclaimed" && rows.length > 0 && (
        <p className="mt-4 text-meta text-muted-fg">
          Claiming assigns a document to you alone. Senior and enhanced tier
          work is offered first, then the longest waiting.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-6 max-w-xl">
          <EmptyState {...emptyCopy(filter, query)} />
        </div>
      ) : (
        <div role="table" aria-label="Documents" className="mt-6 space-y-2">
          <div
            role="row"
            className={cn(
              "hidden gap-x-6 px-6 pb-1 text-label text-muted-fg lg:grid",
              COLUMNS,
            )}
          >
            <span role="columnheader">Document</span>
            <span role="columnheader">Tier</span>
            <span role="columnheader">Undecided</span>
            <span role="columnheader">Sources</span>
            <span role="columnheader">Waiting</span>
            <span role="columnheader">State</span>
            <span role="columnheader" className="text-right">
              Action
            </span>
          </div>

          {rows.map((doc) => (
            <QueueRow
              key={doc.id}
              doc={doc}
              action={
                doc.status === "pending_review" ? (
                  <Button
                    size="sm"
                    disabled={!available || claimingId === doc.id}
                    onClick={() => claim(doc.id)}
                  >
                    {claimingId === doc.id ? "Claiming" : "Claim"}
                  </Button>
                ) : isSettled(doc) ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/review/${doc.id}`}>Read</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    variant={doc.status === "revision" ? "outline" : "default"}
                  >
                    <Link href={`/review/${doc.id}`}>
                      {doc.status === "revision" ? "Open" : "Continue"}
                    </Link>
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "flagged";
}) {
  return (
    <div className="rounded-card bg-parchment px-6 py-5">
      <dt className="text-meta text-muted-fg">{label}</dt>
      <dd
        className={cn(
          "mt-2 font-display text-h1 tabular-nums",
          tone === "flagged" ? "text-flagged" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function emptyCopy(filter: Filter, query: string): { title: string; description: string } {
  if (query.trim()) {
    return {
      title: `Nothing matches “${query.trim()}”.`,
      description: "Search looks at the document title and both parties.",
    };
  }
  switch (filter) {
    case "mine":
      return {
        title: "Nothing is claimed by you.",
        description: "Claim a document from the unclaimed list to start a review.",
      };
    case "unclaimed":
      return {
        title: "The desk is clear.",
        description: "Documents arrive here once the first pass completes.",
      };
    case "client":
      return {
        title: "Nothing is waiting on a client.",
        description:
          "When you request a change, the document waits here until the client answers.",
      };
    case "blocked":
      return {
        title: "No blocked sources.",
        description:
          "Every citation in open work has been verified against the corpus, or withdrawn.",
      };
    case "settled":
      return {
        title: "You have not signed anything off yet.",
        description: "Documents you sign off are kept here as a record.",
      };
    default:
      return {
        title: "Nothing is awaiting review.",
        description: "Documents arrive here once the first pass completes.",
      };
  }
}

function QueueRow({ doc, action }: { doc: ContractDocument; action: React.ReactNode }) {
  const pending = unsettledFindings(doc);
  const blocked = blockedCitationCount(doc);
  const days = differenceInCalendarDays(new Date(), new Date(doc.createdAt));
  const answered = clientAnswered(doc);
  // Only said when it adds to the state label beside it.
  const holder = !doc.advocate
    ? null
    : doc.status === "revision"
      ? "Waiting on the client"
      : isSettled(doc)
        ? "Signed off by you"
        : answered
          ? "Client answered"
          : "Claimed by you";

  return (
    <div
      role="row"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 rounded-card bg-parchment/50 px-6 py-5 transition-colors hover:bg-parchment lg:items-center",
        COLUMNS,
      )}
    >
      <div role="cell" className="min-w-0">
        <Link
          href={`/review/${doc.id}`}
          className="block truncate font-display text-h3 text-ink hover:underline"
        >
          {doc.title}
        </Link>
        <p className="mt-0.5 truncate text-meta text-muted-fg">
          {doc.clientName}
          <span className="lg:hidden">
            <span className="mx-1.5 text-muted-fg/50">·</span>
            <span className="capitalize">{doc.tier}</span>
            <span className="mx-1.5 text-muted-fg/50">·</span>
            waiting {days} {days === 1 ? "day" : "days"}
          </span>
        </p>
      </div>

      <div role="cell" className="hidden text-meta capitalize text-ink lg:block">
        {doc.tier}
      </div>

      <div role="cell" className="col-span-2 flex items-center gap-3 lg:col-span-1">
        {pending.length > 0 ? (
          <SeverityCounts counts={severityCounts(pending)} />
        ) : (
          <span className="text-label text-muted-fg">None</span>
        )}
        {blocked > 0 && (
          <span className="text-label text-flagged lg:hidden">{blocked} source blocked</span>
        )}
      </div>

      <div role="cell" className="hidden text-label lg:block">
        {blocked > 0 ? (
          <span className="inline-flex items-center gap-1 text-flagged">
            <Icon name="error" size={16} />
            {blocked} blocked
          </span>
        ) : doc.findings.length > 0 ? (
          <span className="text-muted-fg">None blocked</span>
        ) : (
          <span className="text-muted-fg">None cited</span>
        )}
      </div>

      <div role="cell" className="hidden font-mono text-meta tabular-nums text-ink lg:block">
        {days} {days === 1 ? "day" : "days"}
      </div>

      <div role="cell" className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 lg:col-span-1">
        <StateLabel state={doc.status} />
        {holder && (
          <span className={cn("text-label", answered ? "text-ink" : "text-muted-fg")}>
            {holder}
          </span>
        )}
      </div>

      <div role="cell" className="col-start-2 row-start-1 justify-self-end lg:col-auto lg:row-auto">
        {action}
      </div>
    </div>
  );
}
