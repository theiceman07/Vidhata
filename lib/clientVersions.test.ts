import { describe, expect, it } from "vitest";
import {
  clientVersionDiff,
  clientVersionList,
  defaultComparison,
  dispositionText,
  findingsSummary,
  plainChange,
} from "./clientVersions";
import { mockDocuments } from "./mock/documents.mock";
import { mockVersions } from "./mock/versions.mock";
import type { ContractDocument } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;
const nda = mockDocuments.find((d) => d.id === "doc-nda-settled")!;
const vendorVersions = mockVersions.filter((v) => v.documentId === vendor.id);
const ndaVersions = mockVersions.filter((v) => v.documentId === nda.id);

function diffOf(
  doc: ContractDocument,
  versions: typeof vendorVersions,
  a: number,
  b: number,
  options?: { advocateAddedAfterSignOff?: boolean },
) {
  const result = clientVersionDiff(doc, versions, a, b, options);
  if (!result.ok) throw new Error(`expected a diff, got ${result.reason}`);
  return result.diff;
}

describe("the version list", () => {
  it("names the latest snapshot current, and no other", () => {
    const rows = clientVersionList(vendor, vendorVersions);
    expect(rows.map((r) => r.label)).toEqual([
      "Draft 4 (current)",
      "Draft 3",
      "Draft 2",
      "Draft 1",
    ]);
    expect(rows.map((r) => r.current)).toEqual([true, false, false, false]);
  });

  it("says in plain words who made each draft", () => {
    expect(clientVersionList(vendor, vendorVersions).map((r) => r.madeBy)).toEqual([
      "Advocate's revision",
      "Your answers",
      "Advocate's revision",
      "First pass",
    ]);
  });

  it("counts only the findings the client may know about", () => {
    // Draft 4 holds four findings, two of them added by the advocate and
    // not addressed to the client.
    expect(vendorVersions.find((v) => v.number === 4)!.findings).toHaveLength(4);
    const rows = clientVersionList(vendor, vendorVersions);
    expect(rows.map((r) => r.findingCount)).toEqual([2, 2, 2, 2]);
    expect(rows.map((r) => r.clauseCount)).toEqual([9, 9, 9, 9]);
  });

  it("counts an advocate-added finding after sign-off, unless the switch is off", () => {
    expect(clientVersionList(nda, ndaVersions).map((r) => r.findingCount)).toEqual([2, 1]);
    expect(
      clientVersionList(nda, ndaVersions, { advocateAddedAfterSignOff: false }).map(
        (r) => r.findingCount,
      ),
    ).toEqual([1, 1]);
  });

  it("is empty when there are no snapshots", () => {
    expect(clientVersionList(vendor, [])).toEqual([]);
  });
});

describe("which two drafts are compared by default", () => {
  it("is the latest two", () => {
    expect(defaultComparison(vendorVersions)).toEqual({ from: 3, to: 4 });
  });

  it("is nothing when there is no earlier draft", () => {
    expect(defaultComparison(vendorVersions.slice(0, 1))).toBeNull();
    expect(defaultComparison([])).toBeNull();
  });
});

describe("comparing two drafts", () => {
  it("refuses to compare a draft with itself", () => {
    expect(clientVersionDiff(vendor, vendorVersions, 2, 2)).toEqual({
      ok: false,
      reason: "same_draft",
    });
  });

  it("says so when a draft is not there", () => {
    expect(clientVersionDiff(vendor, vendorVersions, 2, 9)).toEqual({
      ok: false,
      reason: "unknown_draft",
    });
  });

  it("reads the earlier draft as the start whichever order they are given", () => {
    const forwards = diffOf(vendor, vendorVersions, 3, 4);
    const backwards = diffOf(vendor, vendorVersions, 4, 3);
    expect(backwards).toEqual(forwards);
    expect([forwards.from, forwards.to]).toEqual([3, 4]);
    expect([forwards.fromLabel, forwards.toLabel]).toEqual(["Draft 3", "Draft 4 (current)"]);
  });
});

describe("before sign-off", () => {
  const diff = () => diffOf(vendor, vendorVersions, 3, 4);

  it("is not signed off", () => {
    expect(vendor.status).toBe("revision");
    expect(diff().signedOff).toBe(false);
  });

  it("shows text only for the clause a request to the client is about", () => {
    const { clauses } = diff();
    expect(clauses.map((c) => c.number)).toEqual(["5.3"]);
    expect(clauses[0].before).toContain("ninety (90) days");
  });

  it("only counts every other clause, with no number and no text", () => {
    expect(diff().otherClauses).toEqual({ added: 0, removed: 0, changed: 1, unchanged: 7 });
    // Clause 6.1 changed in this step, and nothing the client is given says so.
    const everything = JSON.stringify(diff());
    expect(everything).not.toContain("6.1");
    expect(everything).not.toContain("Warranty");
    expect(everything).not.toContain("fit for the purpose");
  });

  it("shows a row only for the finding a request is about, in plain words", () => {
    expect(diff().findingRows).toEqual([
      {
        number: "01",
        clauseReference: "Clause 5.3",
        kind: "unresolved",
        change: "Still raised",
        description: null,
        disposition: null,
        advocateAdded: false,
      },
    ]);
  });

  it("counts only findings the client may know about", () => {
    // Two of draft 4's findings were added by the advocate and are hidden. The
    // two the client knows are both still raised: that one was settled in
    // between is a decision, and not counted before sign-off.
    expect(diff().findingCounts).toEqual({ new: 0, stillOpen: 2, resolved: 0 });
  });

  it("never mentions a finding the advocate added and did not address to the client", () => {
    const everything = JSON.stringify(diff());
    for (const hidden of ["find-9", "find-10", "PLACEHOLDER", "renewal on silence", "accepted"]) {
      expect(everything).not.toContain(hidden);
    }
  });

  it("shows an advocate-added finding once a request is addressed to the client about it", () => {
    const request = {
      request: "Please confirm when delivered goods are accepted.",
      requestedAt: "2026-09-17T08:00:00.000Z",
      requestedBy: "Farhan Sheikh",
      response: null,
      respondedAt: null,
    };
    const addressTo = (f: ContractDocument["findings"][number]) =>
      f.findingId === "find-9" ? { ...f, changeRequest: request } : f;
    const addressed: ContractDocument = { ...vendor, findings: vendor.findings.map(addressTo) };
    const versions = vendorVersions.map((v) =>
      v.number === 4 ? { ...v, findings: v.findings.map(addressTo) } : v,
    );

    const d = diffOf(addressed, versions, 3, 4);
    expect(d.findingRows.map((r) => r.clauseReference)).toEqual(["Clause 5.3", "Clause 5.3"]);
    expect(d.findingCounts.new).toBe(1);
    // Still not said to be the advocate's: that is for after sign-off.
    expect(d.findingRows.every((r) => !r.advocateAdded)).toBe(true);
  });

  it("counts what changed between the first two drafts without naming it", () => {
    const d = diffOf(vendor, vendorVersions, 2, 3);
    expect(d.otherClauses).toEqual({ added: 0, removed: 0, changed: 2, unchanged: 6 });
    expect(d.findingCounts).toEqual({ new: 1, stillOpen: 1, resolved: 1 });
    expect(JSON.stringify(d)).not.toContain("Mumbai");
  });

  it("reads the drafts from the snapshots and not from the live document", () => {
    const moved: ContractDocument = {
      ...vendor,
      clauses: vendor.clauses.map((c) => ({ ...c, body: "HEAD ONLY WORDING" })),
    };
    expect(JSON.stringify(diffOf(moved, vendorVersions, 3, 4))).not.toContain("HEAD ONLY WORDING");
  });
});

describe("after sign-off", () => {
  const diff = () => diffOf(nda, ndaVersions, 1, 2);

  it("is signed off", () => {
    expect(nda.status).toBe("settled");
    expect(diff().signedOff).toBe(true);
  });

  it("shows every clause in full, and counts none", () => {
    const { clauses, otherClauses } = diff();
    expect(clauses).toHaveLength(10);
    expect(otherClauses).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 0 });
    const term = clauses.find((c) => c.number === "4.1")!;
    expect(term.kind).toBe("changed");
    expect(term.before).toContain("thirty six (36) months");
    expect(term.after).toContain("twenty four (24) months");
  });

  it("shows every finding with the advocate's disposition", () => {
    expect(diff().findingRows).toEqual([
      expect.objectContaining({
        number: "01",
        kind: "resolved",
        change: "Settled by the advocate",
        disposition: "confirmed",
        advocateAdded: false,
      }),
      expect.objectContaining({
        number: "02",
        kind: "new",
        change: "New in this draft",
        disposition: "overridden",
        advocateAdded: true,
      }),
    ]);
    expect(diff().findingRows[0].description).toContain("24 months");
  });

  it("narrows to what the client was addressed on when the switch is off", () => {
    const d = diffOf(nda, ndaVersions, 1, 2, { advocateAddedAfterSignOff: false });
    expect(d.findingRows.map((r) => r.number)).toEqual(["01"]);
    expect(d.findingCounts).toEqual({ new: 0, stillOpen: 0, resolved: 1 });
    expect(JSON.stringify(d)).not.toContain("retained copy");
  });

  it("shows the whole record once a document is signed off", () => {
    const settled: ContractDocument = { ...vendor, status: "settled" };
    const d = diffOf(settled, vendorVersions, 2, 3);
    expect(d.clauses).toHaveLength(9);
    expect(d.findingRows.map((r) => r.change)).toEqual([
      "Still open",
      "New in this draft",
      "No longer raised after your change to this clause",
    ]);
  });
});

describe("numbering findings across two drafts", () => {
  const rereview = mockDocuments.find((d) => d.id === "doc-employment-rereview")!;
  const versions = mockVersions.filter((v) => v.documentId === rereview.id);

  it("never gives two different findings the same number", () => {
    // Finding 2 is in draft 2 only and finding 3 is in both. Numbered draft by
    // draft, both came out as "02".
    const rows = diffOf(rereview, versions, 2, 3).findingRows;
    expect(rows.map((r) => r.clauseReference)).toEqual(["Clause 3.1", "Clause 4.1"]);
    const numbers = rows.map((r) => r.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("numbers what is in the later draft as the client's own list does, and the rest after it", () => {
    const rows = diffOf(rereview, versions, 2, 3).findingRows;
    // The one still open keeps the number it has on the document page.
    expect(rows[0]).toEqual(expect.objectContaining({ number: "02", change: "Still raised" }));
    // The one no longer raised comes after every number in the later draft.
    expect(rows[1]).toEqual(
      expect.objectContaining({
        number: "05",
        change: "No longer raised after your change to this clause",
      }),
    );
  });
});

// A send-back snapshot stores the advocate's decisions so far, and so does the
// head. Before sign-off the client reads none of them: no disposition, no note,
// no time a decision was made. Every pair of drafts is built, because the
// client can pick any two.
describe("a client's view of snapshots that hold decisions", () => {
  const rereview = mockDocuments.find((d) => d.id === "doc-employment-rereview")!;
  const rereviewVersions = mockVersions.filter((v) => v.documentId === rereview.id);

  const cases: [string, ContractDocument, typeof vendorVersions][] = [
    ["the vendor agreement", vendor, vendorVersions],
    ["the employment agreement", rereview, rereviewVersions],
  ];

  function everyView(doc: ContractDocument, versions: typeof vendorVersions) {
    const views: unknown[] = [clientVersionList(doc, versions)];
    for (const a of versions) {
      for (const b of versions) {
        if (a.number >= b.number) continue;
        views.push(diffOf(doc, versions, a.number, b.number));
      }
    }
    return views;
  }

  it.each(cases)("shows %s's client no disposition before sign-off", (_name, doc, versions) => {
    // The decisions are there to be leaked: some snapshot holds a decided finding.
    const decided = versions.flatMap((v) => v.findings).filter((f) => f.disposition !== "pending");
    expect(decided.length).toBeGreaterThan(0);

    const text = JSON.stringify(everyView(doc, versions));
    expect(text).not.toMatch(/"disposition":"(confirmed|overridden)"/);
    expect(text).not.toMatch(/overrideNote|resolvedAt/);
    for (const f of decided) {
      if (f.overrideNote) expect(text).not.toContain(f.overrideNote);
    }
    for (const view of everyView(doc, versions)) {
      for (const row of (view as { findingRows?: { disposition: unknown }[] }).findingRows ?? []) {
        expect(row.disposition).toBeNull();
      }
    }
  });

  it("holds for the send-back snapshot itself, which the advocate wrote", () => {
    const sendBack = rereviewVersions.find((v) => v.createdBy === "advocate_revision")!;
    expect(sendBack.findings.some((f) => f.disposition !== "pending")).toBe(true);
    const text = JSON.stringify(
      everyView(rereview, rereviewVersions.filter((v) => v.number <= sendBack.number + 1)),
    );
    expect(text).not.toMatch(/Confirmed|Overridden|confirmed|overridden/);
  });

  it("reads the same line, counts and rows before sign-off whatever the advocate decided", () => {
    // Every decision is turned over in every snapshot and in the head: what was
    // decided becomes undecided and the other way about. A client told "settled"
    // or "still open" would learn from the line that a decision was made.
    const turn = <T extends { disposition: string; overrideNote: string | null; resolvedAt: string | null }>(
      f: T,
    ): T =>
      f.disposition === "pending"
        ? { ...f, disposition: "confirmed", overrideNote: "Decided.", resolvedAt: "2026-10-01T09:00:00.000Z" }
        : { ...f, disposition: "pending", overrideNote: null, resolvedAt: null };

    for (const [name, doc, versions] of cases) {
      const turned = versions.map((v) => ({ ...v, findings: v.findings.map(turn) }));
      const turnedDoc = { ...doc, findings: doc.findings.map(turn) } as ContractDocument;
      for (const a of versions) {
        for (const b of versions) {
          if (a.number >= b.number) continue;
          const was = diffOf(doc, versions, a.number, b.number);
          const now = diffOf(turnedDoc, turned, a.number, b.number);
          expect(findingsSummary(now), `${name} ${a.number} to ${b.number}`).toBe(findingsSummary(was));
          expect(now.findingCounts).toEqual(was.findingCounts);
          expect(now.findingRows).toEqual(was.findingRows);
          expect(findingsSummary(was)).not.toMatch(/settled|open|decided|confirmed|overridden/i);
        }
      }
    }
  });

  it("is the same words before sign-off whatever the advocate decided", () => {
    // Dispositions change nothing a client reads before sign-off: flipping every
    // decision in every snapshot leaves the client's view unchanged.
    const flipped = vendorVersions.map((v) => ({
      ...v,
      findings: v.findings.map((f) =>
        f.disposition === "pending"
          ? f
          : { ...f, disposition: f.disposition === "confirmed" ? ("overridden" as const) : ("confirmed" as const), overrideNote: "Different." },
      ),
    }));
    expect(JSON.stringify(everyView(vendor, flipped))).toBe(
      JSON.stringify(everyView(vendor, vendorVersions)),
    );
  });
});

describe("numbering across every pair of drafts", () => {
  const rereview = mockDocuments.find((d) => d.id === "doc-employment-rereview")!;
  const docs: [string, ContractDocument, typeof vendorVersions][] = [
    ["the vendor agreement", vendor, vendorVersions],
    ["the employment agreement", rereview, mockVersions.filter((v) => v.documentId === rereview.id)],
    ["the signed-off NDA", nda, ndaVersions],
  ];

  it.each(docs)("never gives two findings of %s the same number", (_name, doc, versions) => {
    for (const a of versions) {
      for (const b of versions) {
        if (a.number >= b.number) continue;
        const numbers = diffOf(doc, versions, a.number, b.number).findingRows.map((r) => r.number);
        expect(new Set(numbers).size, `${a.number} to ${b.number}`).toBe(numbers.length);
      }
    }
  });
});

describe("the words a client reads", () => {
  it("says why a finding is no longer raised without an internal term", () => {
    expect(plainChange("resolved", "clause_changed", "client_response")).toBe(
      "No longer raised after your change to this clause",
    );
    expect(plainChange("resolved", "clause_changed", "advocate_revision")).toBe(
      "No longer raised after the advocate's revision to this clause",
    );
    expect(plainChange("resolved", "settled", "advocate_revision")).toBe("Settled by the advocate");
    expect(plainChange("unresolved", null, "client_response")).toBe("Still open");
  });

  it("says before sign-off only what is raised, never that anything was settled or open", () => {
    expect(plainChange("unresolved", null, "client_response", false)).toBe("Still raised");
    expect(plainChange("resolved", "settled", "advocate_revision", false)).toBe(
      "No longer raised in this draft",
    );
    expect(plainChange("resolved", "clause_changed", "client_response", false)).toBe(
      "No longer raised after your change to this clause",
    );
  });

  it("says what was counted: before sign-off a line without a decision in it, after it the full wording", () => {
    const pre = diffOf(vendor, vendorVersions, 2, 3);
    expect(findingsSummary(pre)).toBe(
      "Findings: 1 new · 1 still raised · 1 no longer raised after a clause changed",
    );
    const post = diffOf(nda, ndaVersions, 1, 2);
    expect(findingsSummary(post)).toBe(
      "Findings: 1 new · 0 still open · 1 settled or no longer raised",
    );
    expect(plainChange("unresolved", null, "client_response")).toBe("Still open");
    expect(plainChange("new", null, "first_pass")).toBe("New in this draft");
  });

  it("puts no internal term in anything a row says", () => {
    const rows = [
      ...diffOf(vendor, vendorVersions, 2, 3).findingRows,
      ...diffOf({ ...vendor, status: "settled" }, vendorVersions, 2, 3).findingRows,
      ...diffOf(nda, ndaVersions, 1, 2).findingRows,
    ];
    for (const row of rows) {
      const said = [row.change, row.description ?? ""].join(" ");
      for (const internal of ["clause_changed", "resolvedReason", "MANUAL-ADVOCATE-ADDED"]) {
        expect(said).not.toContain(internal);
      }
    }
  });

  it("names a disposition in plain words", () => {
    expect(dispositionText("confirmed")).toBe("Confirmed by the advocate");
    expect(dispositionText("overridden")).toBe("Overridden by the advocate");
    expect(dispositionText("pending")).toBe("Not yet decided");
  });
});
