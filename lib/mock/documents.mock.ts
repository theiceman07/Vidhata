import type { ContractDocument, ReviewTier } from "@/lib/types";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import {
  ndaClauses,
  msaClauses,
  employmentClauses,
  employmentRereviewClauses,
  vendorClauses,
  EMPLOYMENT_PLACE_OF_WORK_REWORDED,
} from "@/lib/mock/clauses.mock";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import { esignatureStep } from "@/lib/config/esign";
import { TIER_PRICING } from "@/lib/config/pricing";

/** A fee paid at its tier's flat amount, so a fixture cannot disagree with the config. */
function paid(tier: ReviewTier, paidAt: string) {
  return { amount: TIER_PRICING[tier].amount, paidAt };
}

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
  // Draft 2. Draft 1 and the advocate's revision are in
  // lib/mock/versions.mock.ts. The advocate corrected the term without
  // sending it back to the client, so revisionCount stays 0.
  version: 2,
  revisionCount: 0,
  claimedAt: "2026-08-04T10:05:00.000Z",
  conflictDeclaredAt: "2026-08-04T10:05:00.000Z",
  payment: paid("standard", "2026-08-02T09:50:00.000Z"),
  settledAt: "2026-08-05T14:40:00.000Z",
  analysisCompletesAt: null,
  advocate: { id: "adv-1", name: "Rhea Kapoor", bar: "D/1842/2016" },
  clauses: ndaClauses,
  findings: [
    {
      // Raised by the first pass against draft 1, which gave the term as
      // thirty six months. Settled once the advocate corrected the clause.
      findingId: "find-n1",
      source: "pipeline",
      layer: 3,
      severity: "low",
      clauseReference: "Clause 4.1",
      clauseText:
        "This Agreement commences on the date of last signature and continues for twenty four (24) months, unless terminated earlier by either party on thirty (30) days written notice.",
      description: "The term in this clause does not match the 24 months on the deal file.",
      ruleApplied: "TERM-VS-DEAL-ON-FILE-V1",
      remedySuggested: "State the term the deal file gives: 24 months.",
      citations: [],
      disposition: "confirmed",
      overrideNote:
        "Confirmed. The term is corrected to 24 months to match the deal on file.",
      resolvedAt: "2026-08-04T12:10:00.000Z",
      changeRequest: null,
    },
    {
      // Added by the advocate in review, and decided in the same sitting.
      findingId: "find-n2",
      source: "advocate",
      layer: 6,
      severity: "low",
      clauseReference: "Clause 6.1",
      clauseText:
        "On written request, the receiving party shall return or destroy all materials containing Confidential Information and shall confirm in writing that it has done so, save for one copy which may be retained solely for the purpose of demonstrating compliance with this Agreement.",
      description:
        "The retained copy is for showing compliance only. The clause does not say who may open it or for how long it may be kept.",
      ruleApplied: "MANUAL-ADVOCATE-ADDED",
      remedySuggested: "Advocate judgment · see the concern above.",
      citations: [],
      disposition: "overridden",
      overrideNote:
        "Overridden. The clause stands as drafted; the advocate judged the retained copy acceptable here.",
      resolvedAt: "2026-08-04T12:25:00.000Z",
      changeRequest: null,
    },
  ],
  executionSteps: [
    {
      kind: "stamping",
      applicable: true,
      headline: "Stamp duty: Rs 100 (Delhi)",
      // A sample entry: the figure stands for one an advocate confirmed on
      // this sample document. A generated checklist never states one.
      detail: "Sample entry, as confirmed by the advocate who settled this sample document.",
      reason: "Sample entry, as confirmed by the advocate who settled this sample document.",
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
      detail: "Sample entry, as confirmed by the advocate who settled this sample document.",
      reason: "Sample entry: the advocate who settled this sample document confirmed registration does not apply.",
      instructions: [],
      complete: true,
      completedAt: null,
      completedBy: null,
      evidence: null,
    },
    // Built in one place, with the generated documents' (lib/config/esign.ts).
    esignatureStep("nda"),
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
  payment: paid("enhanced", "2026-09-14T06:40:00.000Z"),
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
      layer: 2,
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
      layer: 3,
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
  // Draft 4. The history is in lib/mock/versions.mock.ts: the first pass, the
  // advocate's first send-back, the client's answers to it, and the advocate's
  // second send-back, which carries the request now waiting on the client.
  version: 4,
  // The advocate has sent it back twice: after draft 1, and after draft 3.
  // Each send-back and each answer is a draft, so two rounds, the second
  // still open, are four drafts.
  revisionCount: 2,
  claimedAt: "2026-09-09T05:45:00.000Z",
  conflictDeclaredAt: "2026-09-09T05:45:00.000Z",
  payment: paid("standard", "2026-09-08T11:50:00.000Z"),
  settledAt: null,
  analysisCompletesAt: null,
  advocate: { id: "adv-2", name: "Farhan Sheikh", bar: "TN/0932/2019" },
  clauses: vendorClauses,
  findings: [
    {
      findingId: "find-4",
      source: "pipeline",
      layer: 2,
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
      layer: 4,
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

// Claimed by the current advocate, with drafts behind it, so a re-review can
// be worked through end to end. Round 2: the advocate sent it back once, the
// client answered, and draft 3 is what came back. The history is in
// lib/mock/versions.mock.ts.
//
//   find-e1  decided in round 1, before the last hand-off: carries forward
//   find-e3  open, and the client has answered the request: carried over
//   find-e4  raised on the clause the client reworded: new this round
//   find-e5  open at the last hand-off, decided since: resolved, settled
//   find-e2  not here: its clause changed, so the new draft no longer raises it
//
// Fixture prose is about contract facts and names no statute.
const rereviewEmployment: ContractDocument = {
  id: "doc-employment-rereview",
  title: "Employment Agreement · Senior Engineer",
  type: "employment",
  status: "under_review",
  tier: "standard",
  orgId: MOCK_CLIENT_ORG.id,
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Individual · Rohan Iyer",
  stateOfExecution: "Karnataka",
  transactionValue: 2400000,
  counterpartyIsMsme: false,
  durationMonths: 0,
  governingLaw: "Laws of India",
  keyTerms: "Senior Engineer; six month probation; ninety days notice after it.",
  createdAt: "2026-09-22T09:50:00.000Z",
  version: 3,
  // Sent back once, after draft 1.
  revisionCount: 1,
  claimedAt: "2026-09-23T06:10:00.000Z",
  conflictDeclaredAt: "2026-09-23T06:10:00.000Z",
  payment: paid("standard", "2026-09-22T10:30:00.000Z"),
  settledAt: null,
  analysisCompletesAt: null,
  advocate: CURRENT_ADVOCATE,
  clauses: employmentRereviewClauses,
  findings: [
    {
      findingId: "find-e1",
      source: "pipeline",
      layer: 3,
      severity: "low",
      clauseReference: "Clause 1.2",
      clauseText:
        "The Company may extend the probationary period once, by up to three (3) months, on written notice.",
      description:
        "The probation can be extended once, but the clause does not say who gives the notice or how long before the six months end it must be given.",
      ruleApplied: "PROBATION-EXTENSION-CLARITY-V1",
      remedySuggested: "State who gives the notice, and that it is given before the probation ends.",
      citations: [],
      disposition: "confirmed",
      overrideNote:
        "Confirmed. No source applies, so this rests on judgment: the concern stands and the notice is to come from the Head of Engineering before the end of month six.",
      resolvedAt: "2026-09-24T09:10:00.000Z",
      changeRequest: null,
    },
    {
      findingId: "find-e3",
      source: "pipeline",
      layer: 3,
      severity: "medium",
      clauseReference: "Clause 3.1",
      clauseText:
        "The Company shall pay the Employee an annual cost to company of Rs 24,00,000, payable monthly in arrears and subject to deduction of tax at source and statutory contributions.",
      description:
        "The clause gives one figure as the annual cost to company without saying what it is made up of, and Clause 3.2 leaves any increase to the Company.",
      ruleApplied: "REMUNERATION-COMPONENTS-V1",
      remedySuggested: "State the fixed and variable parts of the figure, and when each is paid.",
      citations: [],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: {
        request:
          "Please tell me what the annual cost to company of Rs 24,00,000 is made up of: fixed pay, variable pay and any benefits, and when each is paid. I will have Clause 3.1 say so.",
        requestedAt: "2026-09-24T09:25:00.000Z",
        requestedBy: CURRENT_ADVOCATE.name,
        response:
          "Rs 20,00,000 is fixed, paid monthly. Rs 4,00,000 is variable, paid quarterly. There are no other benefits counted in the figure.",
        respondedAt: "2026-09-30T08:30:00.000Z",
      },
    },
    {
      findingId: "find-e4",
      source: "pipeline",
      layer: 3,
      severity: "medium",
      clauseReference: "Clause 4.1",
      clauseText: EMPLOYMENT_PLACE_OF_WORK_REWORDED,
      description:
        "The Employee can now be directed to work elsewhere on fourteen days notice, but Clause 1.2 gives fifteen days notice to end the employment in probation. A move could be required on less notice than it takes to leave.",
      ruleApplied: "NOTICE-PERIOD-CONSISTENCY-V1",
      remedySuggested: "Align the two notice periods, or say why they differ.",
      citations: [],
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    },
    {
      findingId: "find-e5",
      source: "pipeline",
      layer: 4,
      severity: "low",
      clauseReference: "Clause 7.1",
      clauseText:
        "After the probationary period, either party may terminate the employment on ninety (90) days written notice.",
      description:
        "Both parties have ninety days notice, but the clause says nothing about pay in place of notice if either party ends the employment sooner.",
      ruleApplied: "LIABILITY-ASYMMETRY-V1",
      remedySuggested: "State whether notice may be waived or paid for.",
      citations: [],
      disposition: "overridden",
      overrideNote:
        "Overridden. The clause stands as drafted; the advocate judged the silence acceptable for a senior engineer.",
      resolvedAt: "2026-10-01T11:00:00.000Z",
      changeRequest: null,
    },
  ],
  executionSteps: [],
};

/**
 * A second signed-off document, settled by the advocate the preview signs in
 * as. The first was settled by another advocate, so between them the
 * consultation inbox can show a request that is yours and one that is not.
 * It has no findings and one draft: it exists to be asked about.
 */
const settledNda2: ContractDocument = {
  ...structuredClone(settledNda),
  id: "doc-nda-settled-2",
  title: "Mutual NDA · Tarang Foods",
  counterpartyName: "Tarang Foods Pvt Ltd",
  createdAt: "2026-08-10T08:30:00.000Z",
  version: 1,
  claimedAt: "2026-08-11T10:00:00.000Z",
  conflictDeclaredAt: "2026-08-11T10:00:00.000Z",
  payment: paid("standard", "2026-08-10T09:00:00.000Z"),
  settledAt: "2026-08-12T15:20:00.000Z",
  advocate: { ...CURRENT_ADVOCATE },
  findings: [],
};

// A document the client has not yet paid for: screened and tiered, and not in
// the advocate queue. It gives the dashboard a document in this state from the
// first load, with the pay step to show. Fictional parties.
const awaitingPaymentVendor: ContractDocument = {
  id: "doc-vendor-awaiting-payment",
  title: "Vendor Agreement · Orchid Packaging",
  type: "vendor",
  status: "awaiting_payment",
  tier: "enhanced",
  orgId: MOCK_CLIENT_ORG.id,
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Orchid Packaging Pvt Ltd",
  stateOfExecution: "Gujarat",
  transactionValue: 1800000,
  counterpartyIsMsme: true,
  durationMonths: 12,
  governingLaw: "Laws of India",
  keyTerms: null,
  createdAt: "2026-09-30T09:00:00.000Z",
  version: 1,
  revisionCount: 0,
  claimedAt: null,
  settledAt: null,
  analysisCompletesAt: null,
  advocate: null,
  clauses: vendorClauses,
  findings: [],
  executionSteps: [],
};

// A document taken all the way: signed off, then every step of its execution
// checklist confirmed. Derived from the settled NDA so its text and sample
// stamp-duty entry are the same, and the sample is labelled as one.
const executedNda: ContractDocument = {
  ...structuredClone(settledNda),
  id: "doc-nda-executed",
  title: "Mutual NDA · Prabhat Steel",
  counterpartyName: "Prabhat Steel Pvt Ltd",
  status: "executed",
  createdAt: "2026-08-08T08:00:00.000Z",
  version: 1,
  claimedAt: "2026-08-09T10:00:00.000Z",
  conflictDeclaredAt: "2026-08-09T10:00:00.000Z",
  payment: paid("standard", "2026-08-08T08:40:00.000Z"),
  settledAt: "2026-08-11T12:00:00.000Z",
  executedAt: "2026-08-20T09:00:00.000Z",
  findings: [],
  executionSteps: settledNda.executionSteps.map((step) =>
    step.kind === "esignature"
      ? {
          ...structuredClone(step),
          complete: true,
          completedAt: "2026-08-20T09:00:00.000Z",
          completedBy: "Anaya Textiles Pvt Ltd",
          evidence: { name: "signed-copy.pdf", attachedAt: "2026-08-20T08:55:00.000Z" },
        }
      : structuredClone(step),
  ),
};

export const mockDocuments: ContractDocument[] = [
  settledNda,
  settledNda2,
  pendingReviewMsa,
  analysingEmployment,
  revisionVendor,
  rereviewEmployment,
  awaitingPaymentVendor,
  executedNda,
];

export function getMockDocumentById(id: string): ContractDocument | undefined {
  return mockDocuments.find((doc) => doc.id === id);
}
