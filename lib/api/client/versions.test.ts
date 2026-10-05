import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientVersionDiff, clientVersionList } from "@/lib/clientVersions";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { mockVersions } from "@/lib/mock/versions.mock";
import type { ClientFindingRow, ContractDocument, DocumentVersion } from "@/lib/types";
import { settle } from "../testing";
import { leaked, markersFor } from "./markers";
import { getClientDiff, getClientVersions } from "./versions";
import { shapeClientDiff, shapeClientVersionList } from "./shape-versions";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const doc = (id: string) => mockDocuments.find((d) => d.id === id)!;
const versionsOf = (id: string) =>
  mockVersions.filter((v) => v.documentId === id).sort((a, b) => a.number - b.number);
const vendor = doc("doc-vendor-revision");
const nda = doc("doc-nda-settled");
const withHistory = mockDocuments.filter((d) => versionsOf(d.id).length >= 2);

/** Every pair of drafts a document has. */
const pairs = (versions: DocumentVersion[]) =>
  versions.flatMap((a, i) => versions.slice(i + 1).map((b) => [a.number, b.number] as const));

describe("the client's list of drafts", () => {
  it("is the drafts, newest first, as counts and never the drafts themselves", () => {
    const list = shapeClientVersionList(vendor, versionsOf(vendor.id));
    expect(list.map((r) => r.number)).toEqual([4, 3, 2, 1]);
    expect(list[0]).toEqual(expect.objectContaining({ label: "Draft 4 (current)", current: true }));
    for (const row of list) {
      expect(Object.keys(row).sort()).toEqual([
        "clauseCount",
        "createdAt",
        "current",
        "findingCount",
        "label",
        "madeBy",
        "number",
      ]);
    }
  });

  it("counts only the findings the client may know of, in each draft", () => {
    // Draft 4 holds findings the advocate added. The client knows of two.
    const [latest] = shapeClientVersionList(vendor, versionsOf(vendor.id));
    expect(latest.findingCount).toBe(2);
  });
});

describe("what changed between two drafts, for the client", () => {
  it("is the same account the existing client diff gives, with the numbers a client was given", () => {
    expect(withHistory.length).toBeGreaterThanOrEqual(3);
    for (const d of withHistory) {
      const versions = versionsOf(d.id);
      for (const [a, b] of pairs(versions)) {
        const shaped = shapeClientDiff(d, versions, a, b);
        const old = clientVersionDiff(d, versions, a, b);
        expect(shaped.ok, `${d.id} ${a}-${b}`).toBe(true);
        if (!shaped.ok || !old.ok) continue;
        const withoutNumbers = (rows: ClientFindingRow[]) =>
          rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "number")));
        expect(withoutNumbers(shaped.diff.findingRows), `${d.id} ${a}-${b}`).toEqual(
          withoutNumbers(old.diff.findingRows),
        );
        expect({ ...shaped.diff, findingRows: [] }).toEqual({ ...old.diff, findingRows: [] });
      }
    }
  });

  it("names a finding by the same number in every comparison that shows it", () => {
    for (const d of withHistory) {
      const versions = versionsOf(d.id);
      const numbersByClause = new Map<string, Set<string>>();
      for (const [a, b] of pairs(versions)) {
        const result = shapeClientDiff(d, versions, a, b);
        if (!result.ok) continue;
        for (const row of result.diff.findingRows) {
          const seen = numbersByClause.get(row.clauseReference) ?? new Set<string>();
          seen.add(row.number);
          numbersByClause.set(row.clauseReference, seen);
        }
      }
      for (const [clause, numbers] of numbersByClause) {
        expect([...numbers], `${d.id} ${clause}`).toHaveLength(1);
      }
    }
  });

  it("numbers findings from their stored client numbers, so a later draft's finding keeps its place", () => {
    // Draft 1 has find-7 (01) and find-4 (02). Between 1 and 3, find-4 is carried over and
    // find-7 is gone. The old numbering gave the carried one 01 here; it is 02 everywhere.
    const versions = versionsOf(vendor.id);
    const result = shapeClientDiff(vendor, versions, 1, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byClause = Object.fromEntries(result.diff.findingRows.map((r) => [r.clauseReference, r.number]));
    expect(Object.values(byClause).sort()).toEqual(expect.arrayContaining(["02"]));
    expect(new Set(Object.values(byClause)).size).toBe(Object.values(byClause).length);
  });

  it("refuses to compare a draft with itself, or with one that is not there", () => {
    const versions = versionsOf(vendor.id);
    expect(shapeClientDiff(vendor, versions, 2, 2)).toEqual({ ok: false, reason: "same_draft" });
    expect(shapeClientDiff(vendor, versions, 2, 9)).toEqual({ ok: false, reason: "unknown_draft" });
  });

  it("is read as before sign-off for a document that says it is signed off without the record", () => {
    const versions = versionsOf(nda.id);
    const broken: ContractDocument = { ...nda, advocate: null };
    const result = shapeClientDiff(broken, versions, 1, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.signedOff).toBe(false);
    expect(result.diff.findingRows.every((r) => r.description === null && r.disposition === null)).toBe(true);
    const list = shapeClientVersionList(broken, versions);
    expect(list.map((r) => r.findingCount)).toEqual(
      clientVersionList({ ...broken, status: "under_review" }, versions).map((r) => r.findingCount),
    );
  });

  it("numbers a finding the switch has newly shown after the highest the client has", () => {
    // Signed off while the switch was off: the advocate-added finding has no client number in any draft.
    const strip = <T extends { findings: DocumentVersion["findings"] }>(x: T): T => ({
      ...x,
      findings: x.findings.map((f) => (f.source === "advocate" ? { ...f, clientNumber: null } : f)),
    });
    const versions = versionsOf(nda.id).map(strip);
    const result = shapeClientDiff(strip(nda), versions, 1, 2, { advocateAddedAfterSignOff: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diff.findingRows.map((r) => r.number)).toEqual(["01", "02"]);
  });
});

describe("what a client is handed of a document's history, over every fixture", () => {
  it("holds none of the machinery, and none of who the advocate is", () => {
    for (const d of withHistory) {
      const versions = versionsOf(d.id);
      const markers = markersFor(d, versions);
      expect(markers.machinery.length, d.id).toBeGreaterThan(0);
      const list = shapeClientVersionList(d, versions);
      expect(leaked(list, [...markers.machinery, ...markers.advocate]), `${d.id} list`).toEqual([]);
      for (const [a, b] of pairs(versions)) {
        const result = shapeClientDiff(d, versions, a, b);
        expect(leaked(result, [...markers.machinery, ...markers.advocate]), `${d.id} ${a}-${b}`).toEqual([]);
      }
    }
  });

  it("reads the same whatever the advocate decided, before sign-off", () => {
    const flip = <T extends { findings: DocumentVersion["findings"] }>(x: T, decided: boolean): T => ({
      ...x,
      findings: x.findings.map((f) => ({
        ...f,
        disposition: decided ? ("overridden" as const) : ("pending" as const),
        overrideNote: decided ? "The advocate's private reasoning." : null,
        resolvedAt: decided ? "2026-09-17T08:00:00.000Z" : null,
      })),
    });
    const versions = versionsOf(vendor.id);
    for (const [a, b] of pairs(versions)) {
      expect(
        shapeClientDiff(flip(vendor, true), versions.map((v) => flip(v, true)), a, b),
        `${a}-${b}`,
      ).toEqual(shapeClientDiff(flip(vendor, false), versions.map((v) => flip(v, false)), a, b));
    }
  });
});

describe("reading a client's history through the API", () => {
  it("returns the client's own list and comparison", async () => {
    expect(await settle(getClientVersions(ORG, vendor.id))).toEqual(
      shapeClientVersionList(vendor, versionsOf(vendor.id)),
    );
    expect(await settle(getClientDiff(ORG, vendor.id, 1, 3))).toEqual(
      shapeClientDiff(vendor, versionsOf(vendor.id), 1, 3),
    );
  });

  it("returns the same nothing for another organisation's document, as another organisation, and for one that is not there", async () => {
    // The MSA belongs to another client and has no history.
    const wrongClient = await settle(getClientVersions("org-bharosa-fintech", vendor.id));
    const missing = await settle(getClientVersions(ORG, "no-such-document"));
    const another = await settle(getClientVersions(ORG, "doc-msa-pending"));
    expect([wrongClient, missing, another]).toEqual([null, null, null]);

    const diffs = await Promise.all([
      settle(getClientDiff("org-bharosa-fintech", vendor.id, 1, 3)),
      settle(getClientDiff(ORG, "no-such-document", 1, 3)),
      settle(getClientDiff(ORG, "doc-msa-pending", 1, 3)),
    ]);
    expect(diffs).toEqual([null, null, null]);
  });
});
