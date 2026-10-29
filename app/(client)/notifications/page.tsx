"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { differenceInCalendarDays, format } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon, type IconName } from "@/components/shared/icon";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientNotifications } from "@/lib/api/client/notifications";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ClientNotification } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "error" | "loaded";

/** The kinds where the client has a move, and the button that makes it. */
const ACTION: Partial<Record<ClientNotification["kind"], string>> = {
  awaiting_payment: "Pay fee",
  advocate_asked: "Answer",
  consultation_accepted: "Pay fee",
};

const ICONS: Record<ClientNotification["kind"], IconName> = {
  awaiting_payment: "payments",
  advocate_asked: "reply",
  consultation_accepted: "payments",
  with_advocate: "person",
  settled: "task_alt",
  consultation_declined: "block",
  consultation_answered: "rate_review",
};

const LABEL: Record<ClientNotification["kind"], string> = {
  awaiting_payment: "Action needed",
  advocate_asked: "Action needed",
  consultation_accepted: "Action needed",
  with_advocate: "With advocate",
  settled: "Settled",
  consultation_declined: "Declined",
  consultation_answered: "Answered",
};

/** "Today", "Yesterday", "3 days ago" for the last week, the full date after it. */
function when(iso: string): string {
  const days = differenceInCalendarDays(new Date(), new Date(iso));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return format(new Date(iso), "d MMM yyyy");
}

const isRecent = (iso: string) =>
  differenceInCalendarDays(new Date(), new Date(iso)) < 7;

/**
 * What has happened on the client's documents, newest first.
 *
 * Each line says that something happened, to which document, and opens it. It
 * is worked out from the state of the documents and requests on every visit and is
 * not kept, so there is no unread count and nothing to dismiss. A real notification
 * needs a read state the backend keeps (docs/api-contract.md). None of
 * it names an advocate before sign-off, counts findings, repeats a decision,
 * quotes a question or points at a clause.
 */
export default function NotificationsPage() {
  const [items, setItems] = useState<ClientNotification[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "action">("all");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await getClientNotifications(MOCK_CLIENT_ORG.id));
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not load your notifications.",
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
        <Skeleton className="h-10 w-72" />
        <div className="mt-8 space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const shown =
    filter === "action" ? items.filter((n) => ACTION[n.kind]) : items;
  const needing = items.filter((n) => ACTION[n.kind]).length;
  const groups = [
    { title: "This week", items: shown.filter((n) => isRecent(n.at)) },
    { title: "Earlier", items: shown.filter((n) => !isRecent(n.at)) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="w-full">
      <PageHeader
        title="Notifications"
        description={
          needing > 0
            ? `${needing} ${needing === 1 ? "notification needs" : "notifications need"} your action. Newest first.`
            : "What has happened on your documents and consultation requests, newest first."
        }
      />

      {items.length === 0 ? (
        <div className="max-w-xl">
          <EmptyState
            title="Nothing new."
            description="When a document moves, or your advocate asks for something, it appears here."
            action={
              <Button asChild variant="outline">
                <Link href="/documents">Go to your documents</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Filter notifications"
            className="mb-6 flex gap-2"
          >
            {(["all", "action"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  filter === value
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink hover:border-ink/40",
                )}
              >
                {value === "all" ? "All" : "Needs action"}
              </button>
            ))}
          </div>

          {groups.length === 0 && (
            <p className="text-meta text-muted-fg">
              Nothing needs your action right now.
            </p>
          )}

          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <h2 className="text-meta font-medium text-muted-fg">
                  {group.title}
                </h2>
                <ul className="mt-2 space-y-2">
                  {group.items.map((n) => {
                    const action = ACTION[n.kind];
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.href}
                          className="flex items-center gap-4 rounded-card bg-surface px-4 py-3 transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-parchment text-muted-fg",
                            )}
                          >
                            <Icon name={ICONS[n.kind]} size={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-display text-h3 leading-snug text-ink">
                                {n.title}
                              </span>
                              <span className="whitespace-nowrap text-meta text-muted-fg">
                                {when(n.at)}
                              </span>
                            </span>
                            <span className="block text-meta text-muted-fg">
                              {n.event}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 text-label font-medium sm:inline-block",
                              action ? TONE.move.chip : "border-line text-muted-fg",
                            )}
                          >
                            {LABEL[n.kind]}
                          </span>
                          <span
                            className={cn(
                              "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-meta font-medium",
                              action ? "border border-ink text-ink" : "link",
                            )}
                          >
                            {action ?? "View"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
