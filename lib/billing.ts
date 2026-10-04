import type { ContractDocument, Invoice } from "@/lib/types";

/**
 * Billing, read from the documents.
 *
 * An invoice is not stored. The payment a document carries is the record, and
 * an invoice is a reading of it, so the two cannot drift apart. Invoices are
 * numbered in the order they were paid, within the year, so a number never
 * changes once it has been given: a later payment only adds to the end.
 *
 * Nothing here reads a finding. A receipt says what was paid for and when,
 * and nothing about what the review found.
 */

/** What a kind of fee is called, so the two are never run together. */
export const INVOICE_KIND_LABEL: Record<Invoice["kind"], string> = {
  document_fee: "Document fee",
  consultation_fee: "Consultation fee",
};

/** The invoices for these documents, newest first. */
export function invoicesFor(docs: ContractDocument[]): Invoice[] {
  const paid = docs
    .filter((d) => d.payment)
    .sort((a, b) => a.payment!.paidAt.localeCompare(b.payment!.paidAt));

  const sequence: Record<number, number> = {};
  const invoices = paid.map((doc): Invoice => {
    const year = new Date(doc.payment!.paidAt).getUTCFullYear();
    sequence[year] = (sequence[year] ?? 0) + 1;
    return {
      number: `VID-${year}-${String(sequence[year]).padStart(4, "0")}`,
      issuedAt: doc.payment!.paidAt,
      kind: "document_fee",
      documentId: doc.id,
      description: doc.title,
      tier: doc.tier,
      amount: doc.payment!.amount,
    };
  });
  return invoices.reverse();
}
