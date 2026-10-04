import { clientVisibleFindings, firstPassFindings } from "@/lib/findings";
import {
  clauseNumberFromReference,
  type ClientDocument,
  type ClientDocumentSummary,
  type ContractDocument,
} from "@/lib/types";
import { asClientReads, shapeClientFindings, signOffRecord, type ShapeOptions } from "./shape-findings";

/**
 * A document as a client reads it, built from the internal record.
 *
 * Every field is named here, so a field added to `ContractDocument` is not
 * handed over until someone adds it on purpose. What is deliberately not here:
 * the organisation, the payment amount, the advocate (outside the sign-off
 * record), the conflict declaration, the corpus-review log and the analysis
 * clock.
 *
 * Before sign-off a client reads the status, the clauses behind requests
 * addressed to them, in full, and a count of the rest. After it the whole
 * record is theirs, read-only. A document that says it is signed off without an
 * advocate and a date on record is read as not signed off (`asClientReads`).
 */
export function shapeClientDocument(record: ContractDocument, options: ShapeOptions = {}): ClientDocument {
  const doc = asClientReads(record);
  const signOff = signOffRecord(doc);

  // The clauses a request to the client is about, found through the findings
  // the client may know of. A clause is the draft's own wording, so before
  // sign-off these are the only ones handed over.
  const asked = new Set(
    clientVisibleFindings(doc, { advocateAddedAfterSignOff: options.advocateAddedAfterSignOff })
      .filter((f) => f.changeRequest !== null)
      .map((f) => clauseNumberFromReference(f.clauseReference)),
  );
  const shown = signOff ? doc.clauses : doc.clauses.filter((c) => asked.has(c.number));

  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    tier: doc.tier,
    version: doc.version,
    createdAt: doc.createdAt,
    claimedAt: doc.claimedAt,
    executedAt: doc.executedAt ?? null,
    deal: {
      clientName: doc.clientName,
      counterpartyName: doc.counterpartyName,
      stateOfExecution: doc.stateOfExecution,
      transactionValue: doc.transactionValue,
      counterpartyIsMsme: doc.counterpartyIsMsme,
      durationMonths: doc.durationMonths,
      governingLaw: doc.governingLaw,
      keyTerms: doc.keyTerms,
    },
    // That it was paid, never how much: money is the invoice's.
    paidAt: doc.payment?.paidAt ?? null,
    signOff,
    clauses: shown.map((c) => ({ number: c.number, heading: c.heading, body: c.body })),
    otherClauseCount: doc.clauses.length - shown.length,
    findingList: shapeClientFindings(doc, options),
    executionSteps: signOff ? structuredClone(doc.executionSteps) : [],
  };
}

/**
 * A document as the client's list reads it: the header, and counts. A list
 * carries no clauses, findings or steps.
 *
 * A request counts as waiting on the client until they answer it. It does not
 * stop counting when the advocate settles the finding it is about, because that
 * would tell the client a decision had been made before sign-off.
 */
export function shapeClientSummary(record: ContractDocument, options: ShapeOptions = {}): ClientDocumentSummary {
  const doc = asClientReads(record);
  const signOff = signOffRecord(doc);
  const requests = clientVisibleFindings(doc, { advocateAddedAfterSignOff: options.advocateAddedAfterSignOff }).flatMap(
    (f) => (f.changeRequest ? [f.changeRequest] : []),
  );
  const applicable = signOff ? doc.executionSteps.filter((s) => s.applicable) : [];

  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    tier: doc.tier,
    version: doc.version,
    createdAt: doc.createdAt,
    claimedAt: doc.claimedAt,
    executedAt: doc.executedAt ?? null,
    paidAt: doc.payment?.paidAt ?? null,
    signOff,
    counterpartyName: doc.counterpartyName,
    findingCount: firstPassFindings(doc).length,
    openRequests: requests.filter((r) => !r.response).length,
    latestRequestAt: requests.map((r) => r.requestedAt).sort().at(-1) ?? null,
    checklist: { done: applicable.filter((s) => s.complete).length, total: applicable.length },
  };
}
