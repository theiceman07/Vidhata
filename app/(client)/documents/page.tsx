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
import type { ContractDocument } from "@/lib/types";

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

function openRequests(doc: ContractDocument) {
  return doc.findings.filter(
    (f) => f.disposition === "pending" && f.changeRequest && !f.changeRequest.response,
  );
}

function outstandingSteps(doc: ContractDocument) {
  return doc.executionSteps.filter((s) => s.applicable && !s.complete);
}

type Group = "you" | "advocate" | "done";

function groupOf(doc: ContractDocument): Group {
  if (doc.status === "revision" || doc.status === "draft") return "you";
  if (doc.status === "settled" && outstandingSteps(doc).length > 0) return "you";
  if (doc.status === "settled" || doc.status === "executed") return "done";
  return "advocate";
}

interface Move {
  note: string;
  action: string;
  href: string;
}

/** The move, when it is the client's. */
function yourMove(doc: ContractDocument): Move | null {
  if (doc.status === "revision") {
    const n = openRequests(doc).length;
    const by = doc.advocate?.name ?? "your advocate";
    return {
      note: `${n} ${n === 1 ? "request" : "requests"} from ${by} to answer`,
      action: "Respond",
      href: `/documents/${doc.id}`,
    };
  }
  if (doc.status === "draft") {
    return {
      note: "Not submitted. Nothing reaches an advocate until it is.",
      action: "Submit",
      href: `/documents/${doc.id}`,
    };
  }
  if (doc.status === "settled") {
    const n = outstandingSteps(doc).length;
    return {
      note: `${n} ${n === 1 ? "step" : "steps"} left on the execution checklist`,
      action: "Execution checklist",
      href: `/documents/${doc.id}/checklist`,
    };
  }
  return null;
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

  const byGroup = (g: Group) => docs.filter((d) => groupOf(d) === g);
  const you = byGroup("you");
  const advocate = byGroup("advocate");
  const done = byGroup("done");

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

      <div className="space-y-14 pb-10">
        <Section
          title="Needs your action"
          count={you.length}
          empty="Nothing needs you. Requests from an advocate, and execution steps after sign-off, appear here."
        >
          {you.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} move={yourMove(doc)} />
          ))}
        </Section>

        <Section
          title="With the advocate"
          count={advocate.length}
          empty="No document is with an advocate right now."
        >
          {advocate.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} move={null} />
          ))}
        </Section>

        <Section
          title="Settled and executed"
          count={done.length}
          empty="A document moves here once it is signed off and every execution step is done."
        >
          {done.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} move={null} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
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
      {count === 0 ? (
        <p className="mt-4 rounded-card bg-parchment/60 px-6 py-5 text-body text-muted-fg">
          {empty}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">{children}</ul>
      )}
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
    <li className="relative grid items-center gap-x-10 gap-y-5 rounded-card border border-line bg-paper px-6 py-6 transition-colors hover:border-ink/25 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)_12rem] lg:px-8">
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
