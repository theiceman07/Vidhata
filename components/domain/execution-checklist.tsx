"use client";

import type { ExecutionStep } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STEP_ORDER: ExecutionStep["kind"][] = [
  "stamping",
  "registration",
  "esignature",
];

const STEP_TITLE: Record<ExecutionStep["kind"], string> = {
  stamping: "Stamp duty",
  registration: "Registration",
  esignature: "e-signature",
};

interface ExecutionChecklistProps {
  steps: ExecutionStep[];
  onToggle: (kind: ExecutionStep["kind"], complete: boolean) => void;
}

/**
 * The execution sheet.
 *
 * What is left to do to make the settled document effective, set the way
 * an instruction sheet is set: a number, a heading, the finding of fact,
 * then the steps. Indentation and hairlines do the work that boxes,
 * tinted panels and icons in circles were doing before.
 *
 * A step that does not apply keeps its number and states why, because
 * "registration is not required" is a legal conclusion the client is
 * relying on, not an absence worth hiding.
 */
export function ExecutionChecklist({
  steps,
  onToggle,
}: ExecutionChecklistProps) {
  const byKind = new Map(steps.map((s) => [s.kind, s]));
  const ordered = STEP_ORDER.map((kind) => byKind.get(kind)).filter(
    (s): s is ExecutionStep => Boolean(s),
  );

  return (
    <ol className="border-t border-line">
      {ordered.map((step, i) => (
        <li
          key={step.kind}
          className="grid gap-x-8 gap-y-3 border-b border-line py-8 sm:grid-cols-[3rem_minmax(0,1fr)]"
        >
          <p
            className={cn(
              "font-mono text-notation tracking-notation",
              step.applicable ? "text-ink" : "text-muted-fg",
            )}
          >
            {String(i + 1).padStart(2, "0")}
          </p>

          <div className="min-w-0">
            <h3 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
              {STEP_TITLE[step.kind]}
            </h3>
            <p
              className={cn(
                "mt-1 font-display text-h3",
                step.applicable ? "text-ink" : "text-muted-fg",
              )}
            >
              {step.headline}
            </p>

            {step.applicable ? (
              <>
                <p className="mt-3 max-w-prose text-body text-ink">
                  {step.detail}
                </p>

                {step.instructions.length > 0 && (
                  <ol className="mt-4 max-w-prose space-y-2 border-l border-line pl-5 text-body text-ink">
                    {step.instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                )}

                <div className="mt-6 flex items-center gap-2 print:hidden">
                  <Checkbox
                    id={`step-${step.kind}`}
                    checked={step.complete}
                    onCheckedChange={(v) => onToggle(step.kind, v === true)}
                  />
                  <Label
                    htmlFor={`step-${step.kind}`}
                    className="font-normal text-ink"
                  >
                    Mark complete
                  </Label>
                </div>

                {/* The printed sheet carries the state as a word: a
                    screen control prints as an empty square. */}
                <p className="mt-6 hidden text-body text-muted-fg print:block">
                  {step.complete ? "Complete" : "Incomplete"}
                </p>
              </>
            ) : (
              <p className="mt-3 max-w-prose text-body text-muted-fg">
                {step.reason}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
