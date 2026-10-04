import { describe, expect, it } from "vitest";
import { mockDocuments } from "@/lib/mock/documents.mock";
import type { ContractDocument, Finding } from "@/lib/types";
import { leaked, markersFor } from "./markers";
import { shapeClientFindings } from "./shape-findings";

const doc = (id: string) => mockDocuments.find((d) => d.id === id)!;
const vendor = doc("doc-vendor-revision");
const nda = doc("doc-nda-settled");

const withFindings = (d: ContractDocument, change: (f: Finding) => Finding): ContractDocument => ({
  ...d,
  findings: d.findings.map(change),
});

describe("the findings a client is handed, before sign-off", () => {
  it("are the ones the first pass raised, under the numbers the client was given, with a passage only where a request is addressed to them", () => {
    const shaped = shapeClientFindings(vendor);
    // find-4 (the request is about it) and find-8. Nothing the advocate added.
    expect(shaped.map((f) => f.number)).toEqual(["02", "03"]);
    const [asked, other] = shaped;
    expect(asked.request?.request).toMatch(/MSME/);
    expect(asked.clauseText).toEqual(expect.any(String));
    expect(other.request).toBeNull();
    // The client knows it was raised, and where. Not what the draft says there.
    expect(other.clauseReference).toBe("Clause 3.2");
    expect(other.clauseText).toBeNull();
    expect(shaped.map((f) => f.detail)).toEqual([null, null]);
  });

  it("name every field they carry, and carry no other", () => {
    for (const f of shapeClientFindings(vendor)) {
      expect(Object.keys(f).sort()).toEqual(["clauseReference", "clauseText", "detail", "number", "request"]);
      if (f.request) {
        expect(Object.keys(f.request).sort()).toEqual(["request", "requestedAt", "respondedAt", "response"]);
      }
    }
  });

  it("read the same whatever the advocate has decided, so nothing says that anything was settled", () => {
    const undecided = withFindings(vendor, (f) => ({
      ...f,
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
    }));
    const decided = withFindings(vendor, (f) => ({
      ...f,
      disposition: "overridden",
      overrideNote: "The advocate's own reasoning, which is not the client's to read.",
      resolvedAt: "2026-09-17T08:00:00.000Z",
    }));
    expect(shapeClientFindings(decided)).toEqual(shapeClientFindings(undecided));
  });

  it("show an advocate-added finding only once a request is addressed to the client, and then without saying who added it", () => {
    const addressed = withFindings(vendor, (f) =>
      f.findingId === "find-9"
        ? {
            ...f,
            clientNumber: "04",
            changeRequest: {
              request: "Please confirm when delivered goods are accepted.",
              requestedAt: "2026-09-17T08:00:00.000Z",
              requestedBy: "Farhan Sheikh",
              response: null,
              respondedAt: null,
            },
          }
        : f,
    );
    const shaped = shapeClientFindings(addressed);
    expect(shaped.map((f) => f.number)).toEqual(["02", "03", "04"]);
    expect(JSON.stringify(shaped)).not.toMatch(/advocateAdded|Farhan|Sheikh/);
  });
});

describe("the findings a client is handed, after sign-off", () => {
  it("are all of them, read-only, with the advocate's decision in plain terms and every source", () => {
    const shaped = shapeClientFindings(nda);
    expect(shaped.map((f) => f.number)).toEqual(["01", "02"]);
    for (const f of shaped) {
      expect(f.clauseText).toEqual(expect.any(String));
      expect(Object.keys(f.detail!).sort()).toEqual(
        expect.arrayContaining(["citations", "description", "disposition", "remedySuggested", "severity"]),
      );
      expect(f.detail!.disposition).not.toBe("pending");
    }
  });

  it("mark what the advocate added while the switch is on, and say nothing of it when it is off", () => {
    const on = shapeClientFindings(nda, { advocateAddedAfterSignOff: true });
    expect(on.map((f) => f.detail?.advocateAdded)).toEqual([undefined, true]);

    // Off: an advocate-added finding no request is addressed to is not handed over at all.
    const off = shapeClientFindings(nda, { advocateAddedAfterSignOff: false });
    expect(off.map((f) => f.number)).toEqual(["01"]);
    expect(off[0].detail).not.toHaveProperty("advocateAdded");

    // Off, and one the advocate added is asked of the client: it is handed over, and not marked.
    const asked = withFindings(nda, (f) =>
      f.source === "advocate"
        ? {
            ...f,
            changeRequest: {
              request: "Please confirm.",
              requestedAt: "2026-08-03T08:00:00.000Z",
              requestedBy: "Ananya Rao",
              response: null,
              respondedAt: null,
            },
          }
        : f,
    );
    const shown = shapeClientFindings(asked, { advocateAddedAfterSignOff: false });
    expect(shown.map((f) => f.number)).toEqual(["01", "02"]);
    expect(shown.map((f) => f.detail)).not.toContainEqual(expect.objectContaining({ advocateAdded: true }));
  });

  it("say that a source was withdrawn, and not what the advocate wrote about it", () => {
    const withdrawn = withFindings(nda, (f) => ({
      ...f,
      citations: [
        ...f.citations,
        {
          id: "c-withdrawn",
          text: "A source the corpus did not hold",
          status: "blocked" as const,
          corpusRef: null,
          withdrawn: { note: "Private reasoning about the source.", at: "2026-08-03T08:00:00.000Z", by: "Ananya Rao" },
        },
      ],
    }));
    const citations = shapeClientFindings(withdrawn)[0].detail!.citations;
    expect(citations.at(-1)).toEqual({
      id: "c-withdrawn",
      text: "A source the corpus did not hold",
      status: "blocked",
      corpusRef: null,
      withdrawn: true,
    });
    expect(JSON.stringify(shapeClientFindings(withdrawn))).not.toMatch(/Private reasoning|Ananya/);
  });
});

describe("numbering what the client is handed", () => {
  it("lists them in their numbers' order, whatever order the record holds them in", () => {
    const reversed = { ...nda, findings: [...nda.findings].reverse() };
    expect(shapeClientFindings(reversed).map((f) => f.number)).toEqual(["01", "02"]);
  });

  it("numbers a finding the switch has newly shown after the highest the client has, the same every time", () => {
    // Signed off while the switch was off, so the advocate-added finding has no client number.
    const kept = withFindings(nda, (f) => (f.source === "advocate" ? { ...f, clientNumber: null } : f));
    const first = shapeClientFindings(kept, { advocateAddedAfterSignOff: true });
    expect(first.map((f) => f.number)).toEqual(["01", "02"]);
    expect(shapeClientFindings(kept, { advocateAddedAfterSignOff: true })).toEqual(first);
  });
});

describe("what a client is handed of a finding, over every fixture", () => {
  it("holds none of the pipeline's machinery, the advocate's working, or who the advocate is", () => {
    const withFindingsDocs = mockDocuments.filter((d) => d.findings.length > 0);
    expect(withFindingsDocs.length).toBeGreaterThanOrEqual(4);
    for (const d of withFindingsDocs) {
      const markers = markersFor(d);
      // Searching for nothing proves nothing.
      expect(markers.machinery.length, d.id).toBeGreaterThan(0);
      for (const advocateAddedAfterSignOff of [true, false]) {
        const shaped = shapeClientFindings(d, { advocateAddedAfterSignOff });
        const label = `${d.id} (switch ${advocateAddedAfterSignOff})`;
        expect(leaked(shaped, markers.machinery), label).toEqual([]);
        expect(leaked(shaped, markers.advocate), label).toEqual([]);
      }
    }
  });
});
