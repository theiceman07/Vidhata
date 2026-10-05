import {
  clauseNumberFromReference,
  type ClientDocument,
  type ClientFinding,
  type ContractDocument,
  type Finding,
} from "@/lib/types";

/**
 * A client's settled document, in the shape the shared workspace reads.
 *
 * The workspace (components/document/workspace.tsx) serves both portals and is
 * built around the advocate's record. A client reads it after sign-off,
 * read-only, so this gives it what it asks for from what a client has and
 * nothing more: every field is the client's own, or a constant that says
 * nothing. There is no rule id, no layer, no override note and no resolution
 * time to give, and the workspace shows none of them to a client.
 *
 * A finding is held under its client number, which is also the id the
 * workspace selects and links it by, so nothing a client reads carries an id of
 * the document's own. The advocate is the sign-off record's, and there is one
 * only because the document is signed off.
 */
export function workspaceDocOf(doc: ClientDocument): ContractDocument {
  const findings: Finding[] = doc.findingList.flatMap((f) => (f.detail ? [workspaceFinding(f)] : []));

  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    tier: doc.tier,
    orgId: "",
    clientName: doc.deal.clientName,
    counterpartyName: doc.deal.counterpartyName,
    stateOfExecution: doc.deal.stateOfExecution,
    transactionValue: doc.deal.transactionValue,
    counterpartyIsMsme: doc.deal.counterpartyIsMsme,
    durationMonths: doc.deal.durationMonths,
    governingLaw: doc.deal.governingLaw,
    keyTerms: doc.deal.keyTerms,
    createdAt: doc.createdAt,
    version: doc.version,
    revisionCount: 0,
    claimedAt: doc.claimedAt,
    settledAt: doc.signOff?.at ?? null,
    executedAt: doc.executedAt ?? null,
    analysisCompletesAt: null,
    advocate: doc.signOff
      ? { id: "", name: doc.signOff.advocate, bar: doc.signOff.enrolment }
      : null,
    clauses: doc.clauses.map((c) => ({
      id: c.number,
      number: c.number,
      heading: c.heading,
      body: c.body,
      findingIds: findings
        .filter((f) => clauseNumberFromReference(f.clauseReference) === c.number)
        .map((f) => f.findingId),
      revisedAt: null,
    })),
    findings,
    executionSteps: doc.executionSteps,
  };
}

function workspaceFinding(f: ClientFinding): Finding {
  const detail = f.detail!;
  return {
    findingId: f.number,
    number: f.number,
    clientNumber: f.number,
    source: detail.advocateAdded ? "advocate" : "pipeline",
    layer: 0,
    severity: detail.severity,
    clauseReference: f.clauseReference,
    clauseText: f.clauseText ?? "",
    description: detail.description,
    ruleApplied: "",
    remedySuggested: detail.remedySuggested,
    citations: detail.citations.map((c) => ({
      id: c.id,
      text: c.text,
      status: c.status,
      corpusRef: c.corpusRef,
      // That it was withdrawn is said; the advocate's note on it is not the client's.
      withdrawn: c.withdrawn ? { note: "", at: "", by: "" } : null,
    })),
    disposition: detail.disposition,
    overrideNote: null,
    resolvedAt: null,
    changeRequest: f.request
      ? {
          request: f.request.request,
          requestedAt: f.request.requestedAt,
          // Not the client's to be given: the workspace says "your advocate" for a client.
          requestedBy: "",
          response: f.request.response,
          respondedAt: f.request.respondedAt,
        }
      : null,
  };
}

/** The number each finding is read by, by the id the workspace holds it under. They are the same. */
export function workspaceNumbering(doc: ClientDocument): Record<string, string> {
  return Object.fromEntries(doc.findingList.map((f) => [f.number, f.number]));
}
