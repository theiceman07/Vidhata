"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StateLabel } from "@/components/document/state-label";
import { SeverityCounts, SeverityMark } from "@/components/document/severity";
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
import { tierLabel } from "@/lib/config/pricing";
import {
  blockedCitationCount,
  severityCounts,
  unsettledFindings,
} from "@/lib/findings";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import { PIPELINE_LAYERS, type ContractDocument } from "@/lib/types";

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
  // Which of the actionable documents "Up next" is showing.
  const [pick, setPick] = useState(0);

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

  const openFindings = buckets.open.flatMap((d) => unsettledFindings(d));
  const undecided = openFindings.length;
  const blockedSources = buckets.open.reduce((n, d) => n + blockedCitationCount(d), 0);
  const oldest = buckets.open.reduce(
    (max, d) => Math.max(max, differenceInCalendarDays(new Date(), new Date(d.createdAt))),
    0,
  );
  const firstName = CURRENT_ADVOCATE.name.split(" ")[0];

  // What the advocate can act on now, in queue order: work in hand,
  // then unclaimed work, then documents the client has answered. A
  // document waiting on the client is not a move for the advocate.
  const candidates = [...buckets.open]
    .filter((d) => d.status !== "revision" || clientAnswered(d))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        getQueuePriority(a) - getQueuePriority(b) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  const upNext = candidates.length > 0 ? candidates[pick % candidates.length] : null;

  function show(next: Filter) {
    setFilter(next);
    setQuery("");
    document.getElementById("queue-table")?.scrollIntoView({ block: "start" });
  }

  function actionFor(doc: ContractDocument, size: "sm" | "lg" = "sm") {
    if (doc.status === "pending_review") {
      return (
        <Button
          size={size}
          disabled={!available || claimingId === doc.id}
          onClick={() => claim(doc.id)}
        >
          {claimingId === doc.id ? "Claiming" : "Claim"}
        </Button>
      );
    }
    if (isSettled(doc)) {
      return (
        <Button asChild size={size} variant="ghost">
          <Link href={`/review/${doc.id}`}>Read</Link>
        </Button>
      );
    }
    return (
      <Button asChild size={size} variant={doc.status === "revision" ? "outline" : "default"}>
        <Link href={`/review/${doc.id}`}>
          {doc.status === "revision" ? "Open" : "Continue"}
        </Link>
      </Button>
    );
  }

  return (
    <div className="w-full">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <div className="min-w-0">
          <p className="text-meta text-muted-fg">
            {CURRENT_ADVOCATE.name}
            <span className="mx-1.5 text-muted-fg/50">·</span>
            <span className="font-mono">{CURRENT_ADVOCATE.bar}</span>
          </p>
          {/* The one display moment on this screen. */}
          <h1 className="mt-1 font-display text-h1 text-ink">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-2 text-lead text-muted-fg">
            {buckets.unclaimed.length > 0
              ? `${buckets.unclaimed.length} ${buckets.unclaimed.length === 1 ? "document is" : "documents are"} waiting for an advocate. The oldest open work has waited ${oldest} ${oldest === 1 ? "day" : "days"}.`
              : buckets.mine.length > 0
                ? `${buckets.mine.length} ${buckets.mine.length === 1 ? "review is" : "reviews are"} in your hands.`
                : "The queue is clear."}
          </p>
        </div>

        <Link
          href="/profile"
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            available
              ? "bg-parchment text-ink hover:bg-parchment/70"
              : "bg-caution/15 text-caution-fg hover:bg-caution/25",
          )}
        >
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", available ? "bg-verified" : "bg-caution")}
          />
          {available ? "Available for new claims" : "Unavailable for new claims"}
          <Icon name="chevron_right" size={18} className="text-muted-fg" />
        </Link>
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

      {/* The next move, in full, beside the shape of the whole queue. */}
      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <UpNext
          doc={upNext}
          position={candidates.length > 0 ? (pick % candidates.length) + 1 : 0}
          total={candidates.length}
          onSkip={() => setPick((p) => p + 1)}
          action={upNext ? actionFor(upNext, "lg") : null}
        />

        <dl className="grid grid-cols-2 gap-3">
          <Figure
            label="Open documents"
            value={buckets.open.length}
            note={buckets.open.length > 0 ? `Oldest ${oldest} ${oldest === 1 ? "day" : "days"}` : "Nothing open"}
            onSelect={() => show("open")}
          />
          <Figure
            label="Unclaimed"
            value={buckets.unclaimed.length}
            note="Senior and enhanced first"
            onSelect={() => show("unclaimed")}
          />
          <Figure
            label="Undecided findings"
            value={undecided}
            note={
              undecided > 0 ? (
                <SeverityCounts counts={severityCounts(openFindings)} />
              ) : (
                "Every finding decided"
              )
            }
            onSelect={() => show("open")}
          />
          <Figure
            label="Sources blocked"
            value={blockedSources}
            tone={blockedSources > 0 ? "flagged" : undefined}
            note={blockedSources > 0 ? "Each holds sign-off until withdrawn" : "Every source verified"}
            onSelect={() => show("blocked")}
          />
        </dl>
      </div>

      {/* The working table takes the full width; the reading of the
          queue sits beneath it in three even columns. */}
      <div id="queue-table" className="mt-12 min-w-0 scroll-mt-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
            <QueueRow key={doc.id} doc={doc} action={actionFor(doc)} />
          ))}
        </div>
      )}
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <YourDesk
          mine={buckets.mine}
          client={buckets.client}
          answered={buckets.open.filter(clientAnswered)}
          onShow={show}
        />
        <TierMix docs={buckets.open} />
        <SignedOffByYou docs={buckets.settled} onShow={() => show("settled")} />
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** A figure that is also the way to the rows behind it. */
function Figure({
  label,
  value,
  note,
  tone,
  onSelect,
}: {
  label: string;
  value: number;
  note: React.ReactNode;
  tone?: "flagged";
  onSelect: () => void;
}) {
  return (
    <div className="group relative flex flex-col justify-between gap-4 rounded-card bg-parchment px-6 py-5 transition-colors hover:bg-parchment/70">
      <dt className="flex items-center justify-between gap-2 text-meta text-muted-fg">
        <button
          type="button"
          onClick={onSelect}
          className="text-left after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
        >
          {label}
        </button>
        <Icon
          name="arrow_forward"
          size={18}
          className="text-muted-fg opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none"
        />
      </dt>
      <dd>
        <span
          className={cn(
            "block font-display text-h1 tabular-nums",
            tone === "flagged" ? "text-flagged" : "text-ink",
          )}
        >
          {value}
        </span>
        <span className="mt-1 block truncate text-label text-muted-fg">{note}</span>
      </dd>
    </div>
  );
}

/**
 * The next move, in full: the document the queue would put in front of
 * the advocate, what the first pass raised in it, and the one action
 * that moves it. The findings are shown with their clause and the check
 * that raised them; their sources are a click away inside the review.
 */
function UpNext({
  doc,
  position,
  total,
  onSkip,
  action,
}: {
  doc: ContractDocument | null;
  position: number;
  total: number;
  onSkip: () => void;
  action: React.ReactNode;
}) {
  if (!doc) {
    return (
      <section className="tile-grain flex flex-col justify-between gap-8 rounded-modal bg-parchment p-7 md:p-8">
        <p className="text-label font-medium text-muted-fg">Up next</p>
        <div>
          <p className="font-display text-h2 text-ink">Nothing needs you right now.</p>
          <p className="mt-2 max-w-lg text-meta text-muted-fg">
            Documents arrive once the first pass completes. Work waiting on a
            client comes back here when they answer.
          </p>
        </div>
      </section>
    );
  }

  const pending = unsettledFindings(doc);
  const blocked = blockedCitationCount(doc);
  const days = differenceInCalendarDays(new Date(), new Date(doc.createdAt));
  const shown = pending.slice(0, 3);
  const why =
    doc.status === "pending_review"
      ? `Unclaimed · ${tierLabel(doc.tier).toLowerCase()}`
      : clientAnswered(doc)
        ? "The client has answered"
        : "Claimed by you";

  return (
    <section
      aria-label="Up next"
      className="tile-grain flex flex-col gap-6 rounded-modal bg-parchment p-7 md:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label font-medium text-muted-fg">
          Up next
          <span className="mx-1.5 text-muted-fg/50">·</span>
          <span className="font-normal capitalize">{why}</span>
        </p>
        {total > 1 && (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-label text-ink transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="tabular-nums text-muted-fg">
              {position} of {total}
            </span>
            Next in line
            <Icon name="chevron_right" size={16} />
          </button>
        )}
      </div>

      <div className="min-w-0">
        <Link
          href={`/review/${doc.id}`}
          className="font-display text-h2 text-ink hover:underline"
        >
          {doc.title}
        </Link>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-fg">
          <span>
            {doc.clientName} and {doc.counterpartyName}
          </span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-muted-fg/40" />
          <span>Executed in {doc.stateOfExecution}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-muted-fg/40" />
          <span className="font-mono tabular-nums">
            Waiting {days} {days === 1 ? "day" : "days"}
          </span>
        </p>
      </div>

      {shown.length > 0 ? (
        <ul className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((finding) => (
            <li key={finding.findingId} className="min-w-0 rounded-card bg-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <SeverityMark severity={finding.severity} />
                <span className="font-mono text-label text-muted-fg">
                  {finding.clauseReference}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-meta text-ink">{finding.description}</p>
              <p className="mt-2 truncate text-label text-muted-fg">
                {PIPELINE_LAYERS[finding.layer].name}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-paper p-4 text-meta text-muted-fg">
          The first pass raised no findings. The review is a read of the text and the sign-off.
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          <span className="text-ink">
            {pending.length} undecided {pending.length === 1 ? "finding" : "findings"}
            {pending.length > shown.length && ` · ${pending.length - shown.length} more inside`}
          </span>
          {blocked > 0 && (
            <span className="inline-flex items-center gap-1 text-flagged">
              <Icon name="error" size={16} />
              {blocked} {blocked === 1 ? "source" : "sources"} blocked
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="lg">
            <Link href={`/review/${doc.id}`}>Preview</Link>
          </Button>
          {action}
        </div>
      </div>
    </section>
  );
}

function SidePanel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card bg-parchment p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-label font-medium text-muted-fg">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** The work in the advocate's hands, split by whose move it is. */
function YourDesk({
  mine,
  client,
  answered,
  onShow,
}: {
  mine: ContractDocument[];
  client: ContractDocument[];
  answered: ContractDocument[];
  onShow: (filter: Filter) => void;
}) {
  const lines: { label: string; value: number; note: string; filter: Filter }[] = [
    { label: "Reviews in hand", value: mine.length, note: "Claimed by you", filter: "mine" },
    {
      label: "Client answered",
      value: answered.length,
      note: "Ready for your decision",
      filter: "open",
    },
    {
      label: "Waiting on a client",
      value: client.length,
      note: "Back here when they answer",
      filter: "client",
    },
  ];

  return (
    <SidePanel title="Your desk">
      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line.label}>
            <button
              type="button"
              onClick={() => onShow(line.filter)}
              className="group flex w-full items-center gap-4 rounded-control bg-paper px-4 py-3 text-left transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="w-8 font-display text-h3 tabular-nums text-ink">{line.value}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-meta text-ink">{line.label}</span>
                <span className="block truncate text-label text-muted-fg">{line.note}</span>
              </span>
              <Icon
                name="chevron_right"
                size={18}
                className="text-muted-fg transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>
    </SidePanel>
  );
}

const TIERS: { tier: ContractDocument["tier"]; label: string }[] = [
  { tier: "senior", label: "Senior review" },
  { tier: "enhanced", label: "Enhanced" },
  { tier: "standard", label: "Standard" },
];

/**
 * Open work by tier, and the findings in it by severity: the shape of the
 * queue, read in a glance. Tier routing is what the queue orders by, so
 * the bars run in the order the work is offered.
 */
function TierMix({ docs }: { docs: ContractDocument[] }) {
  const counts = TIERS.map((t) => ({ ...t, n: docs.filter((d) => d.tier === t.tier).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  const findings = severityCounts(docs.flatMap((d) => unsettledFindings(d)));
  const severities: { key: keyof typeof findings; label: string; fill: string }[] = [
    { key: "high", label: "High", fill: "bg-flagged" },
    { key: "medium", label: "Medium", fill: "bg-caution" },
    { key: "low", label: "Low", fill: "bg-muted-fg/40" },
  ];
  const maxFinding = Math.max(1, findings.high, findings.medium, findings.low);

  return (
    <SidePanel title="Shape of the queue">
      <p className="text-label text-muted-fg">Open work by tier, in the order it is offered</p>
      <ul className="mt-3 space-y-2.5">
        {counts.map((c) => (
          <li key={c.tier} className="grid grid-cols-[6.5rem_minmax(0,1fr)_1.5rem] items-center gap-3">
            <span className="text-meta text-ink">{c.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-paper">
              <span
                className="block h-full rounded-full bg-ink"
                style={{ width: `${(c.n / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono text-meta tabular-nums text-ink">{c.n}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-label text-muted-fg">Undecided findings by severity</p>
      <ul className="mt-3 space-y-2.5">
        {severities.map((s) => (
          <li key={s.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_1.5rem] items-center gap-3">
            <SeverityMark severity={s.key} className="text-meta font-normal" />
            <span className="h-2 overflow-hidden rounded-full bg-paper">
              <span
                className={cn("block h-full rounded-full", s.fill)}
                style={{ width: `${(findings[s.key] / maxFinding) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono text-meta tabular-nums text-ink">
              {findings[s.key]}
            </span>
          </li>
        ))}
      </ul>
    </SidePanel>
  );
}

/** The advocate's own record: what they have signed off. */
function SignedOffByYou({ docs, onShow }: { docs: ContractDocument[]; onShow: () => void }) {
  const recent = [...docs]
    .sort((a, b) => new Date(b.settledAt ?? 0).getTime() - new Date(a.settledAt ?? 0).getTime())
    .slice(0, 3);

  return (
    <SidePanel
      title="Signed off by you"
      aside={
        docs.length > 0 ? (
          <button
            type="button"
            onClick={onShow}
            className="text-label text-ink underline-offset-2 hover:underline"
          >
            All {docs.length}
          </button>
        ) : null
      }
    >
      {recent.length === 0 ? (
        <p className="text-meta text-muted-fg">
          Nothing yet. Every document you sign off is kept here, with your
          enrolment number on the record.
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/review/${doc.id}`}
                className="flex items-center gap-3 rounded-control bg-paper px-4 py-3 transition-colors hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon name="check_circle" size={18} className="text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta text-ink">{doc.title}</span>
                  {doc.settledAt && (
                    <span className="block text-label text-muted-fg">
                      {format(new Date(doc.settledAt), "d MMM yyyy")}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SidePanel>
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
          className="line-clamp-2 font-display text-h3 text-ink hover:underline"
        >
          {doc.title}
        </Link>
        <p className="mt-0.5 truncate text-meta text-muted-fg">
          {doc.clientName}
          <span className="lg:hidden">
            <span className="mx-1.5 text-muted-fg/50">·</span>
            {tierLabel(doc.tier)}
            <span className="mx-1.5 text-muted-fg/50">·</span>
            waiting {days} {days === 1 ? "day" : "days"}
          </span>
        </p>
      </div>

      <div role="cell" className="hidden text-meta text-ink lg:block">
        {tierLabel(doc.tier)}
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
