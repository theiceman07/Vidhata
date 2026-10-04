import { clientVisibleFindings, findingNumbers } from "@/lib/findings";
import { CONTRACT_TYPES } from "@/lib/mock/intake-options.mock";
import type {
  BillingProfile,
  Consultation,
  ContractDocument,
  DataExport,
  Invoice,
  PrivacyState,
} from "@/lib/types";

/**
 * What a client may take with them.
 *
 * Built only from what the same client reads on screen, through the same
 * helper every client screen uses, so the file cannot hold what the screens
 * hold back. Before sign-off a document carries the passages behind requests
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
  documents: ContractDocument[];
  invoices: Invoice[];
  consultations: Consultation[];
  privacy: PrivacyState;
  now: Date;
}): DataExport {
  const titles = new Map(input.documents.map((d) => [d.id, d.title]));

  return {
    preview: true,
    generatedAt: input.now.toISOString(),
    organisation: { name: input.organisation.name, gstin: input.organisation.gstin },
    documents: input.documents.map((doc) => {
      const signedOff = doc.status === "settled" || doc.status === "executed";
      // Numbered the way the client's own list numbers them.
      const visible = clientVisibleFindings(doc);
      const numbers = findingNumbers({ ...doc, findings: visible });
      const shown = visible.filter((f) => signedOff || f.changeRequest !== null);

      return {
        id: doc.id,
        title: doc.title,
        agreement: CONTRACT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type,
        counterparty: doc.counterpartyName,
        status: doc.status,
        createdAt: doc.createdAt,
        draft: doc.version,
        signedOff:
          signedOff && doc.advocate && doc.settledAt
            ? { advocate: doc.advocate.name, enrolment: doc.advocate.bar, at: doc.settledAt }
            : null,
        clauses: signedOff
          ? doc.clauses.map((c) => ({ number: c.number, heading: c.heading, body: c.body }))
          : [],
        findings: shown.map((f) => ({
          number: numbers[f.findingId],
          clauseReference: f.clauseReference,
          passage: f.clauseText,
          description: signedOff ? f.description : null,
          disposition: signedOff ? f.disposition : null,
          request: f.changeRequest
            ? {
                request: f.changeRequest.request,
                requestedAt: f.changeRequest.requestedAt,
                response: f.changeRequest.response,
                respondedAt: f.changeRequest.respondedAt,
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
    })),
    trainingOptIn: input.privacy.trainingOptIn,
    consentLog: input.privacy.consentLog,
  };
}
