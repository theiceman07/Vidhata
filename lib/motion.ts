/**
 * The product's motion budget, in one place.
 *
 * Inside the product, motion only ever explains a state transition. There
 * are no scroll reveals, no parallax and no celebration. If a value here
 * is not tied to a cause and its effect, it does not belong.
 *
 * Values are in seconds because Framer Motion takes seconds; the design
 * spec states them in milliseconds.
 */
export const DURATION = {
  /** Moving between clauses. Barely perceptible on purpose. */
  clauseSelect: 0.12,
  /** A finding opening with its evidence. */
  findingOpen: 0.18,
  /** The settle: the rule wipes from caution to verified. */
  settle: 0.24,
  /** The seal drawing itself, once per document, at sign-off. */
  sealDraw: 0.6,
} as const;

export const EASE = {
  /** Entering and moving. Decelerates into place. */
  standard: [0.2, 0, 0, 1],
  /** Leaving. Accelerates away. */
  exit: [0.4, 0, 1, 1],
} as const;

/**
 * Every duration above collapses to zero under prefers-reduced-motion.
 * Call sites pass the result straight into a transition, so the state
 * change still happens — it simply happens at once.
 */
export function duration(seconds: number, reduced: boolean | null): number {
  return reduced ? 0 : seconds;
}
