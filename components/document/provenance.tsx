import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/shared/icon";
import { firstPassFindings } from "@/lib/findings";
import type { ContractDocument } from "@/lib/types";

/**
 * Where the document is in its life, and who is answerable for each part.
 *
 * Four stages: the first pass screens it, an advocate reviews it, the
 * advocate signs it off, the client executes it. The names hang under
 * the stages where a person took responsibility, because that is the
 * whole claim the product makes: the machine did the first pass, a named
 * advocate decided.
 *
 * Two readings of the same model. The strip is for a row in a list; the
 * full chain is for the document itself.
 */
type StageKey = "screened" | "review" | "signed" | "executed";

interface Stage {
  key: StageKey;
  label: string;
  state: "done" | "current" | "attention" | "ahead";
  /** Who, and when, once it has happened. */
  detail: string | null;
}

function day(iso: string | null): string | null {
  return iso ? format(new Date(iso), "d MMM yyyy") : null;
}

export function lifecycle(doc: ContractDocument): Stage[] {
  const s = doc.status;
  const applicable = doc.executionSteps.filter((step) => step.applicable);
  const done = applicable.filter((step) => step.complete).length;
  const findings = firstPassFindings(doc).length;

  const screened: Stage = {
    key: "screened",
    label: "Screened",
    state: s === "draft" || s === "analysing" ? "current" : "done",
    detail:
      s === "draft"
        ? "Not submitted"
        : s === "analysing"
          ? "First pass running"
          : `First pass · ${findings} ${findings === 1 ? "finding" : "findings"} raised`,
  };

  const review: Stage = {
    key: "review",
    label: "Advocate review",
    state:
      s === "revision"
        ? "attention"
        : s === "pending_review" || s === "under_review"
          ? "current"
          : s === "settled" || s === "executed"
            ? "done"
            : "ahead",
    detail: doc.advocate
      ? [doc.advocate.name, day(doc.claimedAt)].filter(Boolean).join(" · ")
      : s === "pending_review"
        ? "In the advocate queue"
        : null,
  };

  const signed: Stage = {
    key: "signed",
    label: "Signed off",
    state: s === "settled" || s === "executed" ? "done" : "ahead",
    detail:
      doc.settledAt && doc.advocate
        ? `${doc.advocate.name} · ${day(doc.settledAt)}`
        : null,
  };

  const executed: Stage = {
    key: "executed",
    label: "Executed",
    state: s === "executed" ? "done" : s === "settled" ? "current" : "ahead",
    detail:
      s === "settled" || s === "executed"
        ? `${done} of ${applicable.length} steps complete`
        : null,
  };

  return [screened, review, signed, executed];
}

/** What the document is waiting on, in a few words. */
export function stageCaption(doc: ContractDocument): string {
  switch (doc.status) {
    case "draft":
      return "Not submitted";
    case "analysing":
      return "First pass running";
    case "pending_review":
      return "In the advocate queue";
    case "under_review":
      return doc.advocate ? `With ${doc.advocate.name}` : "With an advocate";
    case "revision":
      return "Changes requested";
    case "settled": {
      const steps = doc.executionSteps.filter((step) => step.applicable);
      const done = steps.filter((step) => step.complete).length;
      return `Signed off · ${done} of ${steps.length} steps done`;
    }
    case "executed":
      return "Executed";
  }
}

/**
 * Colour is earned. Sign-off and execution are decisions, so they are the
 * only stages that carry the accent; a request for changes is the one
 * stage that needs the client, so it alone carries caution.
 */
function segmentClass(stage: Stage): string {
  if (stage.state === "attention") return "bg-caution";
  if (stage.state === "current") return "bg-muted-fg/40";
  if (stage.state === "ahead") return "bg-line";
  return stage.key === "signed" || stage.key === "executed" ? "bg-accent" : "bg-ink";
}

/** The compact reading, for a row in a list. */
export function LifecycleStrip({
  doc,
  className,
}: {
  doc: ContractDocument;
  className?: string;
}) {
  const stages = lifecycle(doc);
  const caption = stageCaption(doc);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        role="img"
        aria-label={`${caption}. ${stages.map((s) => `${s.label} ${s.state === "done" ? "complete" : s.state === "ahead" ? "not started" : "in progress"}`).join(", ")}.`}
        className="flex shrink-0 gap-0.5"
      >
        {stages.map((stage) => (
          <span
            key={stage.key}
            className={cn("h-1 w-6 rounded-[1px]", segmentClass(stage))}
          />
        ))}
      </span>
      <span
        className={cn(
          "truncate text-label",
          doc.status === "revision" ? "text-caution-fg" : "text-muted-fg",
        )}
      >
        {caption}
      </span>
    </div>
  );
}

const SHORT_LABEL: Record<StageKey, string> = {
  screened: "Screened",
  review: "Review",
  signed: "Signed off",
  executed: "Executed",
};

const isDecision = (key: StageKey) => key === "signed" || key === "executed";

/**
 * A stage in a few words, for a stepper with no room for the full detail:
 * a date once it has happened, the person answerable while it is
 * happening, and what it waits on while it is still ahead.
 */
function stageNote(doc: ContractDocument, stage: Stage): string {
  const short = (iso: string | null) => (iso ? format(new Date(iso), "d MMM") : "");
  const applicable = doc.executionSteps.filter((step) => step.applicable);
  const done = applicable.filter((step) => step.complete).length;

  switch (stage.key) {
    case "screened":
      if (doc.status === "draft") return "Not submitted";
      if (doc.status === "analysing") return "Running now";
      return short(doc.createdAt);
    case "review":
      if (stage.state === "attention") return "Waiting on you";
      if (stage.state === "done") return doc.advocate?.name ?? "Complete";
      if (stage.state === "current") return doc.advocate?.name ?? "In the queue";
      return "After screening";
    case "signed":
      return stage.state === "done" ? short(doc.settledAt) : "After review";
    case "executed":
      if (stage.state === "done") return "Complete";
      if (stage.state === "current") return `${done} of ${applicable.length} steps`;
      return "After sign-off";
  }
}

/**
 * One station on the line. Done stages carry a tick, ink for the work and
 * accent for the decisions; the stage in hand is ringed; a request for
 * changes is the one caution fill; stages ahead show only their number.
 */
function StageNode({ stage, index }: { stage: Stage; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        stage.state === "done" &&
          (isDecision(stage.key) ? "bg-accent text-accent-fg" : "bg-ink text-paper"),
        stage.state === "current" && "bg-paper ring-2 ring-inset ring-ink",
        stage.state === "attention" && "bg-caution text-paper ring-4 ring-caution/20",
        stage.state === "ahead" && "bg-parchment text-muted-fg ring-1 ring-inset ring-line",
      )}
    >
      {stage.state === "done" && <Icon name="check" size={16} />}
      {stage.state === "current" && <span className="h-2 w-2 rounded-full bg-ink" />}
      {stage.state === "attention" && (
        <span className="text-label font-semibold leading-none">!</span>
      )}
      {stage.state === "ahead" && (
        <span className="font-mono text-label leading-none">{index + 1}</span>
      )}
    </span>
  );
}

type Fill = "none" | "half" | "full";

/**
 * The line between two stations. Filled once the next stage is reached;
 * half filled while the next stage is in hand, so the eye reads where the
 * document is without counting stations.
 */
function connectorFill(next: Stage): { fill: Fill; tone: string } {
  if (next.state === "ahead") return { fill: "none", tone: "" };
  if (next.state === "attention") return { fill: "half", tone: "bg-caution" };
  if (next.state === "current") return { fill: "half", tone: "bg-ink" };
  return { fill: "full", tone: isDecision(next.key) ? "bg-accent" : "bg-ink" };
}

const FILL_WIDTH: Record<Fill, string> = { none: "w-0", half: "w-1/2", full: "w-full" };
const FILL_HEIGHT: Record<Fill, string> = { none: "h-0", half: "h-1/2", full: "h-full" };

function stateWords(stage: Stage): string {
  if (stage.state === "done") return "complete";
  if (stage.state === "ahead") return "not started";
  if (stage.state === "attention") return "waiting on you";
  return "in progress";
}

/**
 * The lifecycle as a labelled stepper, for rows with room to say it:
 * four stations on one line, each named, each with its date, person or
 * what it waits on beneath. Decisions (sign-off, execution) carry the
 * accent; a request for changes carries caution.
 */
export function LifecycleStepper({
  doc,
  className,
}: {
  doc: ContractDocument;
  className?: string;
}) {
  const stages = lifecycle(doc);

  return (
    <ol
      aria-label={`${stageCaption(doc)}. ${stages
        .map((s) => `${s.label} ${stateWords(s)}`)
        .join(", ")}.`}
      className={cn("grid grid-cols-4", className)}
    >
      {stages.map((stage, i) => {
        const next = stages[i + 1];
        const line = next ? connectorFill(next) : null;
        const reached = stage.state !== "ahead";

        return (
          <li key={stage.key} className="relative flex min-w-0 flex-col items-start">
            {line && (
              <span
                aria-hidden
                className="absolute left-9 right-2 top-[12.5px] h-[3px] overflow-hidden rounded-full bg-line"
              >
                <span
                  className={cn("block h-full rounded-full", FILL_WIDTH[line.fill], line.tone)}
                />
              </span>
            )}
            <StageNode stage={stage} index={i} />
            <span
              aria-hidden
              className={cn(
                "mt-2.5 text-meta font-medium leading-tight",
                reached ? "text-ink" : "text-muted-fg",
                stage.state === "attention" && "text-caution-fg",
              )}
            >
              {SHORT_LABEL[stage.key]}
            </span>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 w-full truncate pr-2 text-label tabular-nums",
                stage.state === "attention" ? "text-caution-fg" : "text-muted-fg",
              )}
            >
              {stageNote(doc, stage)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The full chain of custody, for the document itself: the same stations
 * as the stepper, stood on end, each with who answered for it and when.
 */
export function Provenance({
  doc,
  className,
}: {
  doc: ContractDocument;
  className?: string;
}) {
  const stages = lifecycle(doc);

  return (
    <ol className={cn("relative", className)}>
      {stages.map((stage, i) => {
        const next = stages[i + 1];
        const line = next ? connectorFill(next) : null;

        return (
          <li
            key={stage.key}
            className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3.5 pb-6 last:pb-0"
          >
            {line && (
              <span
                aria-hidden
                className="absolute bottom-1 left-[12.5px] top-9 w-[3px] overflow-hidden rounded-full bg-line"
              >
                <span
                  className={cn("block w-full rounded-full", FILL_HEIGHT[line.fill], line.tone)}
                />
              </span>
            )}
            <StageNode stage={stage} index={i} />
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-meta font-medium",
                  stage.state === "ahead" ? "text-muted-fg" : "text-ink",
                  stage.state === "attention" && "text-caution-fg",
                )}
              >
                {stage.label}
                {stage.state === "attention" && " · changes requested"}
              </p>
              <p className="mt-0.5 text-label text-muted-fg">
                {stage.detail ?? stageNote(doc, stage)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
