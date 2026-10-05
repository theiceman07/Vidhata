import {
  clauseNumberFromReference,
  type ClientDocument,
  type ClientFinding,
  type WorkspaceDocument,
  type WorkspaceFinding,
} from "@/lib/types";

/**
 * A client's settled document, in the shape the shared workspace reads.
 *
 * The workspace (components/document/workspace.tsx) serves both portals. It reads
 * a WorkspaceDocument, which the advocate's own record satisfies and which has no
 * place for the organisation, the claim, the rule or layer behind a finding, an
 * override note, when it was decided, who asked for a change, or the advocate's
 * id. So what a client's document is built to cannot hold them, and nothing here
 * fills them in with an empty value: they are not there to be filled.
 *
 * A finding is held under its client number, which is also the id the
 * workspace selects and links it by, so nothing a client reads carries an id of
 * the document's own. The advocate is the sign-off record's, and there is one
 * only because the document is signed off.
 */
export function workspaceDocOf(doc: ClientDocument): WorkspaceDocument {
  const findings = doc.findingList.flatMap((f) => (f.detail ? [workspaceFinding(f)] : []));

  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    tier: doc.tier,
    clientName: doc.deal.clientName,
    counterpartyName: doc.deal.counterpartyName,
    version: doc.version,
    advocate: doc.signOff ? { name: doc.signOff.advocate, bar: doc.signOff.enrolment } : null,
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

function workspaceFinding(f: ClientFinding): WorkspaceFinding {
  const detail = f.detail!;
  return {
    findingId: f.number,
    source: detail.advocateAdded ? "advocate" : "pipeline",
    severity: detail.severity,
    clauseReference: f.clauseReference,
    clauseText: f.clauseText ?? "",
    description: detail.description,
    remedySuggested: detail.remedySuggested,
    citations: detail.citations.map((c) => ({
      id: c.id,
      text: c.text,
      status: c.status,
      corpusRef: c.corpusRef,
      // That it was withdrawn is said. By whom, when and why are the advocate's.
      withdrawn: c.withdrawn ? {} : null,
    })),
    disposition: detail.disposition,
    // Who asked is not the client's to be given: the workspace says "your advocate" for a client.
    changeRequest: f.request
      ? {
          request: f.request.request,
          requestedAt: f.request.requestedAt,
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
