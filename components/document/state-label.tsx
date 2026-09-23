import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/types";
import type { FindingState } from "@/lib/findings";

/**
 * A workflow state, set in the notation voice.
 *
 * Document, finding and citation states each have their own words here,
 * and they are never merged into one "status": a document can be with the
 * client while one of its findings is still open with the advocate, and
 * the screen has to be able to say both.
 *
 * Colour is carried by the semantic tokens and is always paired with the
 * word, never a substitute for it.
 */
export type LabelState =
  | DocumentStatus
  | FindingState
  | "citation_verified"
  | "citation_blocked"
  | "citation_withdrawn";

const CAUTION = {
  tone: "text-caution-fg border-caution/40",
  solid: "bg-caution text-paper border-transparent",
};
const VERIFIED = {
  tone: "text-verified border-verified/30",
  solid: "bg-verified text-paper border-transparent",
};
const FLAGGED = {
  tone: "text-flagged border-flagged/30",
  solid: "bg-flagged text-paper border-transparent",
};
const QUIET = {
  tone: "text-muted-fg border-line",
  solid: "bg-muted-fg text-paper border-transparent",
};

const LABEL: Record<LabelState, { text: string; tone: string; solid: string }> =
  {
    draft: { text: "Draft", ...QUIET },
    analysing: {
      text: "Screening",
      tone: "text-info border-info/30",
      solid: "bg-info text-paper border-transparent",
    },
    pending_review: { text: "Awaiting advocate", ...CAUTION },
    under_review: { text: "Advocate review", ...CAUTION },
    // An advocate asked the client for something. Whose move it is, not a
    // severity, so it is caution rather than flagged: nothing is wrong.
    revision: { text: "Changes requested", ...CAUTION },
    settled: { text: "Settled", ...VERIFIED },
    executed: { text: "Executed", ...VERIFIED },
    open: { text: "Open", ...CAUTION },
    with_client: { text: "With client", ...QUIET },
    citation_verified: { text: "Verified", ...VERIFIED },
    citation_blocked: { text: "Blocked", ...FLAGGED },
    citation_withdrawn: { text: "Withdrawn", ...QUIET },
  };

export function stateText(state: LabelState): string {
  return LABEL[state].text;
}

export function StateLabel({
  state,
  tone = "outline",
  className,
}: {
  state: LabelState;
  /**
   * Solid is reserved for the one authoritative moment on a screen,
   * in practice sign-off. Everywhere else the outline keeps colour quiet
   * enough that it still means something when it appears.
   */
  tone?: "outline" | "solid";
  className?: string;
}) {
  const label = LABEL[state];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5",
        "text-label font-medium",
        tone === "solid" ? label.solid : label.tone,
        className,
      )}
    >
      {label.text}
    </span>
  );
}
