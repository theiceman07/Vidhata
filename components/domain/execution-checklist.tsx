"use client";

import { Landmark, FileStack, PenTool } from "lucide-react";
import type { ExecutionStep } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEP_ORDER: ExecutionStep["kind"][] = [
  "stamping",
  "registration",
  "esignature",
];

const STEP_ICON: Record<ExecutionStep["kind"], typeof Landmark> = {
  stamping: Landmark,
  registration: FileStack,
  esignature: PenTool,
};

interface ExecutionChecklistProps {
  steps: ExecutionStep[];
  onToggle: (kind: ExecutionStep["kind"], complete: boolean) => void;
}

export function ExecutionChecklist({
  steps,
  onToggle,
}: ExecutionChecklistProps) {
  const byKind = new Map(steps.map((s) => [s.kind, s]));

  return (
    <div className="space-y-4">
      {STEP_ORDER.map((kind) => {
        const step = byKind.get(kind);
        if (!step) return null;
        const Icon = STEP_ICON[kind];

        return (
          <div
            key={kind}
            className={cn(
              "rounded-card border border-line p-5 shadow-card",
              step.applicable ? "bg-paper" : "bg-canvas/50",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  step.applicable
                    ? "bg-brand/10 text-brand"
                    : "bg-line text-muted-fg",
                )}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-display text-h3 text-ink">
                  {step.headline}
                </p>
                <p className="mt-1 text-small text-muted-fg">{step.reason}</p>

                {step.applicable && (
                  <>
                    <p className="mt-3 text-body text-ink">{step.detail}</p>
                    {step.instructions.length > 0 && (
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-body text-ink">
                        {step.instructions.map((instruction, i) => (
                          <li key={i}>{instruction}</li>
                        ))}
                      </ol>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                      <Checkbox
                        id={`step-${kind}`}
                        checked={step.complete}
                        onCheckedChange={(v) => onToggle(kind, v === true)}
                      />
                      <Label
                        htmlFor={`step-${kind}`}
                        className="font-normal text-ink"
                      >
                        Mark as done
                      </Label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
