import { describe, expect, it } from "vitest";
import { COVERAGE, layersRun } from "./coverage";
import { CORPUS } from "./mock/corpus.mock";
import { mockDocuments } from "./mock/documents.mock";
import type { ContractDocument } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;
const at = (status: ContractDocument["status"]) => ({ ...vendor, status });

describe("what ran on a document", () => {
  it("is nothing until the first pass has finished", () => {
    expect(layersRun(at("draft"))).toEqual([]);
    expect(layersRun(at("analysing"))).toEqual([]);
  });

  it("is every layer, in order, once it has", () => {
    for (const status of ["pending_review", "under_review", "revision", "settled"] as const) {
      expect(layersRun(at(status))).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });
});

describe("the fixed coverage text", () => {
  it("names the statutes the way the corpus does", () => {
    const labels = new Set(CORPUS.map((e) => e.label));
    expect(COVERAGE.statutory.filter((s) => s.includes("Act, "))).toHaveLength(2);
    for (const item of COVERAGE.statutory.filter((s) => s.includes("Act, "))) {
      expect(labels.has(item)).toBe(true);
    }
  });

  it("lists the six exclusions", () => {
    expect(COVERAGE.outOfScope).toHaveLength(6);
  });
});
