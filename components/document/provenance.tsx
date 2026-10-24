import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tick } from "@/components/shared/tick";
import { Icon } from "@/components/shared/icon";
import { useCalm } from "@/components/domain/calm";
import type { ClientDocumentSummary } from "@/lib/types";

/**
 * Where the document is in its life, and who is answerable for each part.
 *
 * Four stages: the first pass screens it, an advocate reviews it, the
 * advocate signs it off, the client executes it. The name hangs under the
 * stage where a person took responsibility, because that is the whole claim
 * the product makes: the machine did the first pass, a named advocate decided.
 * The name is the sign-off record's, so it appears when there is one and not
 * before: until then a client is told "an advocate" and nothing more.
 *
 * Two readings of the same model. The strip is for a row in a list; the
 * full chain is for the document itself. Both read what a client is handed
 * (a ClientDocument or a ClientDocumentSummary satisfies it), never the
 * internal record.
 */
export type LifecycleSource = Pick<
  ClientDocumentSummary,
  "status" | "createdAt" | "claimedAt" | "signOff" | "findingCount" | "checklist"
>;
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

export function lifecycle(doc: LifecycleSource): Stage[] {
  const s = doc.status;
  const { done, total } = doc.checklist;
  const findings = doc.findingCount;

  const screened: Stage = {
    key: "screened",
    label: "Screened",
    state: s === "draft" || s === "analysing" ? "current" : "done",
    detail:
      s === "draft"
        ? "Not submitted"
        : s === "analysing"
          ? "First pass running"
          : s === "awaiting_payment"
            ? "Screened · the fee is not yet paid"
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
    // Who is the sign-off record's to say. Before it, an advocate has claimed
    // the document, and that is all a client is told.
    detail: doc.signOff
      ? [doc.signOff.advocate, day(doc.claimedAt)].filter(Boolean).join(" · ")
      : doc.claimedAt
        ? `An advocate claimed it · ${day(doc.claimedAt)}`
        : s === "pending_review"
          ? "In the advocate queue"
          : null,
  };

  const signed: Stage = {
    key: "signed",
    label: "Signed off",
    state: s === "settled" || s === "executed" ? "done" : "ahead",
    detail: doc.signOff ? `${doc.signOff.advocate} · ${day(doc.signOff.at)}` : null,
  };

  const executed: Stage = {
    key: "executed",
    label: "Executed",
    state: s === "executed" ? "done" : s === "settled" ? "current" : "ahead",
    detail:
      s === "settled" || s === "executed"
        ? `${done} of ${total} steps complete`
        : null,
  };

  return [screened, review, signed, executed];
}

/** What the document is waiting on, in a few words. */
export function stageCaption(doc: LifecycleSource): string {
  switch (doc.status) {
    case "draft":
      return "Not submitted";
    case "analysing":
      return "First pass running";
    case "awaiting_payment":
      return "Awaiting payment";
    case "pending_review":
      return "In the advocate queue";
    case "under_review":
      return "With an advocate";
    case "revision":
      return "Changes requested";
    case "settled":
      return `Signed off · ${doc.checklist.done} of ${doc.checklist.total} steps done`;
    case "executed":
      return "Executed";
  }
}

/**
 * One colour, one meaning: a done stage is green, the stage in hand is blue,
 * a request for changes (the one stage that needs the client) is marigold.
 */
function segmentClass(stage: Stage): string {
  if (stage.state === "attention") return "bg-move";
  if (stage.state === "current") return "bg-progress";
  if (stage.state === "ahead") return "bg-line";
  return "bg-done";
}

/** The compact reading, for a row in a list. */
export function LifecycleStrip({
  doc,
  className,
}: {
  doc: LifecycleSource;
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
          doc.status === "revision" ? "text-move-text" : "text-muted-fg",
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

/**
 * A stage in a few words, for a stepper with no room for the full detail:
 * a date once it has happened, the person answerable while it is
 * happening, and what it waits on while it is still ahead.
 */
function stageNote(doc: LifecycleSource, stage: Stage): string {
  const short = (iso: string | null) => (iso ? format(new Date(iso), "d MMM") : "");
  const { done, total } = doc.checklist;

  switch (stage.key) {
    case "screened":
      if (doc.status === "draft") return "Not submitted";
      if (doc.status === "analysing") return "Running now";
      return short(doc.createdAt);
    case "review":
      if (stage.state === "attention") return "Waiting on you";
      if (stage.state === "done") return doc.signOff?.advocate ?? "Complete";
      if (stage.state === "current") return doc.claimedAt ? "With an advocate" : "In the queue";
      return "After screening";
    case "signed":
      return stage.state === "done" ? short(doc.signOff?.at ?? null) : "After review";
    case "executed":
      if (stage.state === "done") return "Complete";
      if (stage.state === "current") return `${done} of ${total} steps`;
      return "After sign-off";
  }
}

/**
 * One station on the line: a done stage is the green tick, the stage in
 * hand is a blue ring with a dot, a request for changes is marigold, and
 * stages ahead are muted outlines holding their number.
 */
function StageNode({ stage, index }: { stage: Stage; index: number }) {
  const state = stage.state === "attention" ? "move" : stage.state;
  return (
    <Tick state={state} size="lg" className="relative z-10">
      {state === "ahead" ? index + 1 : undefined}
    </Tick>
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
  if (next.state === "attention") return { fill: "half", tone: "bg-move" };
  if (next.state === "current") return { fill: "half", tone: "bg-progress" };
  return { fill: "full", tone: "bg-done" };
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
 * what it waits on beneath.
 */
export function LifecycleStepper({
  doc,
  className,
}: {
  doc: LifecycleSource;
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
                stage.state === "attention" && "text-move-text",
              )}
            >
              {SHORT_LABEL[stage.key]}
            </span>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 w-full truncate pr-2 text-label tabular-nums",
                stage.state === "attention" ? "text-move-text" : "text-muted-fg",
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
  doc: LifecycleSource;
  className?: string;
}) {
  const stages = lifecycle(doc);
  const calm = useCalm();

  if (calm) {
    return (
      <ol className={cn("relative", className)}>
        {stages.map((stage, i) => {
          const next = stages[i + 1];
          const line = next ? connectorFill(next) : null;
          const tone =
            line?.tone === "bg-done"
              ? "bg-calm-success"
              : line?.tone === "bg-move"
                ? "bg-calm-accent"
                : "bg-calm-strong";

          return (
            <li
              key={stage.key}
              className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 pb-3.5 last:pb-0"
            >
              {line && (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 left-[10.5px] top-[26px] w-px overflow-hidden bg-calm-border-strong"
                >
                  <span className={cn("block w-full", FILL_HEIGHT[line.fill], tone)} />
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                  stage.state === "done" && "bg-calm-success text-white",
                  stage.state === "attention" && "bg-calm-accent text-white",
                  stage.state === "current" && "bg-calm-strong text-white",
                  stage.state === "ahead" &&
                    "bg-calm-canvas text-calm-secondary ring-1 ring-inset ring-calm-border-strong",
                )}
              >
                {stage.state === "done" && <Icon name="check" size={16} />}
                {stage.state === "attention" && <Icon name="reply" size={16} />}
                {stage.state === "current" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                {stage.state === "ahead" && i + 1}
              </span>
              <div className="min-w-0 pt-px">
                <p
                  className={cn(
                    "text-[13px] font-medium leading-5",
                    stage.state === "ahead" ? "text-calm-secondary" : "text-calm-ink",
                    stage.state === "attention" && "text-calm-warning",
                  )}
                >
                  {stage.label}
                  {stage.state === "attention" && " · changes requested"}
                </p>
                <p className="text-[12.5px] leading-5 text-calm-secondary">
                  {stage.detail ?? stageNote(doc, stage)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("relative", className)}>
      {stages.map((stage, i) => {
        const next = stages[i + 1];
        const line = next ? connectorFill(next) : null;

        return (
          <li
            key={stage.key}
            className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3.5 pb-4 last:pb-0"
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
                  stage.state === "attention" && "text-move-text",
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
