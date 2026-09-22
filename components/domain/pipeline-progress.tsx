"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  PIPELINE_LAYERS,
  PIPELINE_DURATION_MS,
  type PipelineLayer,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const LAYER_ORDER: PipelineLayer[] = [0, 1, 2, 3, 4, 5, 6];
const MS_PER_LAYER = 4000;
export { PIPELINE_DURATION_MS };

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
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <p className="font-display text-h2 text-ink">Running the pipeline</p>
        <p aria-hidden className="mt-1 text-small text-muted-fg">
          {minutes}:{seconds.toString().padStart(2, "0")} elapsed · Usually
          under two minutes
        </p>
        {/* QA 5.4: announce layer transitions, not the per-second ticker
            above — a live region that updates every second is its own
            accessibility failure. */}
        <p role="status" aria-live="polite" className="sr-only">
          Running layer {currentLayerIndex + 1} of {LAYER_ORDER.length}:{" "}
          {currentLayerInfo.name}.
        </p>
      </div>

      <ol className="space-y-3">
        {LAYER_ORDER.map((layer) => {
          const info = PIPELINE_LAYERS[layer];
          const isComplete = layer < currentLayerIndex;
          const isCurrent = layer === currentLayerIndex;

          return (
            <li
              key={layer}
              className={cn(
                "flex items-start gap-3 rounded-card border p-4 transition-colors",
                isCurrent
                  ? "border-accent bg-accent/5"
                  : "border-line bg-paper",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-small font-medium",
                  isComplete && "bg-verified text-white",
                  isCurrent && "animate-pulse bg-accent text-accent-fg",
                  !isComplete && !isCurrent && "bg-line text-muted-fg",
                )}
                aria-hidden
              >
                {isComplete ? <Check className="h-4 w-4" /> : layer}
              </span>
              <div>
                <p
                  className={cn(
                    "text-body font-medium",
                    isCurrent || isComplete ? "text-ink" : "text-muted-fg",
                  )}
                >
                  {info.name}
                </p>
                {(isCurrent || isComplete) && (
                  <p className="text-small text-muted-fg">
                    {info.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
