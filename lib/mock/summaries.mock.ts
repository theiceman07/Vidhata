import type { SettledSummary, SummaryItem } from "@/lib/types";

/**
 * Plain-language summaries of settled documents.
 *
 * THESE ARE FIXTURES. In the real system a summary is generated from the
 * settled text, after sign-off, and never before. Until that exists this file
 * stands in for it, and it holds itself to the same rule: every line is a
 * statement of what the settled clauses say, taken from those clauses and
 * nothing else. No statute text, no section number, no case name, no opinion
 * and no advice. A line about something the document does not contain says so
 * and cites no clause.
 *
 * lib/mock/summaries.mock.test.ts holds every line to the document it
 * summarises: the clauses it cites exist, the figures it states are in them,
 * and what it says is absent is absent.
 *
 * Each summary names the draft it was written from, so it is never shown
 * against a text that has since changed.
 */

/** The mutual NDA's key terms, for a given pair of parties. */
function ndaItems(client: string, counterparty: string): SummaryItem[] {
  return [
    {
      label: "Who it is between",
      text: `${client} and ${counterparty}. Each may share confidential information with the other for the stated purpose and no other.`,
      clauses: ["1.1"],
    },
    {
      label: "What counts as confidential",
      text: "Information either side shares that is marked confidential, or that a reasonable person would see as confidential given what it is and how it was shared. It includes technical specifications, pricing, customer lists, manufacturing processes and business plans.",
      clauses: ["2.1"],
    },
    {
      label: "What does not",
      text: "Information that is public through no act or omission of the side receiving it, that it lawfully held before, that it lawfully received from someone else without restriction, or that it developed independently.",
      clauses: ["2.2"],
    },
    {
      label: "Term",
      text: "It starts on the date of last signature and runs for 24 months.",
      clauses: ["4.1"],
    },
    {
      label: "Termination",
      text: "Either side can end it earlier by giving the other 30 days' written notice.",
      clauses: ["4.1"],
    },
    {
      label: "After it ends",
      text: "The duty of confidentiality continues for 3 years. For information that is a trade secret it continues for as long as the information stays a trade secret.",
      clauses: ["4.2"],
    },
    {
      label: "Returning materials",
      text: "On written request the receiving side returns or destroys the materials and confirms in writing that it has. It may keep one copy, only to show that it complied.",
      clauses: ["6.1"],
    },
    {
      label: "Payment",
      text: "The document has no payment terms.",
      clauses: [],
    },
    {
      label: "Liability",
      text: "The receiving side stays responsible for any breach by the people it shares information with. The document sets no cap on liability and has no indemnity.",
      clauses: ["3.2"],
    },
    {
      label: "Governing law",
      text: "Indian law governs it, and the courts at New Delhi have exclusive jurisdiction.",
      clauses: ["7.1"],
    },
  ];
}

export const mockSummaries: SettledSummary[] = [
  {
    documentId: "doc-nda-settled",
    draft: 2,
    items: ndaItems("Anaya Textiles Pvt Ltd", "Kavach Robotics Pvt Ltd"),
  },
  {
    documentId: "doc-nda-settled-2",
    draft: 1,
    items: ndaItems("Anaya Textiles Pvt Ltd", "Tarang Foods Pvt Ltd"),
  },
];
