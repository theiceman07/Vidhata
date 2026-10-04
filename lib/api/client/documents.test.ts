import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientVisibleFindings } from "@/lib/findings";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { clauseNumberFromReference } from "@/lib/types";
import { settle } from "../testing";
import { getClientDocument, listClientDocuments } from "./documents";
import { leaked, markersFor } from "./markers";
import { shapeClientDocument, shapeClientSummary } from "./shape-document";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const doc = (id: string) => mockDocuments.find((d) => d.id === id)!;
const vendor = doc("doc-vendor-revision");
const nda = doc("doc-nda-settled");

describe("a document as a client reads it, before sign-off", () => {
  const shaped = shapeClientDocument(vendor);

  it("meets no advocate: no sign-off, no name, no enrolment", () => {
    expect(shaped.signOff).toBeNull();
    expect(leaked(shaped, markersFor(vendor).advocate)).toEqual([]);
  });

  it("carries the clauses behind requests addressed to the client, in full, and counts the rest", () => {
    const asked = clientVisibleFindings(vendor)
      .filter((f) => f.changeRequest !== null)
      .map((f) => clauseNumberFromReference(f.clauseReference));
    expect(asked.length).toBeGreaterThan(0);
    expect(shaped.clauses.map((c) => c.number)).toEqual(
      vendor.clauses.filter((c) => asked.includes(c.number)).map((c) => c.number),
    );
    for (const c of shaped.clauses) {
      expect(Object.keys(c).sort()).toEqual(["body", "heading", "number"]);
      expect(c.body.length).toBeGreaterThan(20);
    }
    expect(shaped.otherClauseCount).toBe(vendor.clauses.length - shaped.clauses.length);
  });

  it("has no checklist yet", () => {
    expect(shaped.executionSteps).toEqual([]);
  });

  it("says that the fee was paid and never how much", () => {
    const paidDoc = mockDocuments.find((d) => d.payment)!;
    expect(paidDoc).toBeDefined();
    const paid = shapeClientDocument(paidDoc);
    expect(paid.paidAt).toBe(paidDoc.payment!.paidAt);
    expect(JSON.stringify(paid)).not.toMatch(/payment|amount|fee/i);
    expect(shapeClientDocument(doc("doc-vendor-awaiting-payment")).paidAt).toBeNull();
  });

  it("names exactly what it carries", () => {
    expect(Object.keys(shaped).sort()).toEqual([
      "claimedAt",
      "clauses",
      "createdAt",
      "deal",
      "executedAt",
      "executionSteps",
      "findingList",
      "id",
      "otherClauseCount",
      "paidAt",
      "signOff",
      "status",
      "tier",
      "title",
      "type",
      "version",
    ]);
    expect(Object.keys(shaped.deal).sort()).toEqual([
      "clientName",
      "counterpartyIsMsme",
      "counterpartyName",
      "durationMonths",
      "governingLaw",
      "keyTerms",
      "stateOfExecution",
      "transactionValue",
    ]);
  });
});

describe("a document as a client reads it, after sign-off", () => {
  const shaped = shapeClientDocument(nda);

  it("carries the sign-off record: who, under which enrolment, and when", () => {
    expect(shaped.signOff).toEqual({
      advocate: nda.advocate!.name,
      enrolment: nda.advocate!.bar,
      at: nda.settledAt,
    });
  });

  it("carries every clause, read-only, and counts none as kept back", () => {
    expect(shaped.clauses.map((c) => c.number)).toEqual(nda.clauses.map((c) => c.number));
    expect(shaped.otherClauseCount).toBe(0);
  });

  it("carries the checklist, and the findings with the advocate's decisions", () => {
    expect(shaped.executionSteps).toEqual(nda.executionSteps);
    expect(shaped.findingList.every((f) => f.detail !== null)).toBe(true);
  });

  it("puts the advocate in the sign-off record and nowhere else", () => {
    const { signOff, ...rest } = shaped;
    expect(signOff).not.toBeNull();
    expect(leaked(rest, markersFor(nda).advocate)).toEqual([]);
  });
});

describe("a document that says it is signed off without the record to show for it", () => {
  it("is read as not signed off: no record, no clauses, no checklist, no decisions", () => {
    for (const broken of [
      { ...nda, advocate: null },
      { ...nda, settledAt: null },
    ]) {
      const shaped = shapeClientDocument(broken);
      expect(shaped.signOff).toBeNull();
      expect(shaped.executionSteps).toEqual([]);
      expect(shaped.otherClauseCount).toBe(broken.clauses.length);
      expect(shaped.clauses).toEqual([]);
      expect(shaped.findingList.every((f) => f.detail === null)).toBe(true);
    }
  });
});

describe("what a client is handed of a document, over every fixture", () => {
  it("holds none of the machinery, and the advocate's identity only in the sign-off record", () => {
    expect(mockDocuments.length).toBeGreaterThanOrEqual(8);
    for (const d of mockDocuments) {
      const shaped = shapeClientDocument(d);
      const markers = markersFor(d);
      expect(leaked(shaped, markers.machinery), d.id).toEqual([]);
      const { signOff, ...rest } = shaped;
      expect(leaked(rest, markers.advocate), d.id).toEqual([]);
      const summary = shapeClientSummary(d);
      expect(leaked(summary, markers.machinery), d.id).toEqual([]);
      const { signOff: summarySignOff, ...summaryRest } = summary;
      expect(leaked(summaryRest, markers.advocate), d.id).toEqual([]);
      expect(summarySignOff).toEqual(signOff);
    }
  });
});

describe("a document as the client's list reads it", () => {
  const summary = shapeClientSummary(vendor);

  it("names exactly what it carries, and no clauses, findings or steps", () => {
    expect(Object.keys(summary).sort()).toEqual([
      "checklist",
      "claimedAt",
      "counterpartyName",
      "createdAt",
      "executedAt",
      "findingCount",
      "id",
      "latestRequestAt",
      "openRequests",
      "paidAt",
      "signOff",
      "status",
      "tier",
      "title",
      "type",
      "version",
    ]);
  });

  it("counts what the first pass raised, and the requests still waiting on the client", () => {
    expect(summary.findingCount).toBe(2);
    const visible = clientVisibleFindings(vendor);
    expect(summary.openRequests).toBe(
      visible.filter((f) => f.changeRequest && !f.changeRequest.response).length,
    );
    expect(summary.latestRequestAt).toBe(
      visible
        .map((f) => f.changeRequest?.requestedAt)
        .filter((d): d is string => Boolean(d))
        .sort()
        .at(-1),
    );
  });

  it("counts the checklist only once there is one", () => {
    expect(summary.checklist).toEqual({ done: 0, total: 0 });
    const applicable = nda.executionSteps.filter((s) => s.applicable);
    expect(shapeClientSummary(nda).checklist).toEqual({
      done: applicable.filter((s) => s.complete).length,
      total: applicable.length,
    });
  });
});

describe("reading a client's documents through the API", () => {
  it("returns the client's own document, shaped", async () => {
    const got = await settle(getClientDocument(ORG, vendor.id));
    expect(got).toEqual(shapeClientDocument(vendor));
  });

  it("returns the same nothing for another organisation's document, as that organisation, and for one that is not there", async () => {
    const another = await settle(getClientDocument(ORG, "doc-msa-pending"));
    const wrongClient = await settle(getClientDocument("org-bharosa-fintech", vendor.id));
    const missing = await settle(getClientDocument(ORG, "no-such-document"));
    expect([another, wrongClient, missing]).toEqual([null, null, null]);
  });

  it("lists the client's documents, whatever their state, and no one else's", async () => {
    const list = await settle(listClientDocuments(ORG));
    expect(list.map((d) => d.id).sort()).toEqual(
      mockDocuments
        .filter((d) => d.orgId === ORG)
        .map((d) => d.id)
        .sort(),
    );
    expect(list.map((d) => d.status)).toContain("awaiting_payment");
    for (const d of list) expect(d).not.toHaveProperty("clauses");
  });
});
