import { describe, expect, it } from "vitest";
import { mockDocuments } from "./mock/documents.mock";
import { mockVersions } from "./mock/versions.mock";
import { PIPELINE_LAYERS } from "./types";

describe("the pipeline layers", () => {
  it("are the seven the requirements name, in order", () => {
    expect(Object.values(PIPELINE_LAYERS).map((l) => l.name)).toEqual([
      "Intake and normalisation",
      "Completeness",
      "Statutory compliance",
      "Cross-clause consistency",
      "Risk asymmetry",
      "Citation gate",
      "Risk triage",
    ]);
  });

  it("gives every layer a description", () => {
    for (const layer of Object.values(PIPELINE_LAYERS)) {
      expect(layer.description.length).toBeGreaterThan(10);
    }
  });

  it("does not claim a stamping or registration check", () => {
    // The pipeline has no stamp-duty table or registration rule. Layer 2 says
    // so: both are confirmed by the advocate, never checked.
    const text = PIPELINE_LAYERS[2].description;
    expect(text).toContain("Stamp duty and registration are confirmed by your advocate");
    expect(text.replace("Stamp duty and registration", "")).not.toMatch(/stamp|registration/i);
  });

  it("files every MSMED finding under statutory compliance", () => {
    const findings = [
      ...mockDocuments.flatMap((d) => d.findings),
      ...mockVersions.flatMap((v) => v.findings),
    ].filter((f) => f.ruleApplied.startsWith("MSMED"));
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.layer).toBe(2);
  });
});
