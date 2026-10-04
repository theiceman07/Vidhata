"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ConsultationStatus } from "@/components/domain/consultation-status";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdvocateConsultations } from "@/lib/api/consultations";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ConsultationSummary } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * What the advocate is asked, on documents they settled and no others.
 *
 * A list never carries a question: it is read inside the request, so nothing
 * here can leak one to a screen, a tab title or a tooltip. The rows say who
 * asked, about what, and where the request stands.
 */
export default function ConsultationsPage() {
  const [requests, setRequests] = useState<ConsultationSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setRequests(await listAdvocateConsultations(CURRENT_ADVOCATE.id));
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load your requests.");
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
            <Skeleton key={i} className="h-20 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const waiting = requests.filter(
    (r) => r.status === "requested" || (r.status === "accepted" && r.paid),
  ).length;

  return (
    <div className="w-full">
      <header className="max-w-measure">
        <h1 className="font-display text-h1 text-ink">Consultations</h1>
        <p className="mt-2 text-lead text-muted-fg">
          Requests from clients whose documents you settled. Only you see them. Declining is free
          and never chargeable.
        </p>
      </header>

      {requests.length === 0 ? (
        <div className="mt-10 max-w-xl">
          <EmptyState
            title="No requests yet."
            description="When a client asks to talk through a document you settled, the request appears here."
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-meta text-muted-fg">
            {waiting > 0
              ? `${waiting} ${waiting === 1 ? "request needs" : "requests need"} your move.`
              : "Nothing needs your move."}
          </p>
          <ul className="mt-4 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-3 rounded-card bg-parchment/50 px-6 py-5 transition-colors hover:bg-parchment"
              >
                <div className="min-w-0">
                  <Link
                    href={`/consultations/${r.id}`}
                    className="line-clamp-2 font-display text-h3 text-ink hover:underline"
                  >
                    {r.documentTitle}
                  </Link>
                  <p className="mt-0.5 truncate text-meta text-muted-fg">
                    {r.clientName}
                    <span className="mx-1.5 text-muted-fg/50">·</span>
                    requested {format(new Date(r.requestedAt), "d MMM yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-3 justify-self-end">
                  <ConsultationStatus consultation={r} audience="advocate" />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/consultations/${r.id}`}>Open</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
