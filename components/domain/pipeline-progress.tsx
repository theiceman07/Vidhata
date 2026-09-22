"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { Dateline } from "@/components/document/dateline";
import {
  PIPELINE_LAYERS,
  PIPELINE_DURATION_MS,
  type PipelineLayer,
} from "@/lib/types";

const LAYER_ORDER: PipelineLayer[] = [0, 1, 2, 3, 4, 5, 6];
const MS_PER_LAYER = 4000;
export { PIPELINE_DURATION_MS };

/**
 * The first pass, while it runs.
 *
 * A spinner says "wait"; this says what is being done and what has been
 * done already, because the seven layers are the product's argument for
 * itself. Each layer is a line on a sheet rather than a numbered disc in
 * a bordered card: the work is a sequence, not a dashboard.
 */
function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return seconds;
}

export function PipelineProgress() {
  const elapsedSeconds = useElapsedSeconds();
  const currentLayerIndex = Math.min(
    Math.floor((elapsedSeconds * 1000) / MS_PER_LAYER),
    LAYER_ORDER.length - 1,
  );

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const currentLayerInfo = PIPELINE_LAYERS[LAYER_ORDER[currentLayerIndex]];

  return (
    <div className="mx-auto max-w-3xl px-4">
      <header>
        <Dateline segments={["Reading the document"]} />
        <h1 className="mt-3 font-display text-h1 text-ink">
          {currentLayerInfo.name}
        </h1>
        <p className="mt-2 max-w-xl text-body text-muted-fg">
          {currentLayerInfo.description}
        </p>
        <p aria-hidden className="mt-4 font-mono text-notation text-muted-fg">
          {minutes}:{seconds.toString().padStart(2, "0")} elapsed
          <span className="mx-2 text-line">·</span>
          usually under two minutes
        </p>
        {/* QA 5.4: announce layer transitions, not the per-second ticker
            above — a live region that updates every second is its own
            accessibility failure. */}
        <p role="status" aria-live="polite" className="sr-only">
          Running layer {currentLayerIndex + 1} of {LAYER_ORDER.length}:{" "}
          {currentLayerInfo.name}.
        </p>
      </header>

      <ol className="mt-decision border-t border-line">
        {LAYER_ORDER.map((layer) => {
          const info = PIPELINE_LAYERS[layer];
          const isComplete = layer < currentLayerIndex;
          const isCurrent = layer === currentLayerIndex;

          return (
            <li
              key={layer}
              className="flex items-baseline gap-4 border-b border-line py-3"
            >
              <span aria-hidden className="w-5 shrink-0">
                {isComplete && (
                  <Icon name="check" size={16} className="text-verified" />
                )}
              </span>
              <span
                className={cn(
                  "flex-1 text-body",
                  isCurrent && "text-ink",
                  isComplete && "text-muted-fg",
                  !isCurrent && !isComplete && "text-muted-fg/70",
                )}
              >
                {info.name}
              </span>
              {isCurrent && (
                <span className="font-mono text-notation uppercase tracking-notation text-caution-fg">
                  Running
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
