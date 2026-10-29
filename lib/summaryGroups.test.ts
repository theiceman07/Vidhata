import { describe, expect, it } from "vitest";
import { mockSummaries } from "@/lib/mock/summaries.mock";
import { groupSummary, OTHER_TERMS_TITLE } from "./summaryGroups";

const item = (label: string) => ({ label, text: `${label}.`, clauses: [] });

describe("groupSummary, the sections of a summary page", () => {
  it("shows every line of every summary exactly once", () => {
    for (const summary of mockSummaries) {
      const shown = groupSummary(summary.items).flatMap((g) => g.items);
      expect(shown).toHaveLength(summary.items.length);
      expect(new Set(shown)).toEqual(new Set(summary.items));
    }
  });

  it("places every line of the fixtures in a named section; Other terms holds only Payment", () => {
    for (const summary of mockSummaries) {
      const other = groupSummary(summary.items).find((g) => g.title === OTHER_TERMS_TITLE);
      expect((other?.items ?? []).every((i) => i.label === "Payment")).toBe(true);
    }
  });

  it("keeps a line it does not know, last, under Other terms", () => {
    const groups = groupSummary([item("Governing law"), item("Insurance"), item("Term")]);
    expect(groups.map((g) => g.title)).toEqual([
      "Duration and termination",
      "Liability and legal terms",
      OTHER_TERMS_TITLE,
    ]);
    expect(groups[groups.length - 1].items.map((i) => i.label)).toEqual(["Insurance"]);
  });

  it("drops a section with nothing in it and keeps the order of the lines within one", () => {
    const groups = groupSummary([item("After it ends"), item("Term")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.label)).toEqual(["After it ends", "Term"]);
  });

  it("changes no line", () => {
    const original = item("Liability");
    const before = JSON.stringify(original);
    groupSummary([original]);
    expect(JSON.stringify(original)).toBe(before);
  });
});
