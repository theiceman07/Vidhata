import type { ClientConsultation, ClientDocumentSummary, ClientNotification } from "@/lib/types";

/**
 * What a client is told, worked out from what a client is handed.
 *
 * The inputs are narrow on purpose. A document is read as its title, its status
 * and the times a client already sees, and a consultation as its status and its
 * times: there is no advocate's name to put in a sentence, no finding to count,
 * no decision to repeat, no clause to refer to, and no question or answer to
 * quote, because the type has none of them. A sentence here can only say that
 * something happened, to which document, and where to go.
 *
 * Nothing in this file is a number, so no count can be wrong: not a finding
 * count the client was never given, and not the count of requests either. A
 * test builds every fixture through it and fails on a name, a count, a
 * decision, a question or a clause that is not the client's to know.
 */

/** A document as a notification reads it. The sign-off is only its time. */
export type NotifiableDocument = Pick<
  ClientDocumentSummary,
  "id" | "title" | "status" | "createdAt" | "claimedAt" | "paidAt" | "openRequests" | "latestRequestAt"
> & { signedOffAt: string | null };

/** A consultation request as a notification reads it: where it stands, and when. */
export type NotifiableConsultation = Pick<
  ClientConsultation,
  "id" | "documentId" | "documentTitle" | "status" | "acceptedAt" | "declinedAt" | "paidAt" | "answeredAt"
>;

function ofDocument(doc: NotifiableDocument): ClientNotification[] {
  const to = `/documents/${doc.id}`;
  const base = { documentId: doc.id, href: to };

  switch (doc.status) {
    case "awaiting_payment":
      return [
        {
          ...base,
          id: `awaiting_payment:${doc.id}`,
          kind: "awaiting_payment",
          at: doc.createdAt,
          text: `${doc.title} is screened. Pay the fee to send it to an advocate.`,
        },
      ];
    case "pending_review":
      return [
        {
          ...base,
          id: `with_advocate:${doc.id}`,
          kind: "with_advocate",
          at: doc.paidAt ?? doc.createdAt,
          text: `${doc.title} is paid for and waiting for an advocate.`,
        },
      ];
    case "under_review":
      return [
        {
          ...base,
          id: `with_advocate:${doc.id}`,
          kind: "with_advocate",
          at: doc.claimedAt ?? doc.paidAt ?? doc.createdAt,
          text: `${doc.title} is with an advocate for review.`,
        },
      ];
    case "revision":
      // Said only while a request to the client is open, and only that one was made:
      // not how many, not about what, and nothing of where it stands now.
      if (doc.openRequests === 0) return [];
      return [
        {
          ...base,
          id: `advocate_asked:${doc.id}`,
          kind: "advocate_asked",
          at: doc.latestRequestAt ?? doc.createdAt,
          text: `Your advocate asked for your answer on ${doc.title}.`,
        },
      ];
    case "settled":
      // No document is settled without a recorded sign-off. Without its time there is nothing to say.
      if (doc.signedOffAt === null) return [];
      return [
        {
          ...base,
          id: `settled:${doc.id}`,
          kind: "settled",
          at: doc.signedOffAt,
          text: `${doc.title} is settled. Open it to read it and work through the execution checklist.`,
        },
      ];
    default:
      return [];
  }
}

function ofConsultation(c: NotifiableConsultation): ClientNotification[] {
  const to = `/documents/${c.documentId}/consultation`;
  const base = { documentId: c.documentId, href: to };

  // Accepted and not yet paid: the one point where the client has a move. Once it is paid
  // there is nothing to say until it is answered.
  if (c.status === "accepted" && c.paidAt === null && c.acceptedAt !== null) {
    return [
      {
        ...base,
        id: `consultation_accepted:${c.id}`,
        kind: "consultation_accepted",
        at: c.acceptedAt,
        text: `Your advocate accepted your consultation request on ${c.documentTitle}. Pay the fee to go ahead.`,
      },
    ];
  }
  // Declined: the outcome of the client's own request, said in neutral words. It does not say
  // who declined it or why, and a decline is never charged, so it says so. Without this a
  // request would sit as requested for ever.
  if (c.status === "declined" && c.declinedAt !== null) {
    return [
      {
        ...base,
        id: `consultation_declined:${c.id}`,
        kind: "consultation_declined",
        at: c.declinedAt,
        text: `Your consultation request on ${c.documentTitle} was declined. Nothing was charged.`,
      },
    ];
  }
  // An answer is the client's to read only once it is paid for.
  if (c.status === "answered" && c.paidAt !== null && c.answeredAt !== null) {
    return [
      {
        ...base,
        id: `consultation_answered:${c.id}`,
        kind: "consultation_answered",
        at: c.answeredAt,
        text: `Your advocate answered your consultation request on ${c.documentTitle}.`,
      },
    ];
  }
  // Requested, or paid and still waiting to be responded to, there is nothing to say.
  return [];
}

/** Newest first. The same inputs always give the same list. */
export function buildClientNotifications(
  documents: NotifiableDocument[],
  consultations: NotifiableConsultation[],
): ClientNotification[] {
  return [...documents.flatMap(ofDocument), ...consultations.flatMap(ofConsultation)].sort(
    (a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id),
  );
}
