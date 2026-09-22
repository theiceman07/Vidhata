import type { ContractDocument } from "@/lib/types";
import { findingState } from "@/lib/findings";

/**
 * The audit trail.
 *
 * Derived, not stored. Every entry below is already recorded somewhere
 * in the document — when it was created, what the first pass raised,
 * how each finding was disposed of, who signed it off — so the trail is
 * a reading of the record rather than a second copy of it that could
 * drift out of step with it.
 *
 * Settling never deletes a finding, which is what makes this possible.
 */
export interface AuditEntry {
  /** ISO 8601. */
  at: string;
  /** Who acted. Named, never "the system". */
  actor: string;
  action: string;
  /** The clause or finding the action concerned, if any. */
  ref: string | null;
}

export function buildAuditTrail(doc: ContractDocument): AuditEntry[] {
  const entries: AuditEntry[] = [
    {
      at: doc.createdAt,
      actor: doc.clientName,
      action: "Document created from intake",
      ref: null,
    },
  ];

  if (doc.findings.length > 0 || doc.status !== "draft") {
    entries.push({
      at: doc.createdAt,
      actor: "AI first pass",
      action:
        doc.findings.length === 0
          ? "Completed. No findings raised"
          : `Completed. ${doc.findings.length} ${doc.findings.length === 1 ? "finding" : "findings"} raised`,
      ref: null,
    });
  }

  doc.findings.forEach((finding, i) => {
    const number = String(i + 1).padStart(2, "0");

    entries.push({
      at: doc.createdAt,
      actor: "AI first pass",
      action: `Finding ${number} raised · ${finding.severity} severity`,
      ref: finding.clauseReference,
    });

    if (findingState(finding) === "settled") {
      entries.push({
        // The mock layer records no per-finding timestamp, so a settled
        // finding is dated by the sign-off it contributed to. A backend
        // should carry a real resolvedAt and this should read it.
        at: doc.settledAt ?? doc.createdAt,
        actor: doc.advocate ? `${doc.advocate.name}, advocate` : "Advocate",
        action: finding.overrideNote
          ? `Finding ${number} settled with a note`
          : `Finding ${number} settled`,
        ref: finding.clauseReference,
      });
    }
  });

  doc.clauses
    .filter((clause) => clause.revisedAt)
    .forEach((clause) => {
      entries.push({
        at: clause.revisedAt as string,
        actor: doc.advocate ? `${doc.advocate.name}, advocate` : "Advocate",
        action: "Clause wording revised",
        ref: `Clause ${clause.number}`,
      });
    });

  if (doc.settledAt && doc.advocate) {
    entries.push({
      at: doc.settledAt,
      actor: `${doc.advocate.name}, advocate`,
      action: `Signed off · bar council no. ${doc.advocate.bar}`,
      ref: null,
    });
  }

  return entries.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
