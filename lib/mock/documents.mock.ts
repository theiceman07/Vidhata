import type { ContractDocument } from "@/lib/types";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import {
  ndaClauses,
  msaClauses,
  employmentClauses,
  vendorClauses,
} from "@/lib/mock/clauses.mock";

const settledNda: ContractDocument = {
  id: "doc-nda-settled",
  title: "Mutual NDA · Kavach Robotics",
  type: "nda",
  status: "settled",
  tier: "standard",
  orgId: MOCK_CLIENT_ORG.id,
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Kavach Robotics Pvt Ltd",
  stateOfExecution: "Delhi",
  transactionValue: 0,
  counterpartyIsMsme: false,
  durationMonths: 24,
  governingLaw: "Laws of India",
  keyTerms: "Mutual confidentiality; 3-year survival on trade secrets.",
  createdAt: "2026-08-02T09:12:00.000Z",
  version: 1,
  revisionCount: 0,
  claimedAt: "2026-08-04T10:05:00.000Z",
  settledAt: "2026-08-05T14:40:00.000Z",
  analysisCompletesAt: null,
  advocate: { id: "adv-1", name: "Rhea Kapoor", bar: "D/1842/2016" },
  clauses: ndaClauses,
  findings: [],
  executionSteps: [
    {
      kind: "stamping",
      applicable: true,
      headline: "Stamp duty: Rs 100 (Delhi)",
      detail: "Flat rate for a mutual NDA under the Delhi Stamp Act.",
      reason: "NDAs executed in Delhi attract a fixed Rs 100 stamp duty.",
      instructions: [
        "Purchase Rs 100 e-stamp paper via SHCIL or an authorised vendor.",
        "Print the settled document on the stamp paper.",
        "Have both signatories sign on the last page.",
      ],
      complete: true,
      completedAt: "2026-08-07T06:30:00.000Z",
      completedBy: "Anaya Textiles Pvt Ltd",
      evidence: {
        name: "e-stamp-certificate.pdf",
        attachedAt: "2026-08-07T06:28:00.000Z",
      },
    },
    {
      kind: "registration",
      applicable: false,
      headline: "Registration: not required",
      detail: "No registration filing needed.",
      reason:
        "NDAs are not compulsorily registrable under Section 17 of the Registration Act, 1908.",
      instructions: [],
      complete: true,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
    {
      kind: "esignature",
      applicable: true,
      headline: "e-signature: valid under the IT Act",
      detail: "Aadhaar-based e-sign satisfies Section 5 of the IT Act, 2000.",
      reason:
        "NDAs are not among the classes of documents excluded from electronic execution.",
      instructions: [
        "Both signatories complete Aadhaar e-sign via the settlement portal.",
        "Download the signed PDF with the embedded audit trail.",
      ],
      complete: false,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
  ],
};

const pendingReviewMsa: ContractDocument = {
  id: "doc-msa-pending",
  title: "Master Services Agreement · Sundargarh Logistics",
  type: "msa",
  status: "pending_review",
  tier: "enhanced",
  orgId: "org-bharosa-fintech",
  clientName: "Bharosa Fintech Pvt Ltd",
  counterpartyName: "Sundargarh Logistics Pvt Ltd",
  stateOfExecution: "Maharashtra",
  transactionValue: 4200000,
  counterpartyIsMsme: true,
  durationMonths: 36,
  governingLaw: "Laws of India",
  keyTerms: "Exclusivity for the term; auto-renewal unless terminated with 90 days' notice.",
  createdAt: "2026-09-14T06:05:00.000Z",
  version: 1,
  revisionCount: 0,
  claimedAt: null,
  settledAt: null,
  analysisCompletesAt: null,
  advocate: null,
  clauses: msaClauses,
  findings: [
    {
      findingId: "find-1",
      source: "pipeline",
      layer: 2,
      severity: "high",
      clauseReference: "Clause 7.2",
      clauseText:
        "The Service Provider shall not, for a period of three (3) years following termination, engage in any business activity within India that competes with the Client.",
      description:
        "This non-compete clause is broader than what Indian law will enforce against an independent service provider.",
      ruleApplied: "ICA-S27-NONCOMPETE-V2",
      remedySuggested:
        "Narrow the restriction to solicitation of the Client's active customers for 12 months, and remove the nationwide scope.",
      citations: [
        {
          id: "cite-1",
          text: "Indian Contract Act, 1872, s.27",
          status: "verified",
          corpusRef: "ica-1872-s27",
          withdrawn: null,
        },
      ],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    },
    {
      findingId: "find-2",
      source: "pipeline",
      layer: 3,
      severity: "medium",
      clauseReference: "Clause 4.1",
      clauseText:
        "Payment shall be made within sixty (60) days of receipt of a valid invoice.",
      description:
        "The counterparty is a registered MSME. A 60-day payment term exceeds the statutory ceiling for micro and small enterprises.",
      ruleApplied: "MSMED-S15-PAYMENT-TERM",
      remedySuggested:
        "Reduce the payment term to 45 days to comply with Section 15 of the MSMED Act, 2006.",
      citations: [
        {
          id: "cite-2",
          text: "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
          status: "verified",
          corpusRef: "msmed-2006-s15",
          withdrawn: null,
        },
      ],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    },
    {
      findingId: "find-3",
      source: "pipeline",
      layer: 4,
      severity: "low",
      clauseReference: "Clause 11.4",
      clauseText:
        "Any dispute arising under this Agreement shall be resolved by arbitration seated in Singapore.",
      description:
        "A foreign arbitration seat for a wholly domestic contract raises enforceability questions the pipeline could not resolve against the corpus.",
      ruleApplied: "JURIS-SEAT-DOMESTIC-V1",
      remedySuggested:
        "Confirm whether a domestic seat (Mumbai) was intended before this clause is finalised.",
      citations: [
        {
          id: "cite-3",
          text: "Purported precedent on foreign-seated domestic arbitration",
          status: "blocked",
          corpusRef: null,
          withdrawn: null,
        },
      ],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    },
  ],
  executionSteps: [],
};

const analysingEmployment: ContractDocument = {
  id: "doc-employment-analysing",
  title: "Employment Agreement · Senior Engineer",
  type: "employment",
  status: "analysing",
  tier: null,
  orgId: "org-trivandrum-cloud-labs",
  clientName: "Trivandrum Cloud Labs Pvt Ltd",
  counterpartyName: "Individual · Meera Nair",
  stateOfExecution: "Karnataka",
  transactionValue: 2400000,
  counterpartyIsMsme: false,
  durationMonths: 0,
  governingLaw: "Laws of India",
  keyTerms: null,
  createdAt: "2026-09-19T10:00:00.000Z",
  version: 1,
  revisionCount: 0,
  claimedAt: null,
  settledAt: null,
  // Seeded in the past on purpose (QA 4.5): the fixture used to sit in
  // "analysing" forever because the client-side timer that would have
  // resolved it only ever ran while a component was mounted to own it.
  // getDocument/listDocuments now reconcile a past analysisCompletesAt on
  // read, so this resolves to pending_review on first load.
  analysisCompletesAt: "2026-09-19T10:01:00.000Z",
  advocate: null,
  clauses: employmentClauses,
  findings: [],
  executionSteps: [],
};

const revisionVendor: ContractDocument = {
  id: "doc-vendor-revision",
  title: "Vendor Agreement · Packaging Supply",
  type: "vendor",
  status: "revision",
  tier: "standard",
  orgId: MOCK_CLIENT_ORG.id,
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Ganesh Packaging Works",
  stateOfExecution: "Tamil Nadu",
  transactionValue: 850000,
  counterpartyIsMsme: true,
  durationMonths: 12,
  governingLaw: "Laws of India",
  keyTerms: "Packaging specification per Annexure A; quarterly price review.",
  createdAt: "2026-09-08T11:30:00.000Z",
  // Draft 3. The history is in lib/mock/versions.mock.ts: the first pass,
  // the client's answers to the advocate's first request, and the
  // advocate's revision that carries the request now waiting on the client.
  version: 3,
  // The advocate has sent it back twice: after draft 1, and after draft 2.
  revisionCount: 2,
  claimedAt: "2026-09-09T05:45:00.000Z",
  settledAt: null,
  analysisCompletesAt: null,
  advocate: { id: "adv-2", name: "Farhan Sheikh", bar: "TN/0932/2019" },
  clauses: vendorClauses,
  findings: [
    {
      findingId: "find-4",
      source: "pipeline",
      layer: 3,
      severity: "medium",
      clauseReference: "Clause 5.3",
      clauseText: "Payment shall be made within ninety (90) days of delivery.",
      description:
        "The counterparty is a registered MSME. A 90-day payment term exceeds the statutory ceiling.",
      ruleApplied: "MSMED-S15-PAYMENT-TERM",
      remedySuggested: "Reduce the payment term to 45 days.",
      citations: [
        {
          id: "cite-4",
          text: "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
          status: "verified",
          corpusRef: "msmed-2006-s15",
          withdrawn: null,
        },
      ],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      // Fixture prose written for the demo. It is the advocate's request
      // to the client, not statute text, and it relies only on the
      // citation already attached above.
      changeRequest: {
        request:
          "Ganesh Packaging Works is a registered MSME, so a 90-day payment term exceeds the statutory ceiling. Tell me whether they agreed to 90 days in writing before intake. If they did, I can retain the term and record that you were told it exceeds the ceiling. If not, I will revise Clause 5.3 to 45 days.",
        requestedAt: "2026-09-16T07:40:00.000Z",
        requestedBy: "Farhan Sheikh",
        response: null,
        respondedAt: null,
      },
    },
    {
      // Raised by the draft 2 run, decided by the advocate on 16 Sep. It
      // names no statute: the rule is a cross-clause check, so settling it
      // carries the advocate's note.
      findingId: "find-8",
      source: "pipeline",
      layer: 3,
      severity: "low",
      clauseReference: "Clause 3.2",
      clauseText:
        "Rejected goods shall be replaced by the Supplier at its own cost within fourteen (14) days.",
      description:
        "Replacement is the Supplier's obligation at its own cost, but the clause states no consequence if replacement is late. The risk of delay sits with the Buyer without the clause saying so.",
      ruleApplied: "LIABILITY-ASYMMETRY-V1",
      remedySuggested:
        "State what the Buyer may do if replacement is not made within the period.",
      citations: [],
      disposition: "confirmed",
      overrideNote:
        "Confirmed. No source applies, so this rests on judgment: the concern stands and is carried to the quarterly price review in Clause 4.1.",
      resolvedAt: "2026-09-16T07:20:00.000Z",
      changeRequest: null,
    },
    {
      // Added by the advocate in review. Its source verifies against the
      // corpus, so it can be settled once the advocate has decided it.
      findingId: "find-9",
      source: "advocate",
      layer: 6,
      severity: "medium",
      clauseReference: "Clause 5.3",
      clauseText:
        "The Supplier shall invoice the Buyer on delivery of each consignment.",
      description:
        "Clause 5.3 counts the payment period from delivery. It does not say when delivered goods are treated as accepted, and Clause 3.2 gives the Buyer seven days to inspect. Where the period starts is unclear.",
      ruleApplied: "MANUAL-ADVOCATE-ADDED",
      remedySuggested:
        "Say when delivered goods are treated as accepted, then state the period from that date.",
      citations: [
        {
          id: "cite-9",
          text: "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
          status: "verified",
          corpusRef: "msmed-2006-s15",
          withdrawn: null,
        },
      ],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    },
    {
      // Added by the advocate with a reference the corpus does not hold. It
      // is saved, and it stays blocked: it cannot be settled or signed off
      // until the source is withdrawn with a note. The citation text is a
      // plain placeholder on purpose, so it cannot be mistaken for a real
      // authority.
      findingId: "find-10",
      source: "advocate",
      layer: 6,
      severity: "low",
      clauseReference: "Clause 7.1",
      clauseText:
        "It renews automatically for successive twelve month periods unless either party gives sixty (60) days written notice of non-renewal.",
      description:
        "The Agreement renews on silence. The advocate wants an authority on renewal by silence checked before this clause is settled.",
      ruleApplied: "MANUAL-ADVOCATE-ADDED",
      remedySuggested: "Advocate judgment · see the concern above.",
      citations: [
        {
          id: "cite-10",
          text: "PLACEHOLDER · reference typed by the advocate, not in the corpus",
          status: "blocked",
          corpusRef: null,
          withdrawn: null,
        },
      ],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    },
  ],
  executionSteps: [],
};

export const mockDocuments: ContractDocument[] = [
  settledNda,
  pendingReviewMsa,
  analysingEmployment,
  revisionVendor,
];

export function getMockDocumentById(id: string): ContractDocument | undefined {
  return mockDocuments.find((doc) => doc.id === id);
}
