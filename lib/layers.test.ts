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

  it("files every MSMED finding under statutory compliance", () => {
    const findings = [
      ...mockDocuments.flatMap((d) => d.findings),
      ...mockVersions.flatMap((v) => v.findings),
    ].filter((f) => f.ruleApplied.startsWith("MSMED"));
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) expect(f.layer).toBe(2);
  });
});
