import { describe, expect, it } from "vitest";
import { LAYER_NAMES, layerFromName, layerName } from "./layerNames";
import { PIPELINE_LAYERS } from "./types";

describe("the backend layer names", () => {
  it("are in the same order as PIPELINE_LAYERS, one per layer", () => {
    expect(LAYER_NAMES.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(LAYER_NAMES.map((l) => l.index)).toEqual(Object.keys(PIPELINE_LAYERS).map(Number));
  });

  it("carry the same labels as PIPELINE_LAYERS", () => {
    for (const l of LAYER_NAMES) expect(l.label).toBe(PIPELINE_LAYERS[l.index].name);
  });

  it("match the names the backend sends (R1 Layer enum)", () => {
    expect(LAYER_NAMES.map((l) => l.name)).toEqual([
      "INTAKE",
      "COMPLETENESS",
      "STATUTORY",
      "CONSISTENCY",
      "RISK_ASYMMETRY",
      "CITATION_GATE",
      "TRIAGE",
    ]);
  });

  it("turns a name into its index and back", () => {
    for (const l of LAYER_NAMES) {
      expect(layerFromName(l.name)).toBe(l.index);
      expect(layerName(l.index)).toBe(l.name);
    }
  });

  it("reads a name without regard to case, and refuses one it does not know", () => {
    expect(layerFromName("statutory")).toBe(2);
    expect(layerFromName("NOT_A_LAYER")).toBeNull();
    expect(layerFromName("")).toBeNull();
  });
});
