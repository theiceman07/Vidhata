import type { ContractDocument, Ratio } from "@/lib/types";

/**
 * The figures on the metrics page, each from the one place it is really
 * recorded and from nowhere else.
 *
 * - The override rate and the addition rate read `Finding.disposition` and
 *   `Finding.source`, which are fields for exactly this and never inferred
 *   from a rule id.
 * - The triage override rate and the corpus-currency lag have no source yet, so
 *   they have no number. A figure with nothing behind it would be invented, and
 *   a zero would say something that was never measured.
 *
 * A rate with nothing to divide is not 0%, it is "none yet": `ratio` carries
 * the counts and the page says so.
 */
/** "25%", or null when there is nothing to divide. */
export function percent(r: Ratio): string | null {
  if (r.denominator === 0) return null;
  return `${Math.round((r.numerator / r.denominator) * 100)}%`;
}

/**
 * Of the findings the first pass raised and an advocate has since decided, how
 * many the advocate overrode. A finding still open has not been decided, and a
 * finding an advocate added was never the first pass's, so neither counts.
 */
export function overrideRatio(docs: ContractDocument[]): Ratio {
  const decided = docs
    .flatMap((d) => d.findings)
    .filter((f) => f.source === "pipeline" && f.disposition !== "pending");
  return {
    numerator: decided.filter((f) => f.disposition === "overridden").length,
    denominator: decided.length,
  };
}

/** Of every finding on the record, how many an advocate added because the first pass missed it. */
export function additionRatio(docs: ContractDocument[]): Ratio {
  const all = docs.flatMap((d) => d.findings);
  return {
    numerator: all.filter((f) => f.source === "advocate").length,
    denominator: all.length,
  };
}
