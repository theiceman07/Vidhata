import {
  buildClientNotifications,
  type NotifiableConsultation,
  type NotifiableDocument,
} from "@/lib/notifications";
import type { ClientConsultation, ClientDocumentSummary, ClientNotification } from "@/lib/types";
import { listClientOrgConsultations } from "./consultations";
import { listClientDocuments } from "./documents";

/**
 * A client's updates, for their own organisation.
 *
 * Built on what the client layer hands over and nothing else: the document
 * summaries and the consultation requests, both as the client reads them. Each
 * is cut down, field by field, before the builder sees it: the advocate's
 * identity in a sign-off record becomes its time, and a request loses its
 * question and its answer, so a sentence cannot be given a name or the client's
 * own words. Another organisation's documents and requests are not in what is
 * read, so they cannot be in the list.
 */

export function notifiableDocument(doc: ClientDocumentSummary): NotifiableDocument {
  return {
    id: doc.id,
    title: doc.title,
    status: doc.status,
    createdAt: doc.createdAt,
    claimedAt: doc.claimedAt,
    paidAt: doc.paidAt,
    openRequests: doc.openRequests,
    latestRequestAt: doc.latestRequestAt,
    signedOffAt: doc.signOff?.at ?? null,
  };
}

export function notifiableConsultation(c: ClientConsultation): NotifiableConsultation {
  return {
    id: c.id,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    status: c.status,
    acceptedAt: c.acceptedAt,
    paidAt: c.paidAt,
    answeredAt: c.answeredAt,
  };
}

export async function getClientNotifications(orgId: string): Promise<ClientNotification[]> {
  const [documents, consultations] = await Promise.all([
    listClientDocuments(orgId),
    listClientOrgConsultations(orgId),
  ]);
  return buildClientNotifications(
    documents.map(notifiableDocument),
    consultations.map(notifiableConsultation),
  );
}
