"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getMetrics } from "@/lib/api/metrics";
import { percent } from "@/lib/metrics";
import type { Metrics, Ratio } from "@/lib/types";

/**
 * Metrics. Internal, and only in the advocate portal.
 *
 * Every figure here is read from the one place it is really recorded. Two have
 * no source yet, and they say so in words instead of showing a number: a zero
 * would claim something was measured that never was. A rate with nothing to
 * divide says "None yet" for the same reason.
 */
type LoadState = "loading" | "error" | "loaded";

function Figure({
  label,
  definition,
  ratio,
  none,
}: {
  label: string;
  definition: string;
  ratio: Ratio;
  /** What "none yet" means for this figure. */
  none: string;
}) {
  const value = percent(ratio);
  return (
    <section className="flex flex-col rounded-card bg-parchment p-6">
      <h2 className="text-label font-medium text-muted-fg">{label}</h2>
      {value ? (
        <>
          <p className="mt-3 font-display text-h1 tabular-nums text-ink">{value}</p>
          <p className="mt-1 text-meta tabular-nums text-ink">
            {ratio.numerator} of {ratio.denominator}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-h2 text-ink">None yet</p>
          <p className="mt-1 text-meta text-muted-fg">{none}</p>
        </>
      )}
      <p className="mt-4 max-w-measure text-label text-muted-fg">{definition}</p>
    </section>
  );
}

function NoSource({ label, why }: { label: string; why: string }) {
  return (
    <section className="flex flex-col rounded-card bg-parchment p-6">
      <h2 className="text-label font-medium text-muted-fg">{label}</h2>
      <p className="mt-3 font-display text-h2 text-ink">No data source yet</p>
      <p className="mt-4 max-w-measure text-label text-muted-fg">{why}</p>
    </section>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setMetrics(await getMetrics());
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load the metrics.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="w-full" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-card" />
          ))}
        </div>
      </div>
    );
  }
  if (state === "error" || !metrics) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div className="w-full">
      <h1 className="font-display text-h1 text-ink">Metrics</h1>
      <p className="mt-2 max-w-measure text-body text-muted-fg">
        How the first pass and the citation gate are doing, from the work advocates have recorded.
        Internal.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Figure
          label="Override rate"
          ratio={metrics.overrides}
          none="No first-pass finding has been decided yet."
          definition="Of the findings the first pass raised and an advocate has decided, the share the advocate overrode. Findings still open are not counted."
        />
        <Figure
          label="Addition rate"
          ratio={metrics.additions}
          none="There are no findings on the record yet."
          definition="Of every finding on the record, the share an advocate added because the first pass missed it."
        />
        <Figure
          label="Pre-gate fabrication rate"
          ratio={metrics.fabrication}
          none="No citation has been typed yet."
          definition="Of the citations an advocate typed, the share the corpus could not match. A citation picked from the corpus is not counted, because it is always verified."
        />
        <NoSource
          label="Triage override rate"
          why="No screen lets an advocate change a tier, so an override is not recorded. It has to be logged when that exists."
        />
        <NoSource
          label="Agent replies withdrawn"
          why="The check on the document agent withdraws a reply that advises or is not drawn from the document. It is counted in the client's own browser tab and nowhere else, so there is nothing to read a figure from until a backend records it."
        />
        <NoSource
          label="Corpus-currency lag"
          why="The corpus carries no effective dates yet, so how far it trails the law cannot be measured."
        />
      </div>

      <section aria-labelledby="blocked-title" className="mt-12">
        <h2 id="blocked-title" className="font-display text-h2 text-ink">
          Blocked citations
        </h2>
        <p className="mt-2 max-w-measure text-meta text-muted-fg">
          Every citation an advocate typed that the corpus could not match, newest first, exactly as
          typed.
        </p>

        {metrics.blocked.length === 0 ? (
          <p className="mt-6 max-w-measure rounded-card bg-parchment p-6 text-body text-ink">
            No citation has been blocked yet. Type one that the corpus does not hold, in Add finding
            on a document under review, and it appears here.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {metrics.blocked.map((row) => (
              <li key={row.id} className="rounded-card bg-parchment p-5">
                <p className="font-clause text-body text-ink">{row.typed || "(nothing typed)"}</p>
                <p className="mt-2 text-meta text-ink">{row.reason}</p>
                <p className="mt-1 text-label text-muted-fg">
                  {row.documentTitle ?? "A document"}
                  <span className="mx-1.5">·</span>
                  {row.advocate}
                  <span className="mx-1.5">·</span>
                  <time dateTime={row.at}>{format(new Date(row.at), "d MMM yyyy, HH:mm")}</time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 max-w-measure text-label text-muted-fg">
        Counted over {metrics.documentsCounted} documents in the queue and the sample data they
        carry. The citation log is kept in this browser tab only, so it starts empty in the preview
        and goes when the tab does, and the figures it feeds start from nothing. A document still
        awaiting payment is not counted.
      </p>
    </div>
  );
}
