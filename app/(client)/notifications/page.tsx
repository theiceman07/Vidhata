"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon } from "@/components/shared/icon";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientNotifications } from "@/lib/api/client/notifications";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ClientNotification } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";

type LoadState = "loading" | "error" | "loaded";

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

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await getClientNotifications(MOCK_CLIENT_ORG.id));
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load your notifications.");
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

  return (
    <div className="w-full">
      <PageHeader
        title="Notifications"
        description="What has happened on your documents and consultation requests, newest first."
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
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href}
                className="grid grid-cols-[minmax(0,var(--measure))_auto_1fr_auto] items-center gap-x-6 rounded-card bg-parchment/50 px-6 py-4 [--measure:68ch] transition-colors hover:bg-parchment"
              >
                <span className="min-w-0 text-body text-ink">{n.text}</span>
                <span className="whitespace-nowrap text-meta text-muted-fg">
                  {format(new Date(n.at), "d MMM yyyy")}
                </span>
                <span aria-hidden />
                <Icon name="chevron_right" size={20} className="text-muted-fg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
