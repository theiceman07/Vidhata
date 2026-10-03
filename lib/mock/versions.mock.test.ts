import { describe, expect, it } from "vitest";
import { diffVersions } from "@/lib/diff";
import { signOffBlockers } from "@/lib/findings";
import type { Citation } from "@/lib/types";
import { CORPUS } from "./corpus.mock";
import { mockDocuments } from "./documents.mock";
import { mockVersions } from "./versions.mock";

const [draft1, draft2, draft3] = mockVersions;
const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;

const changed = (diff: ReturnType<typeof diffVersions>) =>
  diff.clauses.filter((c) => c.kind !== "unchanged").map((c) => `${c.number} ${c.kind}`);

const findingsOf = (diff: ReturnType<typeof diffVersions>) =>
  diff.findings.map((f) => `${f.findingId} ${f.kind}${f.resolvedReason ? ` (${f.resolvedReason})` : ""}`);

describe("the vendor agreement's history", () => {
  it("draft 1 to 2: a clause change resolves one finding, one carries over, one is new", () => {
    const diff = diffVersions(draft1, draft2);
    expect(changed(diff)).toEqual(["3.2 changed", "8.1 changed"]);
    expect(findingsOf(diff)).toEqual([
      "find-4 unresolved",
      "find-8 new",
      "find-7 resolved (clause_changed)",
    ]);
  });

  it("draft 2 to 3: the advocate settles one, adds two, and revises one clause", () => {
    const diff = diffVersions(draft2, draft3);
    expect(changed(diff)).toEqual(["6.1 changed"]);
    expect(findingsOf(diff)).toEqual([
      "find-4 unresolved",
      "find-8 resolved (settled)",
      "find-9 new",
      "find-10 new",
    ]);
  });

  it("re-checks the citation on the second run rather than copying the first", () => {
    const state = (version: typeof draft1) =>
      version.findings.find((f) => f.findingId === "find-4")!.citations[0].status;
    expect(state(draft1)).toBe("blocked");
    expect(state(draft2)).toBe("verified");
    expect(draft2.pipelineRunAt > draft1.pipelineRunAt).toBe(true);
  });

  it("numbers the drafts in order, and the head is the latest draft", () => {
    const history = mockVersions.filter((v) => v.documentId === "doc-vendor-revision");
    expect(history.map((v) => v.number)).toEqual([1, 2, 3]);
    expect(history.map((v) => v.createdBy)).toEqual([
      "first_pass",
      "client_response",
      "advocate_revision",
    ]);
    expect(vendor.version).toBe(draft3.number);
    expect(vendor.revisionCount).toBe(2);
  });
});

describe("the settled NDA's history", () => {
  const nda = mockDocuments.find((d) => d.id === "doc-nda-settled")!;
  const [first, second] = mockVersions.filter((v) => v.documentId === "doc-nda-settled");

  it("has two drafts, and the head is the second", () => {
    expect([first.number, second.number]).toEqual([1, 2]);
    expect([first.createdBy, second.createdBy]).toEqual(["first_pass", "advocate_revision"]);
    expect(nda.version).toBe(second.number);
    expect(nda.status).toBe("settled");
  });

  it("shows a changed clause, a settled finding and an advocate-added one", () => {
    const diff = diffVersions(first, second);
    expect(changed(diff)).toEqual(["4.1 changed"]);
    expect(findingsOf(diff)).toEqual(["find-n1 resolved (settled)", "find-n2 new"]);
  });

  it("has nothing standing between it and sign-off, with or without a citation", () => {
    // Sign-off blocks on a finding with no decision, and on a blocked source
    // that has not been withdrawn. A finding with no source at all is
    // allowed, and settles on the advocate's note.
    expect(signOffBlockers(nda, "adv-1")).toEqual([]);
    expect(
      nda.findings.some((f) => f.citations.some((c) => c.status === "blocked" && !c.withdrawn)),
    ).toBe(false);
    const unsourced = nda.findings.filter((f) => f.citations.length === 0);
    expect(unsourced.length).toBeGreaterThan(0);
    for (const f of unsourced) expect(f.overrideNote).toBeTruthy();
  });

  it("gives every finding in the settled head a disposition", () => {
    expect(nda.findings.map((f) => f.disposition)).toEqual(["confirmed", "overridden"]);
    expect(nda.findings.map((f) => f.source)).toEqual(["pipeline", "advocate"]);
  });
});

describe("citations in the fixtures", () => {
  const citations: Citation[] = [
    ...mockDocuments.flatMap((d) => d.findings.flatMap((f) => f.citations)),
    ...mockVersions.flatMap((v) => v.findings.flatMap((f) => f.citations)),
  ];

  it("verifies only what the corpus holds, under the name it holds it by", () => {
    const verified = citations.filter((c) => c.status === "verified");
    expect(verified.length).toBeGreaterThan(0);
    for (const c of verified) {
      const entry = CORPUS.find((e) => e.ref === c.corpusRef);
      expect(entry, `${c.text} has no corpus entry`).toBeDefined();
      expect(c.text).toBe(entry!.label);
    }
  });

  it("gives a blocked citation no corpus reference", () => {
    for (const c of citations.filter((c) => c.status === "blocked")) {
      expect(c.corpusRef).toBeNull();
    }
  });

  it("keeps the advocate's blocked citation plainly fake", () => {
    const added = vendor.findings.filter((f) => f.source === "advocate");
    expect(added.map((f) => f.findingId)).toEqual(["find-9", "find-10"]);
    const blocked = added.flatMap((f) => f.citations).find((c) => c.status === "blocked");
    expect(blocked?.text).toMatch(/^PLACEHOLDER/);
    expect(CORPUS.some((e) => e.label === blocked?.text)).toBe(false);
  });
});
