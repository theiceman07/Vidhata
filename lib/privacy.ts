import { CONTRACT_TYPES } from "@/lib/mock/intake-options.mock";
import type {
  BillingProfile,
  ClientConsultation,
  ClientDocument,
  ClientSettlementNote,
  DataExport,
  Invoice,
  PrivacyState,
} from "@/lib/types";

/**
 * What a client may take with them.
 *
 * Built only from the client's own types, the ones every client screen reads
 * (a ClientDocument and a ClientConsultation), so the file cannot hold what a
 * screen cannot, and a finding is the same number in it as on the screens. Before
 * sign-off a document carries the passages behind requests
 * addressed to the client, those requests and the client's answers, and none
 * of the rest of the review: no first-pass description, no advocate-added
 * finding unless addressed to them, no clause text beyond the passage. After
 * sign-off it carries the settled text and the findings with the advocate's
 * disposition. The advocate's own notes are in neither.
 *
 * The client's own consultation questions are included, deliberately: they
 * are the client's own words and their own data, and an export that left out
 * what they wrote would not be theirs. A test holds the choice either way.
 */
export function buildDataExport(input: {
  organisation: BillingProfile;
  documents: ClientDocument[];
  invoices: Invoice[];
  consultations: ClientConsultation[];
  /**
   * The notes to the client released at sign-off, by document. Read through
   * lib/api/client, so a note that was not released is not in it to be exported.
   */
  settlementNotes?: Record<string, ClientSettlementNote[]>;
  privacy: PrivacyState;
  now: Date;
}): DataExport {
  const titles = new Map(input.documents.map((d) => [d.id, d.title]));

  return {
    preview: true,
    generatedAt: input.now.toISOString(),
    organisation: { name: input.organisation.name, gstin: input.organisation.gstin },
    documents: input.documents.map((doc) => {
      // The recorded sign-off is what makes a document the client's to read in full.
      const signedOff = doc.signOff !== null;
      const shown = doc.findingList.filter((f) => signedOff || f.request !== null);

      return {
        id: doc.id,
        title: doc.title,
        agreement: CONTRACT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type,
        counterparty: doc.deal.counterpartyName,
        status: doc.status,
        createdAt: doc.createdAt,
        draft: doc.version,
        signedOff: doc.signOff,
        clauses: signedOff
          ? doc.clauses.map((c) => ({ number: c.number, heading: c.heading, body: c.body }))
          : [],
        // Only once signed off, whatever was handed in: before it the list is empty for every
        // document, so it cannot show that the advocate has written anything.
        settlementNotes: signedOff
          ? (input.settlementNotes?.[doc.id] ?? []).map((n) => ({
              clauseNumber: n.clauseNumber,
              text: n.text,
              releasedAt: n.releasedAt,
            }))
          : [],
        findings: shown.map((f) => ({
          // The number the client was given, the same on every screen.
          number: f.number,
          clauseReference: f.clauseReference,
          passage: f.clauseText,
          description: signedOff ? (f.detail?.description ?? null) : null,
          disposition: signedOff ? (f.detail?.disposition ?? null) : null,
          request: f.request
            ? {
                request: f.request.request,
                requestedAt: f.request.requestedAt,
                response: f.request.response,
                respondedAt: f.request.respondedAt,
              }
            : null,
        })),
      };
    }),
    invoices: input.invoices,
    consultationRequests: input.consultations.map((c) => ({
      document: titles.get(c.documentId) ?? c.documentId,
      advocate: c.advocateName,
      requestedAt: c.requestedAt,
      status: c.status,
      question: c.question,
      // Their own answer, read the way the client reads it: only once paid.
      answer: c.answer,
    })),
    trainingOptIn: input.privacy.trainingOptIn,
    consentLog: input.privacy.consentLog,
  };
}
