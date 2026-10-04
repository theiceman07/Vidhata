import { describe, expect, it } from "vitest";
import { invoicesFor } from "./billing";
import { DELETION_RECORDED, DELETION_SCOPE, DELETION_STATUS } from "./config/privacy";
import { mockDocuments } from "./mock/documents.mock";
import { buildDataExport } from "./privacy";
import type { Consultation, ContractDocument, PrivacyState } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!; // not signed off
const nda = mockDocuments.find((d) => d.id === "doc-nda-settled")!; // signed off
const privacy: PrivacyState = { trainingOptIn: false, consentLog: [], deletionRequestedAt: null };

function exportOf(documents: ContractDocument[], consultations: Consultation[] = []) {
  return buildDataExport({
    organisation: { name: "Anaya Textiles Pvt Ltd", gstin: null },
    documents,
    invoices: invoicesFor(documents),
    consultations,
    privacy,
    now: new Date("2026-10-04T00:00:00.000Z"),
  });
}

const only = (file: ReturnType<typeof exportOf>, id: string) =>
  file.documents.find((d) => d.id === id)!;

describe("the export of a document not yet signed off", () => {
  const file = exportOf([vendor]);
  const doc = only(file, vendor.id);
  const text = JSON.stringify(file);

  it("is a preview file, and says so inside it", () => {
    expect(file.preview).toBe(true);
  });

  it("carries only the finding a request is addressed to the client about", () => {
    expect(doc.findings).toHaveLength(1);
    expect(doc.findings[0]).toMatchObject({
      number: "01",
      clauseReference: "Clause 5.3",
      description: null,
      disposition: null,
    });
    expect(doc.findings[0].request?.request).toContain("registered MSME");
  });

  it("carries no advocate-added finding, and none of the advocate's working", () => {
    for (const hidden of ["find-9", "find-10", "PLACEHOLDER", "renewal on silence", "accepted"]) {
      expect(text).not.toContain(hidden);
    }
    const settled = vendor.findings.find((f) => f.findingId === "find-8")!;
    expect(text).not.toContain(settled.overrideNote!);
    expect(text).not.toMatch(/ruleApplied|overrideNote|resolvedAt|"layer"|severity|citations/);
    expect(text).not.toMatch(/MSMED-S15|MANUAL-ADVOCATE-ADDED|LIABILITY-ASYMMETRY/);
  });

  it("carries no clause text but the passage behind the request", () => {
    expect(doc.clauses).toEqual([]);
    expect(doc.signedOff).toBeNull();
    // Clause 6.1, which the advocate revised and nothing asks the client about.
    expect(text).not.toContain("fit for the purpose");
    expect(text).toContain(vendor.findings.find((f) => f.findingId === "find-4")!.clauseText);
  });

  it("shows an advocate-added finding once a request is addressed to the client about it", () => {
    const addressed: ContractDocument = {
      ...vendor,
      findings: vendor.findings.map((f) =>
        f.findingId === "find-9"
          ? {
              ...f,
              changeRequest: {
                request: "Please confirm when delivered goods are accepted.",
                requestedAt: "2026-09-17T08:00:00.000Z",
                requestedBy: "Farhan Sheikh",
                response: null,
                respondedAt: null,
              },
            }
          : f,
      ),
    };
    const shown = only(exportOf([addressed]), vendor.id).findings;
    expect(shown.map((f) => f.clauseReference)).toEqual(["Clause 5.3", "Clause 5.3"]);
    // Still not described: that is for after sign-off.
    expect(shown.every((f) => f.description === null && f.disposition === null)).toBe(true);
  });
});

describe("the export of a signed-off document", () => {
  const file = exportOf([nda]);
  const doc = only(file, nda.id);
  const text = JSON.stringify(file);

  it("carries the settled text, whole, and the sign-off record", () => {
    expect(doc.clauses).toHaveLength(nda.clauses.length);
    expect(doc.clauses.find((c) => c.number === "4.1")!.body).toContain("twenty four (24) months");
    expect(doc.signedOff).toEqual({
      advocate: "Rhea Kapoor",
      enrolment: "D/1842/2016",
      at: nda.settledAt,
    });
  });

  it("carries the findings with the advocate's disposition, in plain terms", () => {
    expect(doc.findings.map((f) => f.disposition)).toEqual(["confirmed", "overridden"]);
    expect(doc.findings[0].description).toContain("24 months");
  });

  it("never carries the advocate's own notes or the pipeline's machinery", () => {
    for (const f of nda.findings) expect(text).not.toContain(f.overrideNote!);
    expect(text).not.toMatch(/ruleApplied|overrideNote|resolvedAt|"layer"|severity|citations/);
    expect(text).not.toMatch(/TERM-VS-DEAL|MANUAL-ADVOCATE-ADDED/);
  });
});

describe("the rest of the export", () => {
  it("has the invoices and no finding count anywhere near them", () => {
    const file = exportOf([vendor, nda]);
    expect(file.invoices.map((i) => i.number).sort()).toEqual(["VID-2026-0001", "VID-2026-0002"]);
    expect(JSON.stringify(file.invoices)).not.toMatch(/finding/i);
  });

  it("includes the client's own consultation questions, deliberately: they are their data", () => {
    const request: Consultation = {
      id: "consultation-1",
      documentId: nda.id,
      orgId: nda.orgId,
      advocateName: "Rhea Kapoor",
      question: "Does clause 6.1 let them keep a copy after the term ends?",
      status: "requested",
      requestedAt: "2026-10-03T09:00:00.000Z",
    };
    const file = exportOf([nda], [request]);
    expect(file.consultationRequests).toEqual([
      {
        document: nda.title,
        advocate: "Rhea Kapoor",
        requestedAt: "2026-10-03T09:00:00.000Z",
        status: "requested",
        question: request.question,
      },
    ]);
  });

  it("has no consultation section content when there are no requests", () => {
    expect(exportOf([nda]).consultationRequests).toEqual([]);
  });

  it("carries the consent log and the training choice as they stand", () => {
    const log = [{ at: "2026-10-01T09:00:00.000Z", granted: true }];
    const file = buildDataExport({
      organisation: { name: "Anaya", gstin: null },
      documents: [],
      invoices: [],
      consultations: [],
      privacy: { trainingOptIn: true, consentLog: log, deletionRequestedAt: null },
      now: new Date(),
    });
    expect(file.trainingOptIn).toBe(true);
    expect(file.consentLog).toEqual(log);
  });
});

describe("what a deletion request says it would remove and keep", () => {
  const all = [...DELETION_SCOPE.removed, ...DELETION_SCOPE.kept, ...DELETION_SCOPE.undecided];

  it("is marked pending counsel confirmation", () => {
    expect(DELETION_STATUS).toBe("Pending counsel confirmation");
  });

  it("keeps the sign-off record, the audit trail, invoices and payments, and the consent log", () => {
    const kept = DELETION_SCOPE.kept.join(" ").toLowerCase();
    for (const word of ["sign-off record", "audit trail", "invoices", "payment records", "consent log"]) {
      expect(kept, word).toContain(word);
    }
  });

  it("names no retention period, because none has been supplied", () => {
    for (const line of all) {
      expect(line).not.toMatch(/\b\d+\s*(day|week|month|year)s?\b/i);
      expect(line).not.toMatch(/\bfor (a|one|two|three|five|seven|ten) (day|week|month|year)/i);
    }
  });

  it("does not decide what is not decided", () => {
    expect(DELETION_SCOPE.undecided.join(" ")).toMatch(/settled document/i);
  });

  it("says plainly that nothing has been deleted in this preview", () => {
    expect(DELETION_RECORDED).toBe("Request recorded. Nothing has been deleted in this preview.");
  });
});
