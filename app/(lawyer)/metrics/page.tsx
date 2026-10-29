"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getMetrics } from "@/lib/api/metrics";
import { percent } from "@/lib/metrics";
import type { Metrics, Ratio } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";

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
  const share =
    ratio.denominator > 0 ? Math.round((ratio.numerator / ratio.denominator) * 100) : 0;
  return (
    <section className="flex flex-col rounded-card bg-parchment p-6 md:p-8">
      <h2 className="text-body font-medium text-ink">{label}</h2>
      {value ? (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-display text-h1 tabular-nums text-ink">{value}</p>
            <p className="text-meta tabular-nums text-muted-fg">
              {ratio.numerator} of {ratio.denominator}
            </p>
          </div>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line"
            role="img"
            aria-label={`${ratio.numerator} of ${ratio.denominator}`}
          >
            <div className="h-full rounded-full bg-ink" style={{ width: `${share}%` }} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 font-display text-h2 text-ink">None yet</p>
          <p className="mt-1 text-meta text-muted-fg">{none}</p>
        </>
      )}
      <p className="mt-5 max-w-measure text-meta text-muted-fg">{definition}</p>
    </section>
  );
}

function NoSource({ label, why }: { label: string; why: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-dashed border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-meta font-medium text-ink">{label}</h3>
        <span className="rounded-full bg-sand px-2.5 py-0.5 text-label text-muted-fg">
          No data source yet
        </span>
      </div>
      <p className="max-w-measure text-meta text-muted-fg">{why}</p>
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
      <PageHeader
        title="Metrics"
        description="How the first pass is doing, from the work advocates have recorded. Internal."
      />

      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      {/* What cannot be measured yet is said plainly and kept quiet: a figure
          with nothing behind it is never shown (CLAUDE.md, Metrics). */}
      <h2 className="mb-1 mt-12 text-body font-medium text-ink">Not measured yet</h2>
      <p className="mb-4 text-meta text-muted-fg">
        These have nothing behind them, so no figure is shown.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
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

      <p className="mt-10 border-t border-line pt-4 text-meta text-muted-fg">
        Counted over {metrics.documentsCounted} documents in the queue and the sample data they
        carry. A document still awaiting payment is not counted.
      </p>
    </div>
  );
}
