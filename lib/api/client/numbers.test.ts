import { describe, expect, it } from "vitest";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { mockVersions } from "@/lib/mock/versions.mock";
import type { ContractDocument, DocumentVersion, Finding } from "@/lib/types";
import { shapeClientDocument } from "./shape-document";
import { shapeClientFindings } from "./shape-findings";
import { shapeClientTrail } from "./shape-trail";
import { shapeClientDiff, shapeClientVersionList } from "./shape-versions";

/**
 * A client names a finding by its client number and by nothing else. The
 * document's own number for a finding can differ from it, and when it does it
 * is the one thing that must not reach a client, because it is how a number the
 * client was never given, and so a finding kept from them, would show.
 *
 * The fixtures never have the two differ for a finding a client can see, so
 * this builds a document where they do: the advocate has added a finding no
 * request is addressed to (the document's 08, the client has none), and then
 * one a request is addressed to (the document's 09, the client's 04). A client
 * shaper that handed over `number` would show 09, and nobody was told of 08.
 */

const base = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;
const earlier = mockVersions.filter((v) => v.documentId === base.id);

const request = {
  request: "Please confirm when delivered goods are accepted.",
  requestedAt: "2026-09-17T08:00:00.000Z",
  requestedBy: "Farhan Sheikh",
  response: null,
  respondedAt: null,
};

const findings: Finding[] = base.findings.map((f) => {
  if (f.findingId === "find-9") return { ...f, number: "08", clientNumber: null, changeRequest: null };
  if (f.findingId === "find-10") return { ...f, number: "09", clientNumber: "04", changeRequest: request };
  return f;
});

const doc: ContractDocument = { ...base, version: 5, findings };
const draft5: DocumentVersion = {
  documentId: base.id,
  number: 5,
  createdAt: "2026-09-17T08:05:00.000Z",
  createdBy: "advocate_revision",
  pipelineRunAt: "2026-09-17T08:04:00.000Z",
  clauses: structuredClone(doc.clauses),
  findings: structuredClone(findings),
};
const versions = [...earlier, draft5];

/** What a document's own number would look like in a client's output. */
const OWN_NUMBERS = /"0[89]"|Finding 0[89]\b/;

describe("what the client is handed, when the document's number and the client's differ", () => {
  it("the setup is the case it claims: the visible finding is 09 to the document and 04 to the client", () => {
    const visible = shapeClientFindings(doc).map((f) => f.number);
    expect(visible).toEqual(["02", "03", "04"]);
    expect(findings.find((f) => f.findingId === "find-10")!.number).toBe("09");
  });

  const outputs: Record<string, () => unknown> = {
    findings: () => shapeClientFindings(doc),
    "the document": () => shapeClientDocument(doc),
    trail: () => shapeClientTrail(doc),
    "a comparison, drafts 1 and 5": () => shapeClientDiff(doc, versions, 1, 5),
    "a comparison, drafts 4 and 5": () => shapeClientDiff(doc, versions, 4, 5),
    "the list of drafts": () => shapeClientVersionList(doc, versions),
  };

  for (const [name, output] of Object.entries(outputs)) {
    it(`never carries the document's own number: ${name}`, () => {
      expect(JSON.stringify(output())).not.toMatch(OWN_NUMBERS);
    });
  }

  it("carries the client's number instead, wherever it names the finding", () => {
    expect(JSON.stringify(shapeClientFindings(doc))).toContain('"04"');
    expect(JSON.stringify(shapeClientTrail(doc))).toMatch(/Finding 04 · /);
    const diff = shapeClientDiff(doc, versions, 4, 5);
    expect(diff.ok && diff.diff.findingRows.map((r) => r.number)).toContain("04");
  });

  it("does not let the finding kept from the client leave a gap", () => {
    // 08 was never given to the client, and the client's numbers run 02, 03, 04 with nothing missing after 03.
    const numbers = shapeClientFindings(doc).map((f) => Number(f.number));
    expect(numbers).toEqual([2, 3, 4]);
  });
});
