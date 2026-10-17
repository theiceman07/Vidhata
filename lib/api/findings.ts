import { reviewFindingSchema, type ReviewFinding } from "@/lib/contracts";
import type { Clause, Finding } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";

/**
 * The R1 -> screen boundary for findings.
 *
 * The backend sends findings in the R1 shape (lib/contracts.ts, snake_case); the screens
 * read their own `Finding` (lib/types.ts). This is the one place the two meet, so a change to
 * either is made here and nowhere else.
 *
 * It is tolerant of a finding, not of the list. One finding that does not satisfy R1 is
 * skipped and counted, and the rest are kept, so one bad row never blanks a review. The count
 * comes back with them (`skipped`), and `skippedNotice` words it for the screen. A payload
 * that is not a list at all is refused, because then there is nothing to keep.
 *
 * What R1 does not carry is given a safe stand-in rather than left to crash a screen:
 *  - `added` is an advocate's own addition, already decided. It is shown as confirmed and
 *    marked as advocate-added (`source: "advocate"`), which the screens already draw.
 *  - the finding number is the document's own, which R1 does not carry yet. Until the API
 *    gives one, findings are numbered by their place in the list, or by `numbers` if given.
 *  - the quoted clause text and the advocate's note are not in the agent's schema, so they are
 *    empty unless the findings API sends them.
 */

export class FindingsError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "FindingsError";
  }
}

export interface MappedFindings {
  findings: Finding[];
  /** How many findings did not satisfy R1 and were left out. */
  skipped: number;
}

export interface MapFindingsOptions {
  /** The document's own number for each finding, by finding id. Else the list position, "01", "02". */
  numbers?: Record<string, string>;
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** One validated R1 finding as the screens' `Finding`. `number` is the document's own number for it. */
export function toScreenFinding(finding: ReviewFinding, number: string): Finding {
  const added = finding.status === "added";
  return {
    findingId: finding.finding_id,
    number,
    clientNumber: null,
    source: added ? "advocate" : "pipeline",
    layer: finding.layer,
    severity: finding.severity,
    clauseReference: finding.clause_reference,
    clauseText: finding.clause_text?.trim() ?? "",
    description: finding.description,
    ruleApplied: finding.rule_applied,
    remedySuggested: finding.remedy_suggested,
    citation: finding.citation,
    disposition: finding.status === "added" ? "confirmed" : finding.status,
    overrideNote: finding.override_note?.trim() || null,
    resolvedAt: null,
    changeRequest: null,
  };
}

/**
 * Validate what the backend sent against R1, then map it. A finding that fails is skipped and
 * counted; the others are mapped. Numbering by position is by place in the list as sent, so a
 * skipped finding leaves a gap rather than renumbering the ones after it.
 */
export function mapReviewFindings(raw: unknown, options: MapFindingsOptions = {}): MappedFindings {
  if (!Array.isArray(raw)) throw new FindingsError("The findings could not be read.", "expected a list");
  const findings: Finding[] = [];
  let skipped = 0;
  raw.forEach((item, index) => {
    const parsed = reviewFindingSchema.safeParse(item);
    if (!parsed.success) {
      skipped += 1;
      return;
    }
    findings.push(toScreenFinding(parsed.data, options.numbers?.[parsed.data.finding_id] ?? pad(index + 1)));
  });
  return { findings, skipped };
}

/** The plain statement that some findings were left out, or null when none were. */
export function skippedNotice(skipped: number): string | null {
  if (skipped <= 0) return null;
  return `${skipped} ${skipped === 1 ? "finding" : "findings"} couldn't be shown`;
}

/**
 * R1 does not say which clause lists a finding; the screens do (`clause.findingIds`), and read
 * the finding off its clause. This derives that from each finding's clause reference. A finding
 * whose reference matches no clause (such as "Whole document") is on no clause.
 */
export function linkFindingsToClauses(clauses: Clause[], findings: Finding[]): Clause[] {
  return clauses.map((clause) => ({
    ...clause,
    findingIds: findings.filter((f) => clauseNumberFromReference(f.clauseReference) === clause.number).map((f) => f.findingId),
  }));
}
