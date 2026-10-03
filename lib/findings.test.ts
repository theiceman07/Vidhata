import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clientAuditTrail, buildAuditTrail } from "./audit";
import { clientVisibleFindings, firstPassFindings } from "./findings";
import { mockDocuments } from "./mock/documents.mock";
import type { ContractDocument } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;
const ids = (doc: ContractDocument) => clientVisibleFindings(doc).map((f) => f.findingId);

// The vendor head has two pipeline findings (4, 8) and two the advocate
// added (9, 10). Only finding 4 carries a request addressed to the client.

describe("what the client may be told of a document's findings", () => {
  it("hides an advocate-added finding no request has been addressed on", () => {
    expect(ids(vendor)).not.toContain("find-9");
    expect(ids(vendor)).not.toContain("find-10");
  });

  it("keeps the findings the first pass raised", () => {
    expect(ids(vendor)).toEqual(["find-4", "find-8"]);
  });

  it("shows an advocate-added finding once a request is addressed to the client", () => {
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
    expect(ids(addressed)).toContain("find-9");
    expect(ids(addressed)).not.toContain("find-10");
  });

  it("shows everything, read-only, after sign-off", () => {
    expect(ids({ ...vendor, status: "settled" })).toEqual(vendor.findings.map((f) => f.findingId));
  });

  it("counts only what the first pass raised, whoever is asking", () => {
    expect(firstPassFindings(vendor).map((f) => f.findingId)).toEqual(["find-4", "find-8"]);
    expect(vendor.findings).toHaveLength(4);
  });
});

describe("the audit trail", () => {
  const screening = (doc: ContractDocument, trail: typeof clientAuditTrail) =>
    trail(doc).find((e) => e.actor === "AI first pass")?.action;

  it("says the first pass raised two findings to the client and to the advocate", () => {
    expect(screening(vendor, clientAuditTrail)).toBe("Screening completed · 2 findings raised");
    expect(screening(vendor, buildAuditTrail)).toBe("Screening completed · 2 findings raised");
  });

  it("gives the client only entries about findings addressed to them", () => {
    const addressed = new Set(vendor.findings.filter((f) => f.changeRequest).map((f) => f.findingId));
    for (const entry of clientAuditTrail(vendor)) {
      if (entry.findingId) expect(addressed.has(entry.findingId)).toBe(true);
    }
  });
});

// A client screen that reads doc.findings can count or list a finding it
// should not know about. Every one goes through the helpers instead.
describe("client screens", () => {
  const root = path.resolve(__dirname, "..");

  function filesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? filesUnder(full) : [full];
    });
  }

  const clientFiles = [
    ...filesUnder(path.join(root, "app", "(client)")).filter((f) => /\.(ts|tsx)$/.test(f)),
    ...[
      "components/domain/document-context.tsx",
      "components/document/change-requests.tsx",
      "components/document/provenance.tsx",
      "lib/moves.ts",
      "lib/mock/chat.mock.ts",
    ].map((f) => path.join(root, f)),
  ];

  it("lists the files it guards", () => {
    expect(clientFiles.length).toBeGreaterThan(5);
  });

  it("never import what only an advocate may use: the add-finding dialog, the citation check", () => {
    const advocateOnly = /add-finding-dialog|api\/citations/;
    const offenders = clientFiles.filter((file) => advocateOnly.test(readFileSync(file, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });

  it("never read doc.findings directly", () => {
    const offenders = clientFiles.filter((file) => /\.findings\b/.test(readFileSync(file, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
