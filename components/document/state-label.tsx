import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/types";
import type { FindingState } from "@/lib/findings";

/**
 * A workflow state, set in the notation voice.
 *
 * Status is not decoration. It explains where a document is in its
 * journey, so every label below is a position on the arc rather than a
 * severity or a colour. Colour is carried by the semantic tokens and is
 * always paired with the word, never a substitute for it.
 */
export type LabelState =
  | DocumentStatus
  | FindingState
  | "citation_verified"
  | "citation_blocked";

const LABEL: Record<LabelState, { text: string; tone: string; solid: string }> =
  {
    draft: {
      text: "Draft",
      tone: "text-muted-fg border-line",
      solid: "bg-muted-fg text-paper border-transparent",
    },
    analysing: {
      text: "AI first pass",
      tone: "text-info border-info/30",
      solid: "bg-info text-paper border-transparent",
    },
    pending_review: {
      text: "Awaiting advocate",
      tone: "text-caution-fg border-caution/40",
      solid: "bg-caution text-paper border-transparent",
    },
    under_review: {
      text: "Advocate review",
      tone: "text-caution-fg border-caution/40",
      solid: "bg-caution text-paper border-transparent",
    },
    revision: {
      text: "Awaiting source",
      tone: "text-flagged border-flagged/30",
      solid: "bg-flagged text-paper border-transparent",
    },
    settled: {
      text: "Settled",
      tone: "text-verified border-verified/30",
      solid: "bg-verified text-paper border-transparent",
    },
    executed: {
      text: "Executed",
      tone: "text-verified border-verified/30",
      solid: "bg-verified text-paper border-transparent",
    },
    open: {
      text: "Open",
      tone: "text-caution-fg border-caution/40",
      solid: "bg-caution text-paper border-transparent",
    },
    citation_verified: {
      text: "Citation verified",
      tone: "text-verified border-verified/30",
      solid: "bg-verified text-paper border-transparent",
    },
    citation_blocked: {
      text: "Citation blocked",
      tone: "text-flagged border-flagged/30",
      solid: "bg-flagged text-paper border-transparent",
    },
  };

export function StateLabel({
  state,
  tone = "outline",
  className,
}: {
  state: LabelState;
  /**
   * Solid is reserved for the one authoritative moment on a screen —
   * in practice, sign-off. Everywhere else the outline keeps colour
   * quiet enough that it still means something when it appears.
   */
  tone?: "outline" | "solid";
  className?: string;
}) {
  const label = LABEL[state];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-control border px-2 py-0.5",
        "font-mono text-notation uppercase tracking-notation",
        tone === "solid" ? label.solid : label.tone,
        className,
      )}
    >
      {label.text}
    </span>
  );
}
