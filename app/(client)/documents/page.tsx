"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ErrorState } from "@/components/shared/error-state";
import { Icon } from "@/components/shared/icon";
import { LifecycleStepper, stageCaption } from "@/components/document/provenance";
import { DealPrompt } from "@/components/marketing/deal-prompt";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocuments } from "@/lib/api/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { groupOf, yourMove, type Move, type MoveGroup } from "@/lib/moves";
import type { ContractDocument } from "@/lib/types";
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
function since(doc: ContractDocument): string | null {
  const requests = doc.findings
    .map((f) => f.changeRequest?.requestedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const at =
    doc.status === "revision"
      ? requests[requests.length - 1]
      : doc.status === "settled" || doc.status === "executed"
        ? doc.settledAt
        : doc.claimedAt ?? doc.createdAt;
  return at ? format(new Date(at), "d MMM") : null;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      // Scoped in the data layer, not with a .filter() here.
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
      <div className="w-full">
        <div className="flex flex-col items-center pt-16">
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
    docs: ContractDocument[];
    empty: string;
    promise: string;
  }[] = [
    {
      key: "you",
      title: "Needs your action",
      docs: you,
      empty: "Nothing needs you.",
      promise:
        "Requests from an advocate, and execution steps after sign-off, appear here.",
    },
    {
      key: "advocate",
      title: "With the advocate",
      docs: byGroup("advocate"),
      empty: "No document is with an advocate right now.",
      promise:
        "Submit a draft and the advocate who claims it is named here, with the day they claimed it.",
    },
    {
      key: "done",
      title: "Settled and executed",
      docs: byGroup("done"),
      empty: "Nothing is settled and executed yet.",
      promise:
        "Settled documents stay here for good, with the sign-off, the execution proof and the full record.",
    },
  ];
  const empties = groups.filter((g) => g.docs.length === 0);

  return (
    <div className="w-full">
      {/* The greeting and the way in: the one display moment. */}
      <section className="flex flex-col items-center px-2 pb-16 pt-12 text-center md:pt-20">
        <h1 className="font-display text-[clamp(36px,4.6vw,60px)] font-medium leading-[1.05] tracking-[-0.02em] text-ink">
          {greeting()}, {MOCK_CLIENT_ORG.name.split(" ")[0]}
        </h1>
        <p className="mt-3 text-lead text-muted-fg">
          {you.length > 0
            ? `${you.length} ${you.length === 1 ? "document needs" : "documents need"} you today.`
            : docs.length === 0
              ? "Describe your first deal to begin."
              : "Nothing is waiting on you."}
        </p>
        <DealPrompt
          className="mt-10"
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
            <Section key={g.key} title={g.title} count={g.docs.length}>
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
                <EmptyGroup key={g.key} title={g.title} empty={g.empty} promise={g.promise} />
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
  empty,
  promise,
}: {
  title: string;
  empty: string;
  promise: string;
}) {
  return (
    <section className="flex flex-col rounded-card bg-parchment p-6 md:p-7">
      <h2 className="flex items-center gap-3 font-display text-h3 text-ink">
        {title}
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-paper px-2 font-sans text-label font-medium tabular-nums text-muted-fg">
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
function YourRecord({ docs }: { docs: ContractDocument[] }) {
  const screened = docs.filter((d) => d.status !== "draft" && d.status !== "analysing");
  const findings = screened.reduce((n, d) => n + d.findings.length, 0);
  const signedOff = docs.filter((d) => d.status === "settled" || d.status === "executed");
  const steps = docs.flatMap((d) => d.executionSteps.filter((s) => s.applicable));
  const stepsDone = steps.filter((s) => s.complete).length;
  const advocates = Array.from(
    new Set(docs.map((d) => d.advocate?.name).filter((n): n is string => Boolean(n))),
  );

  const figures: { label: string; value: number; note: string }[] = [
    {
      label: "Documents",
      value: docs.length,
      note: "Drafted from your briefs",
    },
    {
      label: "Findings raised",
      value: findings,
      note: `Across ${screened.length} screened ${screened.length === 1 ? "draft" : "drafts"}`,
    },
    {
      label: "Signed off",
      value: signedOff.length,
      note:
        signedOff.length > 0
          ? `By ${Array.from(new Set(signedOff.map((d) => d.advocate?.name).filter(Boolean))).join(", ")}`
          : "None yet",
    },
    {
      label: "Execution steps done",
      value: stepsDone,
      note: steps.length > 0 ? `Of ${steps.length} that apply` : "None apply yet",
    },
  ];

  return (
    <section
      aria-label="Your record"
      className="tile-grain grid gap-3 rounded-modal bg-parchment p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]"
    >
      <div className="flex flex-col justify-between gap-4 p-5 md:col-span-2 xl:col-span-1">
        <p className="text-label font-medium text-muted-fg">Your record</p>
        <div>
          <p className="font-display text-h2 text-ink">
            Every draft, finding and sign-off, kept.
          </p>
          {advocates.length > 0 && (
            <p className="mt-2 text-meta text-muted-fg">
              Advocates on your documents · {advocates.join(", ")}
            </p>
          )}
        </div>
      </div>
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex flex-col justify-between gap-6 rounded-card bg-paper p-6"
        >
          <p className="text-label font-medium text-muted-fg">{figure.label}</p>
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
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-3 font-display text-h2 text-ink">
        {title}
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-parchment px-2 font-sans text-meta font-medium tabular-nums text-ink">
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
function DocumentRow({ doc, move }: { doc: ContractDocument; move: Move | null }) {
  const date = since(doc);

  return (
    <li className="relative grid items-center gap-x-10 gap-y-5 rounded-card border border-line bg-paper px-6 py-6 transition-colors hover:border-ink/25 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)_12rem] lg:px-8">
      <div className="min-w-0">
        <Link
          href={`/documents/${doc.id}`}
          className="block truncate font-display text-[22px] font-medium leading-snug tracking-[-0.01em] text-ink after:absolute after:inset-0 after:content-['']"
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
              <span>Since {date}</span>
            </>
          )}
        </p>
        <p className={`mt-3 text-body ${move ? "text-ink" : "text-muted-fg"}`}>
          {move ? move.note : stageCaption(doc)}
        </p>
      </div>

      <LifecycleStepper doc={doc} />

      <div className="relative z-10 lg:justify-self-end">
        {move ? (
          <Button asChild size="lg" variant={doc.status === "revision" ? "default" : "outline"}>
            <Link href={move.href}>{move.action}</Link>
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-meta font-medium text-muted-fg">
            Open
            <Icon name="arrow_forward" size={18} />
          </span>
        )}
      </div>
    </li>
  );
}
