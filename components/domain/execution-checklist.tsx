"use client";

import { useRef } from "react";
import { format } from "date-fns";
import type { ExecutionStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { EsignGuide } from "@/components/domain/esign-guide";
import { cn } from "@/lib/utils";

const STEP_ORDER: ExecutionStep["kind"][] = [
  "stamping",
  "registration",
  "esignature",
];

export const STEP_TITLE: Record<ExecutionStep["kind"], string> = {
  stamping: "Stamp duty",
  registration: "Registration",
  esignature: "e-signature",
};

/** What a client can attach to show a step was done. */
const EVIDENCE_HINT: Record<ExecutionStep["kind"], string> = {
  stamping: "The e-stamp certificate",
  registration: "The registration receipt",
  esignature: "The signed copy",
};

export function orderedSteps(steps: ExecutionStep[]): ExecutionStep[] {
  const byKind = new Map(steps.map((s) => [s.kind, s]));
  return STEP_ORDER.map((kind) => byKind.get(kind)).filter(
    (s): s is ExecutionStep => Boolean(s),
  );
}

/** The first step that applies and is not yet done, in sheet order. */
export function nextStep(steps: ExecutionStep[]): ExecutionStep | null {
  return orderedSteps(steps).find((s) => s.applicable && !s.complete) ?? null;
}

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
 * The steps run down a rail, one station each, so the sheet reads as a
 * sequence. Each is a parchment sheet: what to do on the left, the record
 * set into it on paper on the right. The step up next is marked.
 */
export function ExecutionChecklist({
  steps,
  owners,
  onToggle,
  onAttach,
  busyKind,
}: ExecutionChecklistProps) {
  const ordered = orderedSteps(steps);
  const next = nextStep(steps);

  return (
    <ol className="print:space-y-6">
      {ordered.map((step, i) => (
        <StepRow
          key={step.kind}
          step={step}
          number={i + 1}
          last={i === ordered.length - 1}
          isNext={next?.kind === step.kind}
          owner={owners[step.kind]}
          busy={busyKind === step.kind}
          onToggle={(complete) => onToggle(step.kind, complete)}
          onAttach={(name) => onAttach(step.kind, name)}
        />
      ))}
    </ol>
  );
}

function StepNode({ step, number, isNext }: { step: ExecutionStep; number: number; isNext: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex h-9 w-9 items-center justify-center rounded-full font-mono text-meta print:hidden",
        !step.applicable && "bg-parchment text-muted-fg ring-1 ring-inset ring-line",
        step.applicable && step.complete && "bg-accent text-accent-fg",
        step.applicable && !step.complete && isNext && "bg-ink text-paper ring-4 ring-ink/10",
        step.applicable && !step.complete && !isNext && "bg-paper text-ink ring-2 ring-inset ring-ink",
      )}
    >
      {!step.applicable ? (
        <Icon name="remove" size={18} />
      ) : step.complete ? (
        <Icon name="check" size={18} />
      ) : (
        number
      )}
    </span>
  );
}

function StatusPill({ step, isNext }: { step: ExecutionStep; isNext: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {isNext && (
        <span className="rounded-full bg-ink px-2.5 py-1 text-label text-paper">Up next</span>
      )}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-label",
          !step.applicable ? "text-muted-fg" : step.complete ? "text-verified" : "text-muted-fg",
        )}
      >
        {step.applicable && step.complete && <Icon name="check_circle" size={16} />}
        {!step.applicable ? "Not required" : step.complete ? "Complete" : "Not done"}
      </span>
    </span>
  );
}

function StepRow({
  step,
  number,
  last,
  isNext,
  owner,
  busy,
  onToggle,
  onAttach,
}: {
  step: ExecutionStep;
  number: number;
  last: boolean;
  isNext: boolean;
  owner: string;
  busy: boolean;
  onToggle: (complete: boolean) => void;
  onAttach: (fileName: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = `evidence-${step.kind}`;

  return (
    <li
      id={`step-${step.kind}`}
      className="relative grid scroll-mt-6 grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-4 last:pb-0 md:gap-x-6 print:block print:break-inside-avoid print:pb-0"
    >
      {/* The rail. It fills in accent as each step is done. */}
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 left-[16.5px] top-11 w-[3px] rounded-full print:hidden",
            step.applicable && step.complete ? "bg-accent" : "bg-line",
          )}
        />
      )}
      <StepNode step={step} number={number} isNext={isNext} />

      {!step.applicable ? (
        <div className="rounded-card bg-parchment/50 p-6 md:px-7 print:p-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-label font-medium text-muted-fg">
                {String(number).padStart(2, "0")} · {STEP_TITLE[step.kind]}
              </h3>
              <p className="mt-1 font-display text-h3 text-muted-fg">{step.headline}</p>
            </div>
            <StatusPill step={step} isNext={false} />
          </div>
          <p className="mt-3 max-w-prose text-meta text-muted-fg">
            <span className="text-ink">Why it does not apply.</span> {step.reason}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-x-8 gap-y-6 rounded-card bg-parchment p-6 md:p-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] print:block print:p-0",
            isNext && "ring-1 ring-inset ring-ink/15",
          )}
        >
          {/* What to do. */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-label font-medium text-muted-fg">
                {String(number).padStart(2, "0")} · {STEP_TITLE[step.kind]}
                <span className="mx-1.5 text-muted-fg/50">·</span>
                <span className="font-normal">Owner · {owner}</span>
              </h3>
              <span className="xl:hidden">
                <StatusPill step={step} isNext={isNext} />
              </span>
            </div>

            <p className="mt-2 font-display text-[clamp(20px,1.6vw,24px)] font-medium leading-snug tracking-[-0.01em] text-ink">
              {step.headline}
            </p>
            <p className="mt-2 max-w-prose text-body text-ink">{step.detail}</p>

            {step.instructions.length > 0 && (
              <ol className="mt-5 space-y-2.5">
                {step.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-3 text-meta text-ink">
                    <span
                      aria-hidden
                      className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper font-mono text-label text-muted-fg"
                    >
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{instruction}</span>
                  </li>
                ))}
              </ol>
            )}

            {step.kind === "esignature" && (
              <div className="mt-6 max-w-prose">
                <EsignGuide />
              </div>
            )}
          </div>

          {/* The record: proof, and who marked it done. */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="hidden justify-end xl:flex">
              <StatusPill step={step} isNext={isNext} />
            </div>

            <div className="flex flex-1 flex-col rounded-control bg-paper p-5 print:p-0">
              <p className="text-label font-medium text-muted-fg">Proof</p>
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
              {step.evidence ? (
                <div className="mt-2 flex items-center gap-3 rounded-control bg-parchment px-3.5 py-3">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink"
                  >
                    <Icon name="description" size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-meta text-ink">{step.evidence.name}</span>
                    <span className="block text-label text-muted-fg">
                      Attached {format(new Date(step.evidence.attachedAt), "d MMM yyyy")}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center print:hidden">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onAttach(null)}
                    >
                      Remove
                    </Button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 flex items-center gap-3 rounded-control border border-dashed border-ink/20 px-3.5 py-3 text-left transition-colors hover:border-ink/40 hover:bg-parchment/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 motion-reduce:transition-none print:hidden"
                >
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-parchment text-muted-fg"
                  >
                    <Icon name="attach_file" size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-meta text-ink">Attach proof</span>
                    <span className="block text-label text-muted-fg">
                      {EVIDENCE_HINT[step.kind]} is enough. It stays with this document.
                    </span>
                  </span>
                </button>
              )}

              <div className="mt-auto pt-5">
                {step.complete ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-start gap-1.5 text-meta text-ink">
                      <Icon name="check_circle" size={18} className="mt-px text-verified" />
                      <span>
                        Marked complete
                        {step.completedBy && ` by ${step.completedBy}`}
                        {step.completedAt && (
                          <span className="block text-label text-muted-fg">
                            {format(new Date(step.completedAt), "d MMM yyyy, HH:mm")}
                          </span>
                        )}
                      </span>
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      variant={isNext ? "default" : "outline"}
                      disabled={busy}
                      onClick={() => onToggle(true)}
                      className="w-full print:hidden"
                    >
                      <Icon name="check" size={18} />
                      {step.kind === "esignature" ? "Both have signed" : "Mark complete"}
                    </Button>
                    <p className="text-label text-muted-fg">
                      {step.kind === "esignature"
                        ? "This says both signatories have signed. "
                        : ""}
                      Who marked it, and when, is recorded. It can be taken back.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
