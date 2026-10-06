import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addNote } from "./api/notes";
import { getClientDelivery, getClientSummary } from "./api/client/delivery";
import { getClientDocument, listClientDocuments } from "./api/client/documents";
import { getClientNotifications } from "./api/client/notifications";
import { listClientOrgConsultations } from "./api/client/consultations";
import { shapeClientDocument, shapeClientSummary } from "./api/client/shape-document";
import { getClientSettlementNotes } from "./api/client/settlement-notes";
import { shapeClientSettlementNotes } from "./api/client/shape-settlement-notes";
import { getClientTrail } from "./api/client/trail";
import { getClientVersions } from "./api/client/versions";
import { heldDocument } from "./api/documents";
import { requestDataExport } from "./api/privacy";
import { settle } from "./api/testing";
import { buildDataExport } from "./privacy";
import { mockDocuments } from "./mock/documents.mock";
import type { ContractDocument, DocumentStatus, SettlementNote } from "./types";

/**
 * A note to the client reaches a client at sign-off and not before, and a draft, a
 * note not released and a working note never do. The sentinels below are put in a
 * note of each kind, and every place a client is handed something is searched for
 * them: first the shapers, over every fixture at every status, then the real
 * client reads against the store.
 */

const WORKING = "LEAK-WORKING-NOTE-xq7";
const DRAFT = "LEAK-DRAFT-NOTE-xq7";
const MARKED = "LEAK-MARKED-NOT-RELEASED-xq7";
const RELEASED = "LEAK-RELEASED-NOTE-xq7";
const ALL = [WORKING, DRAFT, MARKED, RELEASED];

const STATUSES: DocumentStatus[] = [
  "draft",
  "analysing",
  "awaiting_payment",
  "pending_review",
  "under_review",
  "revision",
  "settled",
  "executed",
];

const note = (id: string, clause: string, text: string, over: Partial<SettlementNote>): SettlementNote => ({
  id,
  clauseNumber: clause,
  text,
  shareWithClient: false,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-01T09:00:00.000Z",
  releasedAt: null,
  ...over,
});

/** A note of each kind, on the first clauses of a document. */
function notesFor(doc: ContractDocument): SettlementNote[] {
  const [a = { number: "1.1" }, b = { number: "1.2" }, c = { number: "1.3" }] = doc.clauses;
  return [
    note("n-draft", a.number, DRAFT, {}),
    note("n-marked", b.number, MARKED, { shareWithClient: true }),
    note("n-released", c.number, RELEASED, { shareWithClient: true, releasedAt: "2026-10-02T09:00:00.000Z" }),
  ];
}

const text = (value: unknown) => JSON.stringify(value);
const found = (value: unknown, sentinel: string) => text(value).includes(sentinel);

describe("the notes to the client, in every fixture at every status", () => {
  it("are read over fixtures with clauses, signed off and not, to be meaningful", () => {
    expect(mockDocuments.filter((d) => d.clauses.length >= 3).length).toBeGreaterThanOrEqual(4);
    expect(mockDocuments.some((d) => d.status === "settled")).toBe(true);
    expect(mockDocuments.some((d) => d.status === "under_review")).toBe(true);
  });

  it("hand over nothing at all before a recorded sign-off, and never a draft or a note not released", () => {
    for (const fixture of mockDocuments) {
      for (const status of STATUSES) {
        const doc: ContractDocument = { ...structuredClone(fixture), status, settlementNotes: notesFor(fixture) };
        const client = shapeClientDocument(doc);
        const shaped = shapeClientSettlementNotes(doc);
        const everything = [
          client,
          shapeClientSummary(doc),
          shaped,
          buildDataExport({
            organisation: { name: "Org", gstin: null },
            documents: [client],
            invoices: [],
            consultations: [],
            settlementNotes: { [doc.id]: shaped },
            privacy: { trainingOptIn: false, consentLog: [], deletionRequestedAt: null } as never,
            now: new Date("2026-10-06T00:00:00.000Z"),
          }),
        ];
        const label = `${fixture.id} as ${status}`;
        // A draft and a note not released are never handed over, whatever the status.
        expect(found(everything, DRAFT), label).toBe(false);
        expect(found(everything, MARKED), label).toBe(false);
        expect(found(everything, WORKING), label).toBe(false);
        if (client.signOff === null) {
          // Before sign-off: no note, and no sign that there is one.
          expect(shaped, label).toEqual([]);
          expect(found(everything, RELEASED), label).toBe(false);
        } else {
          expect(shaped.map((n) => n.text), label).toEqual([RELEASED]);
        }
      }
    }
  });

  it("read the same, before sign-off, for a document with notes and one without", () => {
    for (const fixture of mockDocuments) {
      for (const status of STATUSES) {
        const bare: ContractDocument = { ...structuredClone(fixture), status, settlementNotes: undefined };
        const written: ContractDocument = { ...structuredClone(fixture), status, settlementNotes: notesFor(fixture) };
        if (shapeClientDocument(bare).signOff !== null) continue;
        const label = `${fixture.id} as ${status}`;
        expect(shapeClientDocument(written), label).toEqual(shapeClientDocument(bare));
        expect(shapeClientSummary(written), label).toEqual(shapeClientSummary(bare));
        expect(shapeClientSettlementNotes(written), label).toEqual(shapeClientSettlementNotes(bare));
      }
    }
  });

  it("are not handed over for a document that says it is settled but has no sign-off on record", () => {
    for (const fixture of mockDocuments) {
      const doc: ContractDocument = {
        ...structuredClone(fixture),
        status: "settled",
        advocate: null,
        settledAt: null,
        settlementNotes: notesFor(fixture),
      };
      expect(shapeClientSettlementNotes(doc), fixture.id).toEqual([]);
    }
  });

  it("name every field they hand over, so a field added to a stored note is not handed over with it", () => {
    const doc: ContractDocument = { ...structuredClone(mockDocuments.find((d) => d.id === "doc-nda-settled")!) };
    doc.settlementNotes = [
      { ...note("n-released", "1.1", RELEASED, { shareWithClient: true, releasedAt: "2026-10-02T09:00:00.000Z" }), extra: "NEW-FIELD" } as SettlementNote,
    ];
    const [shaped] = shapeClientSettlementNotes(doc);
    expect(Object.keys(shaped).sort()).toEqual(["clauseNumber", "id", "releasedAt", "text"]);
    expect(found(shaped, "NEW-FIELD")).toBe(false);
  });
});

describe("the real client reads, against the store", () => {
  const org = "org-anaya-textiles";
  // Signed off by Rhea Kapoor (adv-1), and held and not signed off by Ananya Rao (adv-current).
  const signed = { id: "doc-nda-settled", holder: "adv-1" };
  const unsigned = { id: "doc-employment-rereview", holder: "adv-current" };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Put a note of each kind in the store, as an advocate's work would leave them, and a working note too. */
  async function seed(target: { id: string; holder: string }) {
    const live = heldDocument(target.id, target.holder);
    live.settlementNotes = notesFor(live);
    await settle(addNote({ documentId: target.id, clauseId: "cl-1", advocateId: target.holder, text: WORKING }));
  }

  /** Everything a client is handed about one document. */
  async function handedOver(id: string) {
    const [document, versions, trail, delivery, summary, notes] = await Promise.all([
      settle(getClientDocument(org, id)),
      settle(getClientVersions(org, id)),
      settle(getClientTrail(org, id)),
      settle(getClientDelivery(org, id)),
      settle(getClientSummary(org, id)),
      settle(getClientSettlementNotes(org, id)),
    ]);
    return { document, versions, trail, delivery, summary, notes };
  }

  /** What is handed over beyond one document: lists, notifications, requests and the export. */
  async function handedOverAround() {
    const [list, notifications, consultations, exported] = await Promise.all([
      settle(listClientDocuments(org)),
      settle(getClientNotifications(org)),
      settle(listClientOrgConsultations(org)),
      settle(requestDataExport(org)),
    ]);
    return { list, notifications, consultations, exported: JSON.parse(exported.contents) };
  }

  it("hand a client the released note on a signed-off document, and nothing else a note was", async () => {
    await seed(signed);
    const read = await handedOver(signed.id);
    expect(read.notes.map((n) => n.text)).toEqual([RELEASED]);
    // Only the notes read and the export carry it; no other read does.
    for (const [name, value] of Object.entries(read)) {
      if (name === "notes") continue;
      expect(found(value, RELEASED), name).toBe(false);
    }
    const around = await handedOverAround();
    for (const [name, value] of Object.entries(around)) {
      if (name === "exported") continue;
      expect(found(value, RELEASED), name).toBe(false);
    }
    const exportedDoc = around.exported.documents.find((d: { id: string }) => d.id === signed.id);
    expect(exportedDoc.settlementNotes.map((n: { text: string }) => n.text)).toEqual([RELEASED]);
    // The advocate's draft, the note not released and the working note are in none of it.
    for (const sentinel of [DRAFT, MARKED, WORKING]) {
      expect(found(read, sentinel), sentinel).toBe(false);
      expect(found(around, sentinel), sentinel).toBe(false);
    }
  });

  it("hand a client nothing of any note on a document that is not signed off, even one marked released", async () => {
    await seed(unsigned);
    const read = await handedOver(unsigned.id);
    expect(read.notes).toEqual([]);
    const around = await handedOverAround();
    // This document's own entry in the export, and every read of it, hold none of the four.
    const exportedDoc = around.exported.documents.find((d: { id: string }) => d.id === unsigned.id);
    expect(exportedDoc.settlementNotes).toEqual([]);
    for (const sentinel of ALL) {
      expect(found(read, sentinel), sentinel).toBe(false);
      expect(found(exportedDoc, sentinel), sentinel).toBe(false);
      expect(found(around.list, sentinel), sentinel).toBe(false);
      expect(found(around.notifications, sentinel), sentinel).toBe(false);
      expect(found(around.consultations, sentinel), sentinel).toBe(false);
    }
    // The signed-off document seeded by the test before this one may carry its released note in
    // the export, and that is all: a draft, a note not released and a working note are nowhere.
    for (const sentinel of [DRAFT, MARKED, WORKING]) expect(found(around, sentinel), sentinel).toBe(false);
  });

  it("refuse another organisation's document exactly as a missing one", async () => {
    const other = await settle(getClientSettlementNotes("org-someone-else", signed.id).catch((e: Error) => e.message));
    const missing = await settle(getClientSettlementNotes(org, "no-such-document").catch((e: Error) => e.message));
    expect(other).toBe("Document not found.");
    expect(missing).toBe(other);
  });
});
