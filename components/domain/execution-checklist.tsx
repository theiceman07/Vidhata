"use client";

import { useRef } from "react";
import { format } from "date-fns";
import type { ExecutionStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { Tick } from "@/components/shared/tick";
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
 * sequence. What to do sits on the left and the record on the right, divided
 * by a hairline; the step up next carries a quiet tint, the rest sit on rules.
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
    <ol className="space-y-4 print:space-y-6">
      {ordered.map((step, i) => (
        <StepRow
          key={step.kind}
          step={step}
          number={i + 1}
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
  const state = !step.applicable
    ? "na"
    : step.complete
      ? "done"
      : isNext
        ? "current"
        : "ahead";
  return (
    <Tick state={state} size="lg" className="relative z-10 ml-1 print:hidden">
      {state === "current" || state === "ahead" ? number : undefined}
    </Tick>
  );
}

function StatusPill({ step, isNext }: { step: ExecutionStep; isNext: boolean }) {
  const text = !step.applicable
    ? "Not required"
    : step.complete
      ? "Complete"
      : isNext
        ? "Up next"
        : "Not done";
  return (
    <span
      className={cn(
        "ml-auto rounded-control border px-2.5 py-0.5 text-label font-medium",
        step.applicable && step.complete
          ? "border-done text-done-text"
          : isNext
            ? "border-ink text-ink"
            : "border-line text-muted-fg",
      )}
    >
      {text}
    </span>
  );
}

/** One cell of a step's facts: a small label over its value. */
function Fact({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0",
        compact ? "flex items-baseline justify-between gap-4 py-2.5" : "px-4 py-3",
      )}
    >
      <dt className={cn("shrink-0 text-muted-fg", compact ? "text-meta" : "text-label")}>{label}</dt>
      <dd className={cn("leading-snug", compact ? "min-w-0 text-right" : "mt-0.5")}>{children}</dd>
    </div>
  );
}

function StepRow({
  step,
  number,
  isNext,
  owner,
  busy,
  onToggle,
  onAttach,
}: {
  step: ExecutionStep;
  number: number;
  isNext: boolean;
  owner: string;
  busy: boolean;
  onToggle: (complete: boolean) => void;
  onAttach: (fileName: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = `evidence-${step.kind}`;
  const title = STEP_TITLE[step.kind];
  // The headline names the step ("Stamp duty: Rs 100 (Delhi)"); the fact is what follows the colon.
  const requirement = step.headline.includes(": ")
    ? step.headline.slice(step.headline.indexOf(": ") + 2)
    : step.headline;

  const esign = step.kind === "esignature";
  const val = esign ? "text-meta" : "text-body";
  const facts = (
        <dl
    className={
      esign
        ? "divide-y divide-line"
        : "mt-4 grid divide-line overflow-hidden rounded-control border border-line bg-paper max-md:divide-y md:grid-cols-[1.5fr_1fr_1fr_1fr] md:divide-x"
    }
  >
        <Fact compact={esign} label="Requirement">
          <span className={cn(val, "font-medium text-ink")}>{requirement}</span>
        </Fact>
        <Fact compact={esign} label="Owner">
          <span className={cn(val, "font-medium text-ink")}>{owner}</span>
        </Fact>
        <Fact compact={esign} label="Proof">
          {step.evidence ? (
            <span className={cn("flex min-w-0 items-center gap-2 font-medium text-ink", val)}>
              <Icon name="description" size={18} className="shrink-0 text-muted-fg" />
              <span className="truncate">{step.evidence.name}</span>
            </span>
          ) : step.complete ? (
            <span className={cn("flex items-center gap-2 font-medium text-ink", val)}>
              <Icon name="error" size={18} className="shrink-0 text-move-text" />
              Not attached
            </span>
          ) : (
            <span className={cn(val, "text-muted-fg")}>Not attached yet</span>
          )}
        </Fact>
        <Fact compact={esign} label={step.complete ? "Completed" : "Status"}>
          {step.complete ? (
            <span className={cn("block font-medium text-ink", val)}>
              {step.completedAt ? format(new Date(step.completedAt), "d MMM yyyy") : "Complete"}
              {step.completedBy && (
                <span className="block truncate text-label text-muted-fg">by {step.completedBy}</span>
              )}
            </span>
          ) : (
            <span className={cn(val, "text-muted-fg")}>{isNext ? "Up next" : "Not started"}</span>
          )}
        </Fact>
      </dl>
  );

  const instructionList = (
    <>
            {step.instructions.length > 0 && (
              <ol className={esign ? "space-y-3" : "space-y-1.5"}>
                {step.instructions.map((instruction, index) => (
                  <li
                    key={index}
                    className={cn(
                      "flex items-start gap-3 text-body leading-snug",
                      step.complete ? "text-muted-fg" : "text-ink",
                    )}
                  >
                    {esign ? (
                      <span
                        aria-hidden
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-parchment text-label font-medium tabular-nums text-muted-fg"
                      >
                        {step.complete ? <Icon name="check" size={16} /> : index + 1}
                      </span>
                    ) : step.complete ? (
                      <Icon name="check" size={18} className="mt-px shrink-0" />
                    ) : (
                      <span aria-hidden className="mt-0.5 h-4 w-4 shrink-0 rounded-[4px] border border-line" />
                    )}
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            )}
    </>
  );

  const proofControls = (
    <>
            {/* The record's controls: take the proof back, replace it, or undo the step. */}
            {step.complete ? (
              <div className="flex flex-wrap items-center justify-end gap-1 print:hidden">
                {step.evidence ? (
                  <>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
                      Replace
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAttach(null)}>
                      Remove
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
                    Attach proof
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onToggle(false)}>
                  <Icon name="undo" size={18} />
                  Undo
                </Button>
              </div>
            ) : step.evidence ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line px-4 py-2.5 print:hidden">
                <span className="text-meta leading-snug text-ink">
                  {step.evidence.name}
                  <span className="block text-label text-muted-fg">
                    Attached {format(new Date(step.evidence.attachedAt), "d MMM yyyy")}
                  </span>
                </span>
                <span className="flex items-center">
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
                    Replace
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAttach(null)}>
                    Remove
                  </Button>
                </span>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-3 rounded-control border border-dashed border-ink/25 px-4 py-2.5 text-left transition-colors hover:border-ink/40 hover:bg-paper/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 motion-reduce:transition-none print:hidden"
              >
                <Icon name="attach_file" size={18} className="shrink-0 text-muted-fg" />
                <span className="min-w-0 leading-snug">
                  <span className="block text-meta font-medium text-ink">Attach proof</span>
                  <span className="block text-label text-muted-fg">
                    {EVIDENCE_HINT[step.kind]} is enough. It stays with this document.
                  </span>
                </span>
              </button>
            )}
    </>
  );

  const header = (muted: boolean) => (
    <div className="flex items-center gap-3">
      <StepNode step={step} number={number} isNext={isNext} />
      <span className="text-meta tabular-nums text-muted-fg">{String(number).padStart(2, "0")}</span>
      <h2 className={cn("font-display text-h3", muted ? "text-muted-fg" : "text-ink")}>{title}</h2>
      <StatusPill step={step} isNext={isNext} />
    </div>
  );

  return (
    <li
      id={`step-${step.kind}`}
      className={cn(
        "scroll-mt-6 rounded-card border bg-surface p-5 print:break-inside-avoid print:p-0",
        isNext ? "border-brand" : "border-transparent",
      )}
    >
      {!step.applicable ? (
        <>
          {header(true)}
          <p className="mt-3 text-body text-muted-fg">{step.headline}</p>
          <p className="mt-2 max-w-prose text-meta text-muted-fg">
            <span className="text-ink">Why it does not apply.</span> {step.reason}
          </p>
        </>
      ) : (
        <>
          {header(false)}

          <p className="mt-2 max-w-prose text-meta leading-snug text-muted-fg">{step.detail}</p>


          <input
            ref={fileRef}
            id={fileId}
            type="file"
            aria-label={`Attach proof for ${title}`}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAttach(file.name);
              e.target.value = "";
            }}
          />

          {!esign && facts}

          {esign ? (
            <div className="mt-3 grid items-stretch gap-3 lg:grid-cols-3">
              <div className="min-w-0 rounded-control bg-paper p-4">
                <h3 className="mb-3 text-body font-medium text-ink">Steps</h3>
                {instructionList}
              </div>
              <div className="min-w-0 rounded-control bg-paper p-4">
                <h3 className="mb-2 text-body font-medium text-ink">Status</h3>
                {facts}
                <div className="mt-3">{proofControls}</div>
              </div>
              <div className="min-w-0 rounded-control bg-paper p-4">
                <h3 className="mb-3 text-body font-medium text-ink">Electronic signing</h3>
                <EsignGuide />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid items-start gap-x-6 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
              <div className="min-w-0">{instructionList}</div>
              <div className="min-w-0">{proofControls}</div>
            </div>
          )}

          {!step.complete && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-3 print:hidden">
              <p className="max-w-prose text-meta leading-snug text-muted-fg">
                {step.kind === "esignature" ? "This says both signatories have signed. " : ""}
                Who marked it, and when, is recorded. It can be taken back.
              </p>
              <Button variant={isNext ? "default" : "outline"} disabled={busy} onClick={() => onToggle(true)}>
                <Icon name="check" size={18} />
                {step.kind === "esignature" ? "Both have signed" : "Mark complete"}
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
