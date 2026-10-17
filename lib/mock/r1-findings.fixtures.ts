/**
 * Findings exactly as the backend will send them (R1, lib/contracts.ts): snake_case, the layer
 * by name, one `citation` string, and `added` as a status. Never typed as the screens'
 * `Finding`, so using them goes through lib/api/findings.ts the way real data will.
 *
 * Written against the Master Services Agreement fixture (doc-msa-pending): the clause
 * references are that document's own. One finding per status, one at critical severity, and
 * the layer given as a name on all but one, which is the stored integer.
 *
 * `clause_text` and `override_note` are not in the agent's schema; the findings API may carry
 * them, so a couple of these do, and the others leave them out.
 */
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

export const R1_FINDING_IDS = {
  pending: id(1),
  confirmed: id(2),
  overridden: id(3),
  added: id(4),
  critical: id(5),
} as const;

export const R1_FINDINGS: unknown[] = [
  {
    // Pending, from the statutory layer.
    finding_id: R1_FINDING_IDS.pending,
    layer: "STATUTORY",
    severity: "high",
    clause_reference: "Clause 7.2",
    clause_text:
      "The Service Provider shall not, for a period of three (3) years following termination, engage in any business activity within India that competes with the Client.",
    description:
      "This non-compete clause is broader than what Indian law will enforce against an independent service provider.",
    rule_applied: "ICA_S27_NONCOMPETE_V2",
    remedy_suggested:
      "Narrow the restriction to solicitation of the Client's active customers for 12 months, and remove the nationwide scope.",
    citation: "Indian Contract Act, 1872, s.27",
    status: "pending",
  },
  {
    // Confirmed by the advocate.
    finding_id: R1_FINDING_IDS.confirmed,
    layer: "STATUTORY",
    severity: "medium",
    clause_reference: "Clause 4.1",
    clause_text: "Payment shall be made within sixty (60) days of receipt of a valid invoice.",
    description:
      "The counterparty is a registered MSME. A 60-day payment term exceeds the statutory ceiling for micro and small enterprises.",
    rule_applied: "MSMED_S15_PAYMENT_TERM",
    remedy_suggested: "Reduce the payment term to 45 days to comply with Section 15 of the MSMED Act, 2006.",
    citation: "Micro, Small and Medium Enterprises Development Act, 2006, s.15",
    status: "confirmed",
  },
  {
    // Overridden by the advocate, with the advocate's note.
    finding_id: R1_FINDING_IDS.overridden,
    layer: "CONSISTENCY",
    severity: "low",
    clause_reference: "Clause 11.4",
    clause_text: "Any dispute arising under this Agreement shall be resolved by arbitration seated in Singapore.",
    description:
      "A foreign arbitration seat for a wholly domestic contract raises enforceability questions the pipeline could not resolve.",
    rule_applied: "JURIS_SEAT_DOMESTIC_V1",
    remedy_suggested: "Confirm whether a domestic seat (Mumbai) was intended before this clause is finalised.",
    citation: "Indian Contract Act, 1872, s.28",
    status: "overridden",
    override_note: "Both parties are domestic but the client chose a neutral seat on purpose. Left as agreed.",
  },
  {
    // Added by the advocate in review: already decided. The layer is the stored integer.
    finding_id: R1_FINDING_IDS.added,
    layer: 0,
    severity: "medium",
    clause_reference: "Clause 8.1",
    clause_text:
      "The total aggregate liability of each party under this Agreement is limited to the total charges paid or payable in the twelve (12) months preceding the event giving rise to the claim.",
    description: "The cap is silent on liability for breach of confidentiality, which the client would expect to sit outside it.",
    rule_applied: "MANUAL_ADVOCATE_ADDED",
    remedy_suggested: "Carve breach of confidentiality out of the cap in clause 8.1.",
    citation: "Indian Contract Act, 1872, s.74",
    status: "added",
  },
  {
    // The most serious severity.
    finding_id: R1_FINDING_IDS.critical,
    layer: "COMPLETENESS",
    severity: "critical",
    clause_reference: "Clause 6.1",
    clause_text:
      "Each party shall keep confidential all information of the other party that is designated as confidential or that ought reasonably to be regarded as confidential, and shall not use it other than for the performance of this Agreement.",
    description: "The confidentiality duty has no stated end date and no carve-out for information a party already holds.",
    rule_applied: "CONFIDENTIALITY_TERM_MISSING",
    remedy_suggested: "State how long the duty lasts after the Agreement ends, and list what falls outside it.",
    citation: "Indian Contract Act, 1872, s.27",
    status: "pending",
  },
];
