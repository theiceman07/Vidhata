import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  const findings = doc.findings.length;

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

/** The full chain of custody, for the document itself. */
export function Provenance({
  doc,
  className,
}: {
  doc: ContractDocument;
  className?: string;
}) {
  const stages = lifecycle(doc);

  return (
    <ol className={cn("space-y-3", className)}>
      {stages.map((stage) => (
        <li key={stage.key} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 h-2 w-2 rounded-[1px]",
              stage.state === "ahead"
                ? "border border-line"
                : stage.state === "current"
                  ? "border border-muted-fg"
                  : segmentClass(stage),
            )}
          />
          <div className="min-w-0">
            <p
              className={cn(
                "text-meta",
                stage.state === "ahead" ? "text-muted-fg" : "text-ink",
                stage.state === "attention" && "text-caution-fg",
              )}
            >
              {stage.label}
              {stage.state === "attention" && " · changes requested"}
            </p>
            {stage.detail && (
              <p className="text-label text-muted-fg">{stage.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
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
 * The lifecycle as a labelled stepper, for rows with room to say it:
 * four stations on one line, each named, with the one the document is
 * at marked. Decisions (sign-off, execution) carry the accent; a request
 * for changes carries caution.
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
    <ol aria-label={stageCaption(doc)} className={cn("grid grid-cols-4", className)}>
      {stages.map((stage, i) => {
        const next = stages[i + 1];
        return (
          <li key={stage.key} className="relative flex flex-col items-start">
            {next && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-3 right-0 top-[5px] h-0.5 rounded-full",
                  next.state === "done"
                    ? isDecision(next.key)
                      ? "bg-accent"
                      : "bg-ink"
                    : "bg-line",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 h-3 w-3 rounded-full",
                stage.state === "done" && (isDecision(stage.key) ? "bg-accent" : "bg-ink"),
                stage.state === "current" && "bg-paper ring-2 ring-ink",
                stage.state === "attention" && "bg-caution ring-4 ring-caution/25",
                stage.state === "ahead" && "bg-line",
              )}
            />
            <span
              className={cn(
                "mt-2 text-label",
                stage.state === "ahead" ? "text-muted-fg" : "text-ink",
                (stage.state === "current" || stage.state === "attention") && "font-medium",
                stage.state === "attention" && "text-caution-fg",
              )}
            >
              {SHORT_LABEL[stage.key]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
