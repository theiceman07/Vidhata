import type { ClientConsultation, Consultation } from "@/lib/types";
import { MockApiError } from "../delay";
import {
  consultationOrg,
  listConsultations,
  payConsultation,
  requestConsultation,
} from "../consultations";
import { ownDocument } from "./own";

/**
 * A client's consultation requests, as the client who made them reads them.
 *
 * Every call takes the organisation. A document that is not the organisation's
 * is the same "Document not found." as one that is not there, and a request that
 * is not the organisation's is the same "Request not found." as one that was
 * never made, so neither a document nor a request can be found by asking for it.
 * What comes back is built field by field, so a field added to the stored request
 * later is not handed to a client until someone decides it should be.
 */

/** The longest question a request takes, so the form and the API agree on it. */
export { MAX_QUESTION_LENGTH } from "../consultations";

/** A stored request as the client who made it reads it, built field by field. */
export function shapeClientConsultation(c: Consultation): ClientConsultation {
  return {
    id: c.id,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    advocateName: c.advocateName,
    question: c.question,
    status: c.status,
    requestedAt: c.requestedAt,
    acceptedAt: c.acceptedAt,
    declinedAt: c.declinedAt,
    fee: c.fee,
    paidAt: c.paidAt,
    answer: c.answer,
    answeredAt: c.answeredAt,
  };
}

/** Ask the advocate who settled the client's own document. Free, and the same question made twice is one request. */
export async function requestClientConsultation(
  orgId: string,
  documentId: string,
  question: string,
): Promise<ClientConsultation> {
  await ownDocument(orgId, documentId);
  return shapeClientConsultation(await requestConsultation(documentId, question));
}

/** The requests on the client's own document, newest first. */
export async function listClientConsultations(
  orgId: string,
  documentId: string,
): Promise<ClientConsultation[]> {
  await ownDocument(orgId, documentId);
  return (await listConsultations(documentId)).map(shapeClientConsultation);
}

/** Pay the fee on the organisation's own accepted request. Paying twice makes one payment. */
export async function payClientConsultation(orgId: string, id: string): Promise<ClientConsultation> {
  if (consultationOrg(id) !== orgId) throw new MockApiError("Request not found.");
  return shapeClientConsultation(await payConsultation(id));
}
