import type { DocumentStatus } from "@/lib/types";
import type { FindingState } from "@/lib/findings";
import type { IconName } from "@/components/shared/icon";

/**
 * One colour, one meaning. A tone is who has the move or how things stand,
 * never decoration:
 *   done      green     finished, or the brand's own decision
 *   progress  blue      in progress, the advocate's side of the work
 *   move      marigold  the client has something to do
 *   blocked   vermilion blocked, or a finding
 *   neutral   sand      nothing to read into it
 *
 * Amber (move) appears only when the client has something to do. A state
 * that is the advocate's to move is progress, however long it has waited.
 * Tone is always paired with an icon and words (StateLabel), never alone.
 */
export type Tone = "done" | "progress" | "move" | "blocked" | "neutral";

export interface ToneClasses {
  /** A tinted chip: tint fill, readable text, a fine border. */
  chip: string;
  /** The solid chip, reserved for the one authoritative moment on a screen. */
  solid: string;
  /** Text on the page or on sand. */
  text: string;
  /** A flat fill, for a dot or a bar. */
  fill: string;
  /** A margin rule that carries the state. */
  rule: string;
  /** A tinted panel. */
  panel: string;
}

// Class names are written out whole so Tailwind can see them.
export const TONE: Record<Tone, ToneClasses> = {
  done: {
    chip: "border-done/30 bg-done-tint text-done-text",
    solid: "border-transparent bg-done text-white",
    text: "text-done-text",
    fill: "bg-done",
    rule: "border-done",
    panel: "border-done/30 bg-done-tint",
  },
  progress: {
    chip: "border-progress/30 bg-progress-tint text-progress",
    solid: "border-transparent bg-progress text-white",
    text: "text-progress",
    fill: "bg-progress",
    rule: "border-progress",
    panel: "border-progress/30 bg-progress-tint",
  },
  move: {
    chip: "border-move/50 bg-move-tint text-move-text",
    solid: "border-transparent bg-move text-ink",
    text: "text-move-text",
    fill: "bg-move",
    rule: "border-move",
    panel: "border-move/50 bg-move-tint",
  },
  blocked: {
    chip: "border-blocked/30 bg-blocked-tint text-blocked",
    solid: "border-transparent bg-blocked text-white",
    text: "text-blocked",
    fill: "bg-blocked",
    rule: "border-blocked",
    panel: "border-blocked/30 bg-blocked-tint",
  },
  neutral: {
    chip: "border-line bg-sand text-muted",
    solid: "border-transparent bg-muted text-white",
    text: "text-muted",
    fill: "bg-muted",
    rule: "border-line",
    panel: "border-line bg-sand",
  },
};

export interface StateTone {
  text: string;
  tone: Tone;
  icon: IconName;
}

/**
 * Document states, read from the client's side of the move (moves.ts holds the
 * same rule for the documents list: draft, awaiting_payment and revision
 * are the client's). Screening and both advocate states are the advocate's.
 */
export const DOCUMENT_TONE: Record<DocumentStatus, StateTone> = {
  draft: { text: "Draft", tone: "move", icon: "edit" },
  analysing: { text: "Screening", tone: "progress", icon: "hourglass_top" },
  awaiting_payment: { text: "Awaiting payment", tone: "move", icon: "payments" },
  pending_review: { text: "Awaiting advocate", tone: "progress", icon: "schedule" },
  under_review: { text: "Advocate review", tone: "progress", icon: "rate_review" },
  revision: { text: "Changes requested", tone: "move", icon: "reply" },
  settled: { text: "Settled", tone: "done", icon: "check_circle" },
  executed: { text: "Executed", tone: "done", icon: "task_alt" },
};

/**
 * Finding states. A finding itself is vermilion (its rule, its mark); its
 * state says whose move it is: open is the advocate's, with the client is
 * the client's, settled is done.
 */
export const FINDING_TONE: Record<FindingState, StateTone> = {
  open: { text: "Open", tone: "progress", icon: "rate_review" },
  with_client: { text: "With client", tone: "move", icon: "reply" },
  settled: { text: "Settled", tone: "done", icon: "check_circle" },
};

export type ConsultationStatusKey = "requested" | "accepted" | "declined" | "answered";

/**
 * A consultation, for the person reading it. The fee is the client's move;
 * waiting for an answer, and answering, are the advocate's.
 */
export function consultationTone(
  c: { status: ConsultationStatusKey; paid: boolean },
  audience: "client" | "advocate",
): { tone: Tone; icon: IconName } {
  switch (c.status) {
    case "requested":
      return { tone: "progress", icon: "schedule" };
    case "declined":
      return { tone: "neutral", icon: "block" };
    case "answered":
      return { tone: "done", icon: "check_circle" };
    case "accepted":
      if (audience === "client" && !c.paid) return { tone: "move", icon: "payments" };
      return { tone: "progress", icon: "hourglass_top" };
  }
}

/** Severity colours a finding's glyph and rule. Vermilion for a finding, ink for critical. */
export const SEVERITY_FILL = {
  critical: "bg-ink",
  high: "bg-blocked",
  medium: "bg-blocked/50",
  low: "bg-muted",
} as const;
