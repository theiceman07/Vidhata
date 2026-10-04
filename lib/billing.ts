import { tierLabel } from "@/lib/config/pricing";
import type { Consultation, ContractDocument, Invoice } from "@/lib/types";

/**
 * Billing, read from the documents and the consultations.
 *
 * An invoice is not stored. The payment a document or a consultation carries
 * is the record, and an invoice is a reading of it, so the two cannot drift
 * apart. Invoices are numbered in the order they were paid, within the year,
 * across both kinds, so a number never changes once it has been given: a later
 * payment only adds to the end.
 *
 * Nothing here reads a finding, and nothing reads a consultation's question or
 * answer. A receipt says what was paid for and when.
 */

/** What a kind of fee is called, so the two are never run together. */
export const INVOICE_KIND_LABEL: Record<Invoice["kind"], string> = {
  document_fee: "Document fee",
  consultation_fee: "Consultation fee",
};

/** What an invoice's fee was for, in a line: the tier for a document, the advocate for a consultation. */
export function invoiceBasis(invoice: Pick<Invoice, "kind" | "tier">): string {
  return invoice.kind === "consultation_fee"
    ? "Fixed fee · with the advocate who settled the document"
    : `Fixed fee · ${tierLabel(invoice.tier)} review`;
}

/** The invoices for these documents and consultations, newest first. */
export function invoicesFor(
  docs: ContractDocument[],
  consultations: Pick<Consultation, "id" | "documentId" | "documentTitle" | "fee" | "paidAt">[] = [],
): Invoice[] {
  const payments: Omit<Invoice, "number">[] = [
    ...docs
      .filter((d) => d.payment)
      .map(
        (doc): Omit<Invoice, "number"> => ({
          issuedAt: doc.payment!.paidAt,
          kind: "document_fee",
          documentId: doc.id,
          description: doc.title,
          tier: doc.tier,
          amount: doc.payment!.amount,
        }),
      ),
    ...consultations
      .filter((c) => c.paidAt && c.fee !== null)
      .map(
        (c): Omit<Invoice, "number"> => ({
          issuedAt: c.paidAt!,
          kind: "consultation_fee",
          documentId: c.documentId,
          description: c.documentTitle,
          tier: null,
          amount: c.fee!,
        }),
      ),
  ].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));

  const sequence: Record<number, number> = {};
  const invoices = payments.map((payment): Invoice => {
    const year = new Date(payment.issuedAt).getUTCFullYear();
    sequence[year] = (sequence[year] ?? 0) + 1;
    return { number: `VID-${year}-${String(sequence[year]).padStart(4, "0")}`, ...payment };
  });
  return invoices.reverse();
}
