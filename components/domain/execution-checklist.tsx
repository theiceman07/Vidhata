"use client";

import { useRef } from "react";
import { format } from "date-fns";
import type { ExecutionStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
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

/** What a client can attach to show a step was done. */
const EVIDENCE_HINT: Record<ExecutionStep["kind"], string> = {
  stamping: "The e-stamp certificate",
  registration: "The registration receipt",
  esignature: "The signed PDF",
};

interface ExecutionChecklistProps {
  steps: ExecutionStep[];
  /** Who is responsible for each step, by kind. */
  owners: Record<ExecutionStep["kind"], string>;
  onToggle: (kind: ExecutionStep["kind"], complete: boolean) => void;
  onAttach: (kind: ExecutionStep["kind"], fileName: string | null) => void;
  /** The step with a save in flight, so only its controls wait. */
  busyKind: ExecutionStep["kind"] | null;
}

/**
 * The execution sheet.
 *
 * What is left to do to make the settled document effective, set the way
 * an instruction sheet is set: a number, the finding of fact, the steps,
 * and then the record. A tick on a legal step is a claim that it was
 * done, so it always says who made it and when, it can carry the proof,
 * and it can be taken back.
 *
 * A step that does not apply keeps its number and states why, because
 * "registration is not required" is a legal conclusion the client is
 * relying on, not an absence worth hiding.
 *
 * Steps are panels, not ruled rows: side by side where the screen is
 * wide enough, each a parchment sheet with its record set into it on
 * paper. Space and tint divide them; there are no rules.
 */
export function ExecutionChecklist({
  steps,
  owners,
  onToggle,
  onAttach,
  busyKind,
}: ExecutionChecklistProps) {
  const byKind = new Map(steps.map((s) => [s.kind, s]));
  const ordered = STEP_ORDER.map((kind) => byKind.get(kind)).filter(
    (s): s is ExecutionStep => Boolean(s),
  );

  return (
    <ol className="grid gap-4 lg:grid-cols-3 print:block print:space-y-6">
      {ordered.map((step, i) => (
        <StepRow
          key={step.kind}
          step={step}
          number={String(i + 1).padStart(2, "0")}
          owner={owners[step.kind]}
          busy={busyKind === step.kind}
          onToggle={(complete) => onToggle(step.kind, complete)}
          onAttach={(name) => onAttach(step.kind, name)}
        />
      ))}
    </ol>
  );
}

function StepRow({
  step,
  number,
  owner,
  busy,
  onToggle,
  onAttach,
}: {
  step: ExecutionStep;
  number: string;
  owner: string;
  busy: boolean;
  onToggle: (complete: boolean) => void;
  onAttach: (fileName: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = `evidence-${step.kind}`;

  return (
    <li
      className={cn(
        "flex flex-col rounded-card p-6 md:p-7 print:break-inside-avoid print:p-0",
        step.applicable ? "bg-parchment" : "bg-parchment/50",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p
          className={cn(
            "font-display text-h2 tabular-nums",
            step.applicable ? "text-ink" : "text-muted-fg",
          )}
        >
          {number}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label",
            !step.applicable
              ? "bg-paper/70 text-muted-fg"
              : step.complete
                ? "bg-paper text-verified"
                : "bg-paper text-muted-fg",
          )}
        >
          {step.applicable && step.complete && <Icon name="check_circle" size={16} />}
          {!step.applicable ? "Not required" : step.complete ? "Complete" : "Not done"}
        </span>
      </div>

      <div className="mt-5 flex min-w-0 flex-1 flex-col">
        <h3 className="text-label font-medium text-muted-fg">
          {STEP_TITLE[step.kind]}
          {step.applicable && (
            <>
              <span className="mx-1.5 text-muted-fg/50">·</span>
              <span className="font-normal">Owner · {owner}</span>
            </>
          )}
        </h3>

        <p
          className={cn(
            "mt-1.5 font-display text-h3",
            step.applicable ? "text-ink" : "text-muted-fg",
          )}
        >
          {step.headline}
        </p>

        {!step.applicable ? (
          <p className="mt-2 max-w-prose text-meta text-muted-fg">{step.reason}</p>
        ) : (
          <>
            <p className="mt-2 max-w-prose text-meta text-ink">{step.detail}</p>

            {step.instructions.length > 0 && (
              <ol className="mt-3 max-w-prose list-decimal space-y-1 pl-5 text-meta text-ink marker:font-mono marker:text-label marker:text-muted-fg">
                {step.instructions.map((instruction, index) => (
                  <li key={index} className="pl-1">
                    {instruction}
                  </li>
                ))}
              </ol>
            )}

            {/* The record: proof, and who marked it done. */}
            <div className="mt-auto pt-6">
              <div className="space-y-4 rounded-control bg-paper p-4 print:p-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {step.evidence ? (
                    <p className="inline-flex min-w-0 items-center gap-1.5 text-meta text-ink">
                      <Icon name="attach_file" size={16} className="text-muted-fg" />
                      <span className="truncate">{step.evidence.name}</span>
                      <span className="shrink-0 text-label text-muted-fg">
                        · attached {format(new Date(step.evidence.attachedAt), "d MMM yyyy")}
                      </span>
                    </p>
                  ) : (
                    <p className="text-meta text-muted-fg">
                      No proof attached. {EVIDENCE_HINT[step.kind]} is enough.
                    </p>
                  )}
                  <div className="flex items-center gap-1 print:hidden">
                    <input
                      ref={fileRef}
                      id={fileId}
                      type="file"
                      className="sr-only"
                      tabIndex={-1}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onAttach(file.name);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Icon name="attach_file" size={18} />
                      {step.evidence ? "Replace" : "Attach proof"}
                    </Button>
                    {step.evidence && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onAttach(null)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {step.complete ? (
                    <>
                      <p className="text-meta text-ink">
                        Marked complete
                        {step.completedBy && ` by ${step.completedBy}`}
                        {step.completedAt &&
                          ` · ${format(new Date(step.completedAt), "d MMM yyyy, HH:mm")}`}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onToggle(false)}
                        className="print:hidden"
                      >
                        <Icon name="undo" size={18} />
                        Undo
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-meta text-muted-fg">
                        Mark it complete once it is done. Who marked it, and
                        when, is recorded.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onToggle(true)}
                        className="print:hidden"
                      >
                        <Icon name="check" size={18} />
                        Mark complete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
