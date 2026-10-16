/**
 * Findings exactly as the backend will send them (R1, lib/contracts.ts): snake_case, a
 * `citations` list, and `added` as a status. Never typed as the screens' `Finding`, so using
 * them goes through lib/api/findings.ts the way real data will.
 *
 * Written against the Master Services Agreement fixture (doc-msa-pending): the clause
 * references and quoted spans are that document's own. One finding per status, a verified
 * and a blocked citation, two citations on one finding, and one sparse finding that carries
 * only what R1 requires.
 */
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

export const R1_FINDING_IDS = {
  pending: id(1),
  confirmed: id(2),
  overridden: id(3),
  added: id(4),
  sparse: id(5),
} as const;

export const R1_FINDINGS: unknown[] = [
  {
    // Pending. Two sources on one finding: one the corpus confirmed, one it could not.
    finding_id: R1_FINDING_IDS.pending,
    layer: 2,
    severity: "high",
    rule_applied: "ICA-S27-NONCOMPETE-V2",
    clause_reference: "Clause 7.2",
    clause_text:
      "The Service Provider shall not, for a period of three (3) years following termination, engage in any business activity within India that competes with the Client.",
    description:
      "This non-compete clause is broader than what Indian law will enforce against an independent service provider.",
    remedy_suggested:
      "Narrow the restriction to solicitation of the Client's active customers for 12 months, and remove the nationwide scope.",
    citations: [
      { text: "Indian Contract Act, 1872, s.27", verified: true, corpus_ref: "ica-1872-s27" },
      { text: "Purported High Court ruling on post-termination restraint", verified: false, corpus_ref: null },
    ],
    status: "pending",
    override_note: null,
  },
  {
    // Confirmed by the advocate.
    finding_id: R1_FINDING_IDS.confirmed,
    layer: 2,
    severity: "medium",
    rule_applied: "MSMED-S15-PAYMENT-TERM",
    clause_reference: "Clause 4.1",
    clause_text: "Payment shall be made within sixty (60) days of receipt of a valid invoice.",
    description:
      "The counterparty is a registered MSME. A 60-day payment term exceeds the statutory ceiling for micro and small enterprises.",
    remedy_suggested: "Reduce the payment term to 45 days to comply with Section 15 of the MSMED Act, 2006.",
    citations: [
      {
        text: "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
        verified: true,
        corpus_ref: "msmed-2006-s15",
      },
    ],
    status: "confirmed",
    override_note: null,
  },
  {
    // Overridden by the advocate, resting on a source the corpus could not confirm.
    finding_id: R1_FINDING_IDS.overridden,
    layer: 3,
    severity: "low",
    rule_applied: "JURIS-SEAT-DOMESTIC-V1",
    clause_reference: "Clause 11.4",
    clause_text: "Any dispute arising under this Agreement shall be resolved by arbitration seated in Singapore.",
    description:
      "A foreign arbitration seat for a wholly domestic contract raises enforceability questions the pipeline could not resolve against the corpus.",
    remedy_suggested: "Confirm whether a domestic seat (Mumbai) was intended before this clause is finalised.",
    citations: [
      { text: "Purported precedent on foreign-seated domestic arbitration", verified: false, corpus_ref: null },
    ],
    status: "overridden",
    override_note: "Both parties are domestic but the client chose a neutral seat on purpose. Left as agreed.",
  },
  {
    // Added by the advocate in review: no pipeline rule, no source, already decided.
    finding_id: R1_FINDING_IDS.added,
    layer: 0,
    severity: "medium",
    rule_applied: null,
    clause_reference: "Clause 8.1",
    clause_text:
      "The total aggregate liability of each party under this Agreement is limited to the total charges paid or payable in the twelve (12) months preceding the event giving rise to the claim.",
    description: "The cap is silent on liability for breach of confidentiality, which the client would expect to sit outside it.",
    remedy_suggested: "Carve breach of confidentiality out of the cap in clause 8.1.",
    citations: [],
    status: "added",
    override_note: null,
  },
  {
    // Only what R1 requires: every optional field absent.
    finding_id: R1_FINDING_IDS.sparse,
    layer: 1,
    severity: "low",
    description: "A defined term is used before it is defined.",
  },
];
