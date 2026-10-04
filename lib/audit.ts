import { clauseNumberFromReference, type ContractDocument } from "@/lib/types";
import {
  clientVisibleFindings,
  findingNumbers,
  findingState,
  firstPassFindings,
} from "@/lib/findings";

/**
 * The audit trail.
 *
 * Derived, not stored. Every entry below is already recorded somewhere
 * in the document, so the trail is a reading of the record rather than a
 * second copy of it that could drift out of step with it.
 *
 * Settling never deletes a finding, and withdrawing never deletes a
 * citation, which is what makes this possible.
 */
export interface AuditEntry {
  /** ISO 8601. */
  at: string;
  /** Who acted. Named, never "the system". */
  actor: string;
  action: string;
  /** The finding the action concerned, if any, so the trail can link to it. */
  findingId: string | null;
  /** The clause or finding the action concerned, as a reader would say it. */
  ref: string | null;
  /** Decisions are drawn differently from events. */
  kind: "event" | "decision";
  /**
   * The number of the clause whose wording the action changed ("6.1"), set
   * only for a revision. It lets the client's trail say that a draft was
   * revised without saying where.
   */
  clause?: string;
  /** An entry about the advocate's own working, which the client's trail leaves out. */
  advocateOnly?: boolean;
}

export function buildAuditTrail(doc: ContractDocument): AuditEntry[] {
  const numbers = findingNumbers(doc);
  const advocate = doc.advocate ? `${doc.advocate.name}, advocate` : "Advocate";

  const entries: AuditEntry[] = [
    {
      at: doc.createdAt,
      actor: doc.clientName,
      action: "Document created from intake",
      findingId: null,
      ref: null,
      kind: "event",
    },
  ];

  if (doc.status !== "draft" && doc.status !== "analysing") {
    // The first pass's own count: findings an advocate added are not its work.
    const raised = firstPassFindings(doc).length;
    entries.push({
      at: doc.createdAt,
      actor: "AI first pass",
      action:
        raised === 0
          ? "Screening completed · no findings raised"
          : `Screening completed · ${raised} ${raised === 1 ? "finding" : "findings"} raised`,
      findingId: null,
      ref: null,
      kind: "event",
    });
  }

  // The fact of payment, never the amount: that is on billing.
  if (doc.payment) {
    entries.push({
      at: doc.payment.paidAt,
      actor: doc.clientName,
      action: "Fee paid",
      findingId: null,
      ref: null,
      kind: "event",
    });
  }

  if (doc.claimedAt && doc.advocate) {
    entries.push({
      at: doc.claimedAt,
      actor: advocate,
      action: "Claimed for review",
      findingId: null,
      ref: null,
      kind: "event",
    });
  }

  if (doc.conflictDeclaredAt && doc.advocate) {
    entries.push({
      at: doc.conflictDeclaredAt,
      actor: advocate,
      action: "Declared no conflict of interest with either party",
      findingId: null,
      ref: null,
      kind: "decision",
    });
  }

  if (doc.corpusReviewLoggedAt) {
    entries.push({
      at: doc.corpusReviewLoggedAt,
      actor: "Corpus review log",
      action: "Revision limit reached · case logged for corpus review",
      findingId: null,
      ref: null,
      kind: "event",
      advocateOnly: true,
    });
  }

  doc.findings.forEach((finding) => {
    const n = numbers[finding.findingId];
    const ref = `Finding ${n} · ${finding.clauseReference}`;

    finding.citations.forEach((citation) => {
      if (!citation.withdrawn) return;
      entries.push({
        at: citation.withdrawn.at,
        actor: `${citation.withdrawn.by}, advocate`,
        action: "Blocked source withdrawn",
        findingId: finding.findingId,
        ref,
        kind: "decision",
      });
    });

    const request = finding.changeRequest;
    if (request) {
      entries.push({
        at: request.requestedAt,
        actor: `${request.requestedBy}, advocate`,
        action: "Change requested from the client",
        findingId: finding.findingId,
        ref,
        kind: "event",
      });
      if (request.response && request.respondedAt) {
        entries.push({
          at: request.respondedAt,
          actor: doc.clientName,
          action: "Responded to the requested change",
          findingId: finding.findingId,
          ref,
          kind: "event",
        });
      }
    }

    if (findingState(finding) === "settled") {
      entries.push({
        // Findings settled before resolvedAt was recorded are dated by the
        // sign-off they contributed to.
        at: finding.resolvedAt ?? doc.settledAt ?? doc.createdAt,
        actor: advocate,
        action: finding.overrideNote ? "Finding settled with a note" : "Finding settled",
        findingId: finding.findingId,
        ref,
        kind: "decision",
      });
    }
  });

  doc.clauses
    .filter((clause) => clause.revisedAt)
    .forEach((clause) => {
      entries.push({
        at: clause.revisedAt as string,
        actor: advocate,
        action: "Clause wording revised",
        findingId: null,
        ref: `Clause ${clause.number}`,
        kind: "decision",
        clause: clause.number,
      });
    });

  if (doc.settledAt && doc.advocate) {
    entries.push({
      at: doc.settledAt,
      actor: advocate,
      action: `Signed off · enrolment ${doc.advocate.bar}`,
      findingId: null,
      ref: null,
      kind: "decision",
    });
  }

  doc.executionSteps.forEach((step) => {
    if (step.evidence) {
      entries.push({
        at: step.evidence.attachedAt,
        actor: doc.clientName,
        action: `Evidence attached · ${step.evidence.name}`,
        findingId: null,
        ref: null,
        kind: "event",
      });
    }
    if (step.applicable && step.complete && step.completedAt) {
      entries.push({
        at: step.completedAt,
        actor: step.completedBy ?? doc.clientName,
        action: `Execution step completed · ${step.headline}`,
        findingId: null,
        ref: null,
        kind: "event",
      });
    }
  });

  return entries.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

/**
 * The trail as the client may read it.
 *
 * Before sign-off the client sees status and the passages behind requests
 * addressed to them, nothing else, so entries about a finding are kept
 * only when the finding carries a request to the client. A revision of the
 * wording is reported as "Advocate revised the draft" with no clause, unless
 * the clause is one a request to the client is about: saying where the draft
 * changed is saying what it contains. After sign-off the whole record is
 * theirs.
 */
export function clientAuditTrail(doc: ContractDocument): AuditEntry[] {
  // Built from the client's own view of the document, so finding numbers
  // cannot skip over one the client has not been told about.
  const view: ContractDocument = { ...doc, findings: clientVisibleFindings(doc) };
  // The corpus-review log is the advocate's working record, so it is never
  // the client's, signed off or not.
  const all = buildAuditTrail(view).filter((entry) => !entry.advocateOnly);
  if (doc.status === "settled" || doc.status === "executed") return all;

  const addressed = new Set(
    view.findings.filter((f) => f.changeRequest).map((f) => f.findingId),
  );
  const addressedClauses = new Set(
    view.findings
      .filter((f) => f.changeRequest)
      .map((f) => clauseNumberFromReference(f.clauseReference)),
  );

  return all
    .filter((entry) => !entry.findingId || addressed.has(entry.findingId))
    .map((entry) =>
      entry.clause && !addressedClauses.has(entry.clause)
        ? { ...entry, action: "Advocate revised the draft", ref: null, clause: undefined }
        : entry,
    );
}
