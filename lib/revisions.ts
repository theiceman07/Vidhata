import { MAX_REVISION_CYCLES } from "@/lib/config/revisions";
import type { ContractDocument } from "@/lib/types";

/**
 * Where a document stands against the revision limit (FR-20).
 *
 * The limit counts rounds, and a round is one send-back: ContractDocument's
 * revisionCount rises when it first enters "revision". Asking for more in a
 * round already open does not start another, so it is allowed up to the last
 * moment. What the limit stops is starting a round past it. It never stops
 * sign-off.
 */
export interface RevisionCycle {
  count: number;
  max: number;
  /** A round is with the client now. */
  roundOpen: boolean;
  /** Every round has been used. */
  reached: boolean;
  /** A revision request can be made. */
  canRequest: boolean;
}

export function revisionCycle(
  doc: Pick<ContractDocument, "status" | "revisionCount">,
  max: number = MAX_REVISION_CYCLES,
): RevisionCycle {
  const closed = doc.status === "settled" || doc.status === "executed";
  const roundOpen = doc.status === "revision";
  return {
    count: doc.revisionCount,
    max,
    roundOpen,
    reached: doc.revisionCount >= max,
    canRequest: !closed && (roundOpen || doc.revisionCount < max),
  };
}

/**
 * "Revision 2 of 3", or null before the first send-back. At the limit with a
 * round still open it says so, because that is why a request still works.
 */
export function revisionCounter(cycle: RevisionCycle): string | null {
  if (cycle.count === 0) return null;
  const counter = `Revision ${cycle.count} of ${cycle.max}`;
  return cycle.reached && cycle.roundOpen ? `${counter} (this round is open)` : counter;
}

/**
 * What the advocate is told when the limit is reached, or null when it is
 * not. It says the case is logged, and that sign-off is still theirs to give.
 */
export function revisionNotice(cycle: RevisionCycle): string | null {
  if (!cycle.reached) return null;
  return cycle.roundOpen
    ? `Revision ${cycle.count} of ${cycle.max} is the last round, and it is with the client. The case is logged for corpus review.`
    : `Revision limit reached (${cycle.count} of ${cycle.max}). The case is logged for corpus review, and no further revision can be requested. You can still settle each finding and sign off.`;
}

/** Why a revision request is refused, or null when it is not. */
export function revisionBlockedReason(cycle: RevisionCycle): string | null {
  if (cycle.canRequest) return null;
  const used = cycle.max === 1 ? "its one revision round" : `all ${cycle.max} revision rounds`;
  return cycle.reached
    ? `This document has used ${used}, and the case is logged for corpus review. You can still settle each finding and sign off.`
    : "A signed-off document takes no further revision requests.";
}
