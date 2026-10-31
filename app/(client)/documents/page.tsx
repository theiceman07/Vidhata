"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { LifecycleStepper } from "@/components/document/provenance";
import { StateLabel } from "@/components/document/state-label";
import { DealPrompt } from "@/components/marketing/deal-prompt";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listClientDocuments } from "@/lib/api/client/documents";
import { MOCK_CLIENT_ORG, MOCK_CLIENT_PERSON } from "@/lib/mock/client.mock";
import { findingsNote } from "@/lib/screeningNote";
import { groupOf, yourMove, type Move, type MoveGroup } from "@/lib/moves";
import { TONE, type Tone } from "@/lib/tone";
import type { ClientDocumentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "error" | "loaded";

/**
 * The client's home.
 *
 * A greeting and a prompt first, because the most common reason to be
 * here is to start the next document. Below it, every document grouped
 * by whose move it is: waiting on you, with an advocate, done. Each row
 * says where the document is in its life and, when the move is yours,
 * exactly what the move is.
 */

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** When the document entered the stage it is in. */
function since(doc: ClientDocumentSummary): string | null {
  const at =
    doc.status === "revision"
      ? doc.latestRequestAt
      : doc.signOff
        ? doc.signOff.at
        : doc.claimedAt ?? doc.createdAt;
  return at ? format(new Date(at), "d MMM") : null;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<ClientDocumentSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      // Scoped in the data layer, not with a .filter() here.
      const result = await listClientDocuments(MOCK_CLIENT_ORG.id);
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
      <div className="w-full">
        <div className="flex flex-col items-center pt-24">
          <Skeleton className="h-12 w-[28rem] max-w-full rounded-full" />
          <Skeleton className="mt-8 h-32 w-full max-w-2xl rounded-modal" />
        </div>
        <div className="mt-20 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const byGroup = (g: MoveGroup) => docs.filter((d) => groupOf(d) === g);
  const you = byGroup("you");

  const groups: {
    key: MoveGroup;
    title: string;
    tone: Tone;
    docs: ClientDocumentSummary[];
    empty: string;
    promise: string;
  }[] = [
    {
      key: "you",
      title: "Needs you",
      tone: "move",
      docs: you,
      empty: "Nothing needs you right now.",
      promise:
        "When your advocate asks you something, or a step is left after sign-off, it shows up here.",
    },
    {
      key: "advocate",
      title: "With the advocate",
      tone: "progress",
      docs: byGroup("advocate"),
      empty: "No document is with an advocate right now.",
      promise:
        "After you submit a draft, it waits here while an advocate reviews it.",
    },
    {
      key: "done",
      title: "Settled and executed",
      tone: "done",
      docs: byGroup("done"),
      empty: "Nothing is settled and executed yet.",
      promise:
        "Once an advocate signs a document off, it stays here with its full record.",
    },
  ];
  const empties = groups.filter((g) => g.docs.length === 0);

  return (
    <div className="w-full">
      {/* The greeting and the way in: the one display moment. */}
      <section className="flex flex-col items-center px-2 pb-10 pt-8 text-center md:pt-14">
        {/* The one page that is not a PageHeader: a greeting and a prompt, centred. */}
        <h1 className="font-display text-h1 text-ink">
          {greeting()}, {MOCK_CLIENT_PERSON.name.split(" ")[0]}
        </h1>
        <DealPrompt
          className="mt-6 max-w-2xl"
          compact
          destination="draft"
          restore
          placeholder="Describe a new deal: who it is with, what it covers, where it will be signed"
          note="Drafted, screened, then signed off by an advocate"
        />
      </section>

      {/* Groups with documents in them take the full width. Empty ones
          collapse into a row of small cards that say what will arrive
          there, rather than a stack of full-width bars saying nothing. */}
      <div className="space-y-14 pb-10">
        {groups
          .filter((g) => g.docs.length > 0)
          .map((g) => (
            <Section key={g.key} title={g.title} tone={g.tone} count={g.docs.length}>
              {g.docs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  move={g.key === "you" ? yourMove(doc) : null}
                />
              ))}
            </Section>
          ))}

        {empties.length > 0 && (
          <div
            className={cn(
              "grid gap-4",
              empties.length === 2 && "md:grid-cols-2",
              empties.length === 3 && "md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {empties.map((g) => (
                <EmptyGroup key={g.key} title={g.title} tone={g.tone} empty={g.empty} promise={g.promise} />
              ))}
          </div>
        )}

        {docs.length > 0 && <YourRecord docs={docs} />}
      </div>
    </div>
  );
}

/** A group with nothing in it: what it holds, and what will arrive. */
function EmptyGroup({
  title,
  tone,
  empty,
  promise,
}: {
  title: string;
  tone: Tone;
  empty: string;
  promise: string;
}) {
  return (
    <section className="flex flex-col rounded-card bg-sand p-6 md:p-7">
      <h2 className="flex items-center gap-3 font-display text-h3 text-ink">
        {title}
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 pt-px font-sans text-label font-medium leading-none",
            TONE[tone].chip,
          )}
        >
          0
        </span>
      </h2>
      <p className="mt-2 text-meta text-ink">{empty}</p>
      <p className="mt-auto pt-5 text-meta text-muted-fg">{promise}</p>
    </section>
  );
}

/**
 * Everything Vidhata has done for this organisation, counted from the
 * documents themselves. Nothing here is estimated.
 */
function YourRecord({ docs }: { docs: ClientDocumentSummary[] }) {
  const screened = docs.filter((d) => d.status !== "draft" && d.status !== "analysing");
  // What the first passes raised. Findings an advocate added are not counted:
  // before sign-off they reach the client only through a request.
  const findings = screened.reduce((n, d) => n + d.findingCount, 0);
  const signedOff = docs.filter((d) => d.signOff !== null);
  const stepsInAll = docs.reduce((n, d) => n + d.checklist.total, 0);
  const stepsDone = docs.reduce((n, d) => n + d.checklist.done, 0);
  // Named by their sign-offs and by nothing else: before one, a client is told
  // "an advocate".
  const advocates = Array.from(
    new Set(signedOff.map((d) => d.signOff?.advocate).filter((n): n is string => Boolean(n))),
  );

  const figures: { label: string; value: number; note: string; dot: string }[] = [
    {
      label: "Documents",
      dot: "bg-brand",
      value: docs.length,
      note: "Drafted from your briefs",
    },
    {
      label: "Findings raised",
      dot: "bg-blocked",
      value: findings,
      note: findingsNote(screened.length),
    },
    {
      label: "Signed off",
      dot: "bg-done",
      value: signedOff.length,
      note:
        signedOff.length > 0
          ? `By ${advocates.join(", ")}`
          : "None yet",
    },
    {
      label: "Execution steps done",
      dot: "bg-progress",
      value: stepsDone,
      note: stepsInAll > 0 ? `Of ${stepsInAll} that apply` : "None apply yet",
    },
  ];

  return (
    <section
      aria-label="Your record"
      className="grid gap-3 rounded-modal bg-sand p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]"
    >
      <div className="flex flex-col justify-between gap-4 p-5 md:col-span-2 xl:col-span-1">
        <p className="text-label font-medium text-muted-fg">Your record</p>
        <div>
          <p className="font-display text-h2 text-ink">
            Every draft, finding and sign-off, kept.
          </p>
          {advocates.length > 0 && (
            <p className="mt-2 text-meta text-muted-fg">
              Signed off by · {advocates.join(", ")}
            </p>
          )}
        </div>
      </div>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex flex-col justify-between gap-6 rounded-card border border-line bg-surface p-6"
        >
          <p className="flex items-center gap-2 text-label font-medium text-muted-fg">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", figure.dot)} />
            {figure.label}
          </p>
          <div>
            <p className="font-display text-h1 tabular-nums text-ink">{figure.value}</p>
            <p className="mt-1 truncate text-meta text-muted-fg">{figure.note}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Section({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: Tone;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-3 font-display text-h2 text-ink">
        {title}
        <span
          className={cn(
            "inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 pt-px font-sans text-meta font-medium leading-none",
            TONE[tone].chip,
          )}
        >
          {count}
        </span>
      </h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </section>
  );
}

/**
 * One document, one row: what it is, where it is in its life, and the
 * move if it is yours. The whole row opens the document; the action goes
 * straight to where the move is made.
 */
function DocumentRow({ doc, move }: { doc: ClientDocumentSummary; move: Move | null }) {
  const date = since(doc);

  return (
    <li className={cn("relative grid items-center gap-x-10 gap-y-5 rounded-card bg-surface px-6 py-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_12rem] 2xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)_12rem]")}>
      <div className="min-w-0">
        {doc.status === "settled" && doc.checklist.done < doc.checklist.total ? (
          <span className="mb-2 inline-flex h-6 items-center gap-1.5 rounded-full bg-move pl-2 pr-3 text-label font-medium leading-none text-white">
            <Icon name="schedule" size={16} filled />
            Execution pending
          </span>
        ) : doc.status === "settled" ? null : (
          <StateLabel state={doc.status} className="mb-2" />
        )}
        <Link
          href={`/documents/${doc.id}`}
          className="block truncate font-display text-h3 font-medium leading-snug tracking-[-0.01em] text-ink after:absolute after:inset-0 after:content-['']"
        >
          {doc.title}
        </Link>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-meta text-muted-fg">
          <span>{doc.counterpartyName}</span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-line" />
          <span>Draft {doc.version}</span>
          {date && (
            <>
              <span aria-hidden className="h-1 w-1 rounded-full bg-line" />
              <span>{doc.signOff ? `Signed off ${date}` : `Since ${date}`}</span>
            </>
          )}
        </p>
        {move && doc.status !== "settled" && <p className="mt-3 text-body text-ink">{move.note}</p>}
      </div>

      <div className="rounded-control bg-sand px-5 py-4 xl:col-span-2 2xl:col-span-1">
        <LifecycleStepper doc={doc} />
      </div>

      <div className="relative z-10 xl:col-start-2 xl:row-start-1 xl:justify-self-end 2xl:col-start-auto 2xl:row-start-auto">
        {move ? (
          <Button asChild size="lg" variant="primary">
            <Link href={move.href}>{move.action}</Link>
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-meta font-medium text-brand">
            Open
            <Icon name="arrow_forward" size={18} />
          </span>
        )}
      </div>
    </li>
  );
}
