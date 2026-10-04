/**
 * How a contract's term is said on the deal on file.
 *
 * Intake requires at least one month, so a zero never comes from what a
 * client stated. It is stored for a document with no stated term, an
 * employment agreement for one, and a term that is not there is said so
 * rather than shown as "0 months".
 */
export function termLabel(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return "Not specified";
  return months === 1 ? "1 month" : `${months} months`;
}
