import { reviewFindingSchema, type ReviewFinding } from "@/lib/contracts";
import type { Citation, Clause, Finding, PipelineLayer } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";

/**
 * The R1 -> screen boundary for findings.
 *
 * The backend sends findings in the R1 shape (lib/contracts.ts, snake_case); the screens
 * read their own `Finding` (lib/types.ts). This is the one place the two meet, so a change to
 * either is made here and nowhere else. A finding that does not satisfy R1 is refused: a
 * review that quietly dropped a finding would be worse than one that said it could not load.
 *
 * What R1 does not carry is given a safe stand-in rather than left to crash a screen:
 *  - `added` is an advocate's own addition, already decided. It is shown as confirmed and
 *    marked as advocate-added (`source: "advocate"`), which the screens already draw.
 *  - the finding number is the document's own, which R1 does not carry yet. Until the API
 *    gives one, findings are numbered by their place in the list, or by `numbers` if given.
 *  - a missing clause reference, clause text, rule, remedy or override note becomes the
 *    plainest value the screens already handle (see `FALLBACK`).
 */

/** Said in place of a field R1 allowed to be absent. */
export const FALLBACK = {
  clauseReference: "Whole document",
  ruleApplied: "Rule not recorded",
} as const;

export class FindingsError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "FindingsError";
  }
}

export interface MapFindingsOptions {
  /** The document's own number for each finding, by finding id. Else the list position, "01", "02". */
  numbers?: Record<string, string>;
}

const pad = (n: number): string => String(n).padStart(2, "0");

function mapCitations(finding: ReviewFinding): Citation[] {
  return finding.citations.map((c, i) => ({
    id: `${finding.finding_id}:c${i + 1}`,
    text: c.text.trim(),
    // R1 holds this to "verified iff corpus_ref", so the status is the verified flag and nothing else.
    status: c.verified ? "verified" : "blocked",
    corpusRef: c.verified ? c.corpus_ref : null,
    withdrawn: null,
  }));
}

/** One validated R1 finding as the screens' `Finding`. `number` is the document's own number for it. */
export function toScreenFinding(finding: ReviewFinding, number: string): Finding {
  const added = finding.status === "added";
  return {
    findingId: finding.finding_id,
    number,
    clientNumber: null,
    source: added ? "advocate" : "pipeline",
    layer: finding.layer as PipelineLayer,
    severity: finding.severity,
    clauseReference: finding.clause_reference?.trim() || FALLBACK.clauseReference,
    clauseText: finding.clause_text ?? "",
    description: finding.description,
    ruleApplied: finding.rule_applied?.trim() || FALLBACK.ruleApplied,
    remedySuggested: finding.remedy_suggested ?? "",
    citations: mapCitations(finding),
    disposition: finding.status === "added" ? "confirmed" : finding.status,
    overrideNote: finding.override_note?.trim() || null,
    resolvedAt: null,
    changeRequest: null,
  };
}

/** Validate what the backend sent against R1, then map it. Throws a FindingsError naming the finding that failed. */
export function mapReviewFindings(raw: unknown, options: MapFindingsOptions = {}): Finding[] {
  if (!Array.isArray(raw)) throw new FindingsError("The findings could not be read.", "expected a list");
  return raw.map((item, index) => {
    const parsed = reviewFindingSchema.safeParse(item);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(finding)"}: ${i.message}`).join("; ");
      throw new FindingsError("The findings could not be read.", `finding ${index + 1}: ${issues}`);
    }
    return toScreenFinding(parsed.data, options.numbers?.[parsed.data.finding_id] ?? pad(index + 1));
  });
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
