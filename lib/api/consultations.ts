import { CONSULTATION } from "@/lib/config/pricing";
import type {
  AdvocateConsultation,
  Consultation,
  ConsultationSummary,
} from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocument } from "./documents";

// In-memory, like everything in the preview: it resets on reload.
let store: Consultation[] = [];

/** Long enough for a real question, short enough that it is one. */
export const MAX_QUESTION_LENGTH = 1500;
export const MAX_ANSWER_LENGTH = 4000;

/**
 * What a request that is not yours, or not there, says. It is one message for
 * both, so an advocate who follows a link to someone else's request cannot
 * tell it exists.
 */
const NOT_FOUND = "Request not found.";

/**
 * A consultation as the client reads it. The advocate's answer is the client's
 * to read only once the fee is paid, so it is not in what is handed back until
 * it is, whatever else was stored.
 */
function forClient(c: Consultation): Consultation {
  return structuredClone({ ...c, answer: c.paidAt ? c.answer : null });
}

/** The advocate's reading: the status and whether it is paid, no payment detail. */
function forAdvocate(c: Consultation): AdvocateConsultation {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the point is to leave them out
  const { fee, paidAt, ...rest } = c;
  return structuredClone({ ...rest, paid: paidAt !== null });
}

function ownedBy(advocateId: string, id: string): Consultation | undefined {
  const found = store.find((c) => c.id === id);
  return found && found.advocateId === advocateId ? found : undefined;
}

// ---------------------------------------------------------------------------
// The client's side
// ---------------------------------------------------------------------------

/**
 * Ask the advocate who settled a document for a conversation.
 *
 * The advocate is whoever settled it, read from the document here, never
 * passed in: there is no choice, no search and no alternative. It opens only
 * once the document is signed off, because that is when there is a settling
 * advocate to ask.
 *
 * It is free and stored as requested. The same question for the same document
 * while it is still requested comes back as the one request, so a double click
 * makes one. A failure creates nothing.
 */
export async function requestConsultation(
  documentId: string,
  question: string,
): Promise<Consultation> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send your request. Nothing was created.");
  }
  const doc = await getDocument(documentId);
  if (!doc) throw new MockApiError("Document not found.");
  if ((doc.status !== "settled" && doc.status !== "executed") || !doc.advocate) {
    throw new MockApiError(
      "A consultation is with the advocate who settled the document, so it opens once the document is signed off.",
    );
  }
  const text = question.trim();
  if (!text) throw new MockApiError("Write what you would like to ask.");
  if (text.length > MAX_QUESTION_LENGTH) {
    throw new MockApiError(`Keep the question under ${MAX_QUESTION_LENGTH} characters.`);
  }

  // Everything above has waited; from here to the return nothing does, so a
  // second press that arrives next finds the first one's request.
  const existing = store.find(
    (c) => c.documentId === documentId && c.question === text && c.status === "requested",
  );
  if (existing) return forClient(existing);

  const consultation: Consultation = {
    id: `consultation-${store.length + 1}`,
    documentId,
    documentTitle: doc.title,
    orgId: doc.orgId,
    clientName: doc.clientName,
    advocateId: doc.advocate.id,
    advocateName: doc.advocate.name,
    question: text,
    status: "requested",
    requestedAt: new Date().toISOString(),
    acceptedAt: null,
    declinedAt: null,
    fee: null,
    paidAt: null,
    answer: null,
    answeredAt: null,
  };
  store = [consultation, ...store];
  return forClient(consultation);
}

/**
 * Every request an organisation has made, for its own export. The questions
 * are the client's own words and their own data, so they go in; they go in
 * nothing else that others could read.
 */
export async function listOrgConsultations(orgId: string): Promise<Consultation[]> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your consultation requests.");
  }
  return store.filter((c) => c.orgId === orgId).map(forClient);
}

/** A document's consultation requests, newest first. */
export async function listConsultations(documentId: string): Promise<Consultation[]> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your consultation requests.");
  }
  return store.filter((c) => c.documentId === documentId).map(forClient);
}

/**
 * Pay the fee on an accepted request. Money moves only here, and only for a
 * request the advocate accepted: a request nobody has accepted has nothing to
 * pay, and a declined one is never chargeable. Paying twice makes one
 * payment: a request that is paid comes back as it is. A failure leaves it
 * accepted and unpaid, nothing recorded, and the client can try again.
 */
export async function payConsultation(id: string): Promise<Consultation> {
  await randomDelay(400, 800);
  const c = store.find((x) => x.id === id);
  if (!c) throw new MockApiError(NOT_FOUND);
  if (c.paidAt) return forClient(c);
  if (c.status === "declined") {
    throw new MockApiError("A declined request is not chargeable. There is nothing to pay.");
  }
  if (c.status !== "accepted" || c.fee === null) {
    throw new MockApiError("The advocate has not accepted this request, so there is nothing to pay.");
  }
  if (shouldSimulateFailure()) {
    throw new MockApiError("The payment did not go through. Nothing was charged. Try again.");
  }
  c.paidAt = new Date().toISOString();
  return forClient(c);
}

// ---------------------------------------------------------------------------
// The advocate's side. Every call is scoped to the advocate who settled the
// document: another advocate's request, and one that does not exist, are the
// same thing to ask for.
// ---------------------------------------------------------------------------

/** Requests on documents this advocate settled, newest first, without the question. */
export async function listAdvocateConsultations(
  advocateId: string,
): Promise<ConsultationSummary[]> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your consultation requests.");
  }
  return store
    .filter((c) => c.advocateId === advocateId)
    .map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- left out on purpose
      const { question, answer, ...summary } = forAdvocate(c);
      return summary;
    });
}

/** One request, with its question, or null if it is not this advocate's or not there. */
export async function getAdvocateConsultation(
  advocateId: string,
  id: string,
): Promise<AdvocateConsultation | null> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load this request.");
  }
  const c = ownedBy(advocateId, id);
  return c ? forAdvocate(c) : null;
}

/**
 * Accept a request. That sets the fee, flat and before GST, for the client to
 * pay. Accepting again changes nothing, and a declined request cannot be
 * accepted.
 */
export async function acceptConsultation(
  advocateId: string,
  id: string,
): Promise<AdvocateConsultation> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not accept this request. Nothing was changed.");
  }
  const c = ownedBy(advocateId, id);
  if (!c) throw new MockApiError(NOT_FOUND);
  if (c.status === "declined") throw new MockApiError("This request was declined.");
  if (c.status === "requested") {
    c.status = "accepted";
    c.acceptedAt = new Date().toISOString();
    c.fee = CONSULTATION.amount;
  }
  return forAdvocate(c);
}

/**
 * Decline a request. It is free and never chargeable. Declining again changes
 * nothing, and a request already accepted cannot be declined.
 */
export async function declineConsultation(
  advocateId: string,
  id: string,
): Promise<AdvocateConsultation> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not decline this request. Nothing was changed.");
  }
  const c = ownedBy(advocateId, id);
  if (!c) throw new MockApiError(NOT_FOUND);
  if (c.status === "accepted" || c.status === "answered") {
    throw new MockApiError("A request that has been accepted cannot be declined.");
  }
  if (c.status === "requested") {
    c.status = "declined";
    c.declinedAt = new Date().toISOString();
  }
  return forAdvocate(c);
}

/**
 * Answer an accepted request, once the client has paid. Before that there is
 * nothing to answer: the fee is what the answer is for. Answering again
 * changes nothing.
 */
export async function answerConsultation(
  advocateId: string,
  id: string,
  answer: string,
): Promise<AdvocateConsultation> {
  await randomDelay(300, 600);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send your answer. Nothing was changed.");
  }
  const c = ownedBy(advocateId, id);
  if (!c) throw new MockApiError(NOT_FOUND);
  if (c.status === "answered") return forAdvocate(c);
  if (c.status === "declined") throw new MockApiError("This request was declined.");
  if (c.status !== "accepted") throw new MockApiError("Accept the request before answering it.");
  if (!c.paidAt) {
    throw new MockApiError("The fee has not been paid yet, so there is nothing to answer.");
  }
  const text = answer.trim();
  if (!text) throw new MockApiError("Write your answer.");
  if (text.length > MAX_ANSWER_LENGTH) {
    throw new MockApiError(`Keep the answer under ${MAX_ANSWER_LENGTH} characters.`);
  }
  c.status = "answered";
  c.answer = text;
  c.answeredAt = new Date().toISOString();
  return forAdvocate(c);
}
