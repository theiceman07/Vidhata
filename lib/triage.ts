import type { ContractDocument, ReviewTier } from "@/lib/types";

// Mock thresholds. The real triage scores value and risk together at the
// advocate handoff layer; until it lands, this reads only the deal facts the
// client stated, so a tier is never something the client picks.
const SENIOR_VALUE = 10_000_000;
const ENHANCED_VALUE = 1_000_000;

export function assignReviewTier(
  doc: Pick<ContractDocument, "type" | "transactionValue" | "counterpartyIsMsme">,
): ReviewTier {
  if (doc.type === "employment" || doc.transactionValue >= SENIOR_VALUE) {
    return "senior";
  }
  if (
    doc.type === "msa" ||
    doc.counterpartyIsMsme ||
    doc.transactionValue >= ENHANCED_VALUE
  ) {
    return "enhanced";
  }
  return "standard";
}
