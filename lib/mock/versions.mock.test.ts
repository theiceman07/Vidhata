import { describe, expect, it } from "vitest";
import { diffVersions } from "@/lib/diff";
import { signOffBlockers } from "@/lib/findings";
import { CORPUS } from "./corpus.mock";
import { NO_STATUTORY_SOURCE, mockDocuments } from "./documents.mock";
import { mockVersions } from "./versions.mock";

const [draft1, draft2, draft3, draft4] = mockVersions;
const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;

const changed = (diff: ReturnType<typeof diffVersions>) =>
  diff.clauses.filter((c) => c.kind !== "unchanged").map((c) => `${c.number} ${c.kind}`);

const findingsOf = (diff: ReturnType<typeof diffVersions>) =>
  diff.findings.map((f) => `${f.findingId} ${f.kind}${f.resolvedReason ? ` (${f.resolvedReason})` : ""}`);

describe("the vendor agreement's history", () => {
  it("draft 1 to 2: the advocate sends it back with the wording unchanged and a request out", () => {
    const diff = diffVersions(draft1, draft2);
    expect(changed(diff)).toEqual([]);
    expect(findingsOf(diff)).toEqual(["find-7 unresolved", "find-4 unresolved"]);
    expect(draft2.findings.find((f) => f.findingId === "find-4")!.changeRequest?.response).toBeNull();
  });

  it("draft 2 to 3: a clause change resolves one finding, one carries over, one is new", () => {
    const diff = diffVersions(draft2, draft3);
    expect(changed(diff)).toEqual(["3.2 changed", "8.1 changed"]);
    expect(findingsOf(diff)).toEqual([
      "find-4 unresolved",
      "find-8 new",
      "find-7 resolved (clause_changed)",
    ]);
    // The client's answer to the first request is on the finding now.
    expect(draft3.findings.find((f) => f.findingId === "find-4")!.changeRequest?.response).toBeTruthy();
  });

  it("draft 3 to 4: the advocate settles one, adds two, and revises one clause", () => {
    const diff = diffVersions(draft3, draft4);
    expect(changed(diff)).toEqual(["6.1 changed"]);
    expect(findingsOf(diff)).toEqual([
      "find-4 unresolved",
      "find-8 resolved (settled)",
      "find-9 new",
      "find-10 new",
    ]);
  });

  it("stamps each draft with its own pipeline run", () => {
    expect(draft2.pipelineRunAt > draft1.pipelineRunAt).toBe(true);
    expect(draft3.pipelineRunAt > draft2.pipelineRunAt).toBe(true);
  });

  it("numbers the drafts in order, and the head is the latest draft", () => {
    const history = mockVersions.filter((v) => v.documentId === "doc-vendor-revision");
    expect(history.map((v) => v.number)).toEqual([1, 2, 3, 4]);
    expect(history.map((v) => v.createdBy)).toEqual([
      "first_pass",
      "advocate_revision",
      "client_response",
      "advocate_revision",
    ]);
    expect(vendor.version).toBe(draft4.number);
    expect(vendor.revisionCount).toBe(2);
  });
});

describe("rounds and drafts", () => {
  // Every round is two hand-offs: the advocate sends it back and the client
  // answers. A round still open has only the first. So a document that has
  // been sent back N times has 1 + 2N drafts, less one while a round is open.
  // The label "Round N" reads revisionCount, so the two must not disagree.
  it("agree in every fixture that has been sent back", () => {
    const sentBack = mockDocuments.filter((d) => d.revisionCount > 0);
    expect(sentBack.map((d) => d.id).sort()).toEqual(
      ["doc-employment-rereview", "doc-vendor-revision"].sort(),
    );
    for (const doc of sentBack) {
      const drafts = mockVersions.filter((v) => v.documentId === doc.id);
      const open = doc.status === "revision" ? 1 : 0;
      expect(drafts.length, doc.id).toBe(1 + 2 * doc.revisionCount - open);
      expect(drafts[drafts.length - 1].number, doc.id).toBe(doc.version);
    }
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

  it("has nothing standing between it and sign-off", () => {
    expect(signOffBlockers(nda, "adv-1")).toEqual([]);
  });

  it("gives every finding in the settled head a disposition", () => {
    expect(nda.findings.map((f) => f.disposition)).toEqual(["confirmed", "overridden"]);
    expect(nda.findings.map((f) => f.source)).toEqual(["pipeline", "advocate"]);
  });
});

describe("citations in the fixtures", () => {
  const findings = [
    ...mockDocuments.flatMap((d) => d.findings),
    ...mockVersions.flatMap((v) => v.findings),
  ];

  it("gives every finding one non-empty citation string, as R1 requires", () => {
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(typeof f.citation, f.findingId).toBe("string");
      expect(f.citation.trim(), f.findingId).not.toBe("");
    }
  });

  it("cites only a statute the corpus names, or says there is none, and never invents an authority", () => {
    const labels = new Set([...CORPUS.map((e) => e.label), NO_STATUTORY_SOURCE]);
    for (const f of findings) expect(labels.has(f.citation), `${f.findingId}: ${f.citation}`).toBe(true);
  });

  it("carries no verified or blocked state: the backend has no such field", () => {
    for (const f of findings) {
      expect(f).not.toHaveProperty("citations");
      expect(typeof f.citation).toBe("string");
    }
  });
});
