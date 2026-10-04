import type { Consultation } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { getDocument } from "./documents";

// In-memory, like everything in the preview: it resets on reload.
let store: Consultation[] = [];

/** Long enough for a real question, short enough that it is one. */
export const MAX_QUESTION_LENGTH = 1500;

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
  if (existing) return structuredClone(existing);

  const consultation: Consultation = {
    id: `consultation-${store.length + 1}`,
    documentId,
    orgId: doc.orgId,
    advocateName: doc.advocate.name,
    question: text,
    status: "requested",
    requestedAt: new Date().toISOString(),
  };
  store = [consultation, ...store];
  return structuredClone(consultation);
}

/** A document's consultation requests, newest first. */
export async function listConsultations(documentId: string): Promise<Consultation[]> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your consultation requests.");
  }
  return structuredClone(store.filter((c) => c.documentId === documentId));
}
