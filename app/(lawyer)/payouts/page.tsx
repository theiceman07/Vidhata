"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getPayoutStatement } from "@/lib/api/consultations";
import { PRICE_BASIS, rupees } from "@/lib/config/pricing";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { PayoutStatement } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * What the advocate has earned from consultations, one line for each they
 * answered: the document, the day and the consultation fee, before GST. The fee is
 * the configured one (lib/config/pricing.ts); who sets it and who receives it is for
 * counsel to confirm, and this page claims neither.
 *
 * It is the advocate's alone. It lists consultation fees and nothing else: no
 * share of anything, no figure from what the document cost the client, and no
 * other advocate to be set beside. The total is the API's, not worked out here.
 */
export default function PayoutsPage() {
  const [statement, setStatement] = useState<PayoutStatement | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setStatement(await getPayoutStatement(CURRENT_ADVOCATE.id));
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load your payout statement.");
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

  if (state === "error" || !statement) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div className="w-full">
      <header className="max-w-measure">
        <h1 className="font-display text-h1 text-ink">Payout statement</h1>
        <p className="mt-2 text-lead text-muted-fg">
          The configured consultation fee for each consultation you have answered, {PRICE_BASIS}. In
          this preview it is one amount for every consultation. Only you see this.
        </p>
      </header>

      {statement.lines.length === 0 ? (
        <div className="mt-10 max-w-xl">
          <EmptyState
            title="Nothing on your statement yet."
            description="When you answer a consultation, its fee is listed here with the document and the day."
          />
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-2">
            {statement.lines.map((line) => (
              <li
                key={line.consultationId}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-8 gap-y-1 rounded-card bg-parchment/50 px-6 py-4"
              >
                <Link
                  href={`/consultations/${line.consultationId}`}
                  className="line-clamp-2 min-w-0 font-display text-h3 text-ink hover:underline"
                >
                  {line.documentTitle}
                </Link>
                <span className="text-meta text-muted-fg">
                  Answered {format(new Date(line.answeredAt), "d MMM yyyy")}
                </span>
                <span className="text-right font-mono text-body text-ink">
                  {rupees(line.amount)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-end gap-6 rounded-card bg-parchment px-6 py-4">
            <span className="text-meta text-muted-fg">Total {PRICE_BASIS}</span>
            <span className="font-mono text-h3 text-ink">{rupees(statement.total)}</span>
          </div>
        </>
      )}
    </div>
  );
}
