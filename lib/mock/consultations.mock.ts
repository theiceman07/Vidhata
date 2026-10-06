import { CONSULTATION } from "@/lib/config/pricing";
import type { Consultation } from "@/lib/types";
import { mockDocuments } from "./documents.mock";

/**
 * The consultation requests the preview starts with.
 *
 * One, answered, on the second settled NDA, so the advocate's payout statement
 * and the client's billing and notifications have something to show. It is the
 * advocate who settled that document who answered it, and it was asked, paid and
 * answered after the document was signed off. Everything about the document, the
 * organisation and the advocate is read from the document fixture, so it cannot
 * drift from it.
 *
 * The fee is the configured consultation fee (lib/config/pricing.ts), as it is
 * for any request an advocate accepts in the preview. Who sets it and who
 * receives it is a question for counsel, and nothing here settles it.
 *
 * The question and the answer are the kind of text a real request holds, and
 * hold no statute, section number or case. They appear only inside the request
 * itself, and in the client's own export.
 */
const settled = mockDocuments.find((d) => d.id === "doc-nda-settled-2")!;

export const mockConsultations: Consultation[] = [
  {
    id: "consultation-seed-1",
    documentId: settled.id,
    documentTitle: settled.title,
    orgId: settled.orgId,
    clientName: settled.clientName,
    advocateId: settled.advocate!.id,
    advocateName: settled.advocate!.name,
    question: "Can we extend how long the confidentiality obligations last, if both sides agree?",
    status: "answered",
    requestedAt: "2026-09-02T09:00:00.000Z",
    acceptedAt: "2026-09-03T09:30:00.000Z",
    declinedAt: null,
    fee: CONSULTATION.amount,
    paidAt: "2026-09-03T11:00:00.000Z",
    answer:
      "Yes, if both sides agree. It would be a written amendment signed by both parties. Send me the length you have in mind and I will set out what it would change.",
    answeredAt: "2026-09-05T10:15:00.000Z",
  },
];
