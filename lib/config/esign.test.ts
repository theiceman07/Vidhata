import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONTRACT_TYPES } from "@/lib/mock/intake-options.mock";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import {
  ESIGN_EXCLUSIONS,
  ESIGN_LEGAL_NOTE,
  canSignElectronically,
  esignatureStep,
} from "./esign";

describe("which documents can be signed electronically", () => {
  it("lists the Problem Statement's four classes, as they are given", () => {
    expect([...ESIGN_EXCLUSIONS]).toEqual([
      "Wills",
      "Trusts",
      "Negotiable instruments",
      "Powers of attorney (non-regulated)",
    ]);
  });

  it("says the list needs legal confirmation, and why", () => {
    expect(ESIGN_LEGAL_NOTE).toMatch(/needs legal confirmation/);
    expect(ESIGN_LEGAL_NOTE).toMatch(/schedule to the IT Act can be amended/);
  });

  it("allows every type Vidhata drafts, because none is one of those classes", () => {
    expect(CONTRACT_TYPES.length).toBeGreaterThan(0);
    for (const type of CONTRACT_TYPES) {
      expect(canSignElectronically(type.value), type.value).toBe(true);
    }
  });

  it("refuses a type that is added to the excluded list, and then asks for nothing", () => {
    expect(canSignElectronically("nda", ["nda"])).toBe(false);
    const step = esignatureStep("nda", ["nda"]);
    expect(step.applicable).toBe(false);
    expect(step.instructions).toEqual([]);
    expect(step.headline).toMatch(/not available/);
    expect(step.reason).toMatch(/needs legal confirmation/);
  });
});

describe("the e-signature step", () => {
  it("states that the type can be signed, and that this is pending legal confirmation", () => {
    const step = esignatureStep("vendor");
    expect(step).toMatchObject({ kind: "esignature", applicable: true, complete: false });
    expect(step.headline).toBe("e-signature: can be signed electronically");
    expect(step.detail).toMatch(/Legal confirmation of this is pending/);
    expect(step.reason).toMatch(/needs legal confirmation/);
  });

  it("is not done, has no one who did it, and no proof", () => {
    const step = esignatureStep("msa");
    expect([step.completedAt, step.completedBy, step.evidence]).toEqual([null, null, null]);
  });

  it("is the same for a fixture as for a generated document", () => {
    const fixture = getMockDocumentById("doc-nda-settled")!.executionSteps.find(
      (s) => s.kind === "esignature",
    );
    expect(fixture).toEqual(esignatureStep("nda"));
  });

  it("names no provider, no portal and no statute section, and claims no validity", () => {
    const text = JSON.stringify(esignatureStep("nda"));
    expect(text).not.toMatch(/portal|Aadhaar|DocuSign|Digio|eMudhra|Leegality|SignDesk|NSDL/i);
    expect(text).not.toMatch(/\bsection\b|\bs\.\s?\d/i);
    expect(text).not.toMatch(/valid under/i);
    expect(text).not.toMatch(/—/);
  });
});

describe("the e-sign preview", () => {
  const root = path.resolve(__dirname, "..", "..");
  const source = readFileSync(
    path.join(root, "components", "domain", "esign-guide.tsx"),
    "utf8",
  );
  // Code only: the file's own comments explain what it does not do.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("says that no signature is taken and no signing service is connected", () => {
    expect(source).toContain("No signature is taken here, and no signing service is connected.");
    expect(source).toContain("Sign electronically (preview)");
  });

  it("takes nothing: no input, no network call, no provider", () => {
    expect(code).not.toMatch(/<input|<Input|<textarea|fetch\(|onSubmit|FormData/);
    expect(code).not.toMatch(/Aadhaar|DocuSign|Digio|eMudhra|Leegality|SignDesk|NSDL/i);
  });
});
