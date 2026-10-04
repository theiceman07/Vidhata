import { describe, expect, it } from "vitest";
import { INVOICE_KIND_LABEL, invoicesFor } from "./billing";
import { TIER_PRICING } from "./config/pricing";
import { mockDocuments } from "./mock/documents.mock";

const anaya = mockDocuments.filter((d) => d.orgId === "org-anaya-textiles");

describe("invoices", () => {
  const invoices = invoicesFor(anaya);

  it("are one per paid document, newest first", () => {
    expect(invoices).toHaveLength(anaya.filter((d) => d.payment).length);
    const dates = invoices.map((i) => i.issuedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("are numbered in the order paid, so a number never changes", () => {
    const expected = invoices.map((_, i) => `VID-2026-${String(i + 1).padStart(4, "0")}`);
    expect(invoices.map((i) => i.number).reverse()).toEqual(expected);
    // A later payment only adds to the end.
    const later = [
      ...anaya,
      {
        ...anaya[0],
        id: "doc-later",
        payment: { amount: 4999, paidAt: "2026-10-01T09:00:00.000Z" },
      },
    ];
    const withLater = invoicesFor(later);
    expect(withLater[0].number).toBe(`VID-2026-${String(invoices.length + 1).padStart(4, "0")}`);
    expect(withLater.slice(1).map((i) => i.number)).toEqual(invoices.map((i) => i.number));
  });

  it("restart their sequence each year", () => {
    const next = invoicesFor([
      { ...anaya[0], id: "a", payment: { amount: 1, paidAt: "2026-12-31T10:00:00.000Z" } },
      { ...anaya[0], id: "b", payment: { amount: 1, paidAt: "2027-01-02T10:00:00.000Z" } },
    ]);
    expect(next.map((i) => i.number)).toEqual(["VID-2027-0001", "VID-2026-0001"]);
  });

  it("carry the flat fee the tier sets, from the payment on the document", () => {
    for (const invoice of invoices) {
      const doc = anaya.find((d) => d.id === invoice.documentId)!;
      expect(invoice.amount).toBe(doc.payment!.amount);
      expect(invoice.amount).toBe(TIER_PRICING[doc.tier!].amount);
      expect(invoice.kind).toBe("document_fee");
    }
  });

  it("leave out a document that has not been paid for", () => {
    const unpaid = { ...anaya[0], id: "doc-unpaid", payment: undefined };
    expect(invoicesFor([unpaid])).toEqual([]);
  });

  it("say nothing of what the review found", () => {
    // A receipt is what was paid for and when. Nothing a client may not read
    // before sign-off can be in it, so it has no finding, no count and no layer.
    const text = JSON.stringify(invoices);
    expect(text).not.toMatch(/finding|layer|severity|citation|advocate/i);
    expect(Object.keys(invoices[0]).sort()).toEqual(
      ["amount", "description", "documentId", "issuedAt", "kind", "number", "tier"].sort(),
    );
  });

  it("keep a document fee and a consultation fee apart by name", () => {
    expect(INVOICE_KIND_LABEL.document_fee).not.toBe(INVOICE_KIND_LABEL.consultation_fee);
  });
});

describe("a consultation fee", () => {
  const nda = anaya.find((d) => d.id === "doc-nda-settled")!;
  const paidAt = "2026-10-03T11:00:00.000Z";
  const consultation = {
    id: "consultation-1",
    documentId: nda.id,
    documentTitle: nda.title,
    fee: 2999,
    paidAt,
  };

  it("is invoiced when it is paid, on its own line, numbered with the document fees", () => {
    const before = invoicesFor(anaya);
    const after = invoicesFor(anaya, [consultation]);
    expect(after).toHaveLength(before.length + 1);
    const [newest] = after;
    expect(newest).toMatchObject({
      kind: "consultation_fee",
      amount: 2999,
      issuedAt: paidAt,
      tier: null,
      documentId: nda.id,
    });
    // It takes the next number, and every earlier one stays as it was.
    expect(newest.number).toBe(`VID-2026-${String(before.length + 1).padStart(4, "0")}`);
    expect(after.slice(1).map((i) => i.number)).toEqual(before.map((i) => i.number));
  });

  it("is not invoiced until it is paid, accepted or not", () => {
    const accepted = { ...consultation, paidAt: null };
    const requested = { ...consultation, fee: null, paidAt: null };
    expect(invoicesFor(anaya, [accepted, requested])).toEqual(invoicesFor(anaya));
  });

  it("carries no question and no answer", () => {
    const withText = {
      ...consultation,
      question: "A question only the client wrote.",
      answer: "An answer only the advocate wrote.",
    };
    const [newest] = invoicesFor(anaya, [withText]);
    expect(JSON.stringify(newest)).not.toMatch(/only the client wrote|only the advocate wrote/);
    expect(Object.keys(newest).sort()).toEqual(
      ["amount", "description", "documentId", "issuedAt", "kind", "number", "tier"].sort(),
    );
  });
});
