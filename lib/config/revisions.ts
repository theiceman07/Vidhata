/**
 * How many times an advocate may send a document back to the client for
 * changes (FR-20). A round is counted when a document first enters
 * "revision", so a second request in the same round does not use another.
 *
 * When the limit is reached the case is logged for corpus review and no
 * further revision request can be made. Sign-off is never blocked by it: the
 * advocate can still settle each finding and sign the document off.
 *
 * This is the single place the limit is set.
 */
export const MAX_REVISION_CYCLES = 3;
