import { describe, expect, it } from "vitest";
import { activeTab, documentTabs } from "./documentTabs";

describe("documentTabs", () => {
  it("offers only the document and its version history before a sign-off", () => {
    const tabs = documentTabs({ documentId: "d1", signedOff: false, checklist: { done: 0, total: 3 } });
    expect(tabs.map((t) => t.key)).toEqual(["overview", "history"]);
  });

  it("never offers delivery, the summary, the checklist or a consultation without a sign-off", () => {
    const keys = documentTabs({ documentId: "d1", signedOff: false }).map((t) => t.key);
    for (const key of ["delivery", "summary", "checklist", "consultation"]) {
      expect(keys).not.toContain(key);
    }
  });

  it("offers all six once signed off, in reading order", () => {
    const tabs = documentTabs({ documentId: "d1", signedOff: true, checklist: { done: 2, total: 3 } });
    expect(tabs.map((t) => t.key)).toEqual([
      "overview",
      "summary",
      "checklist",
      "history",
      "consultation",
      "delivery",
    ]);
    expect(tabs.find((t) => t.key === "checklist")?.label).toBe("Execution checklist · 2 of 3");
    expect(tabs.map((t) => t.href)).toContain("/documents/d1/delivery");
  });

  it("finds the active tab from the path, and none on the chat page", () => {
    const tabs = documentTabs({ documentId: "d1", signedOff: true });
    expect(activeTab(tabs, "/documents/d1")?.key).toBe("overview");
    expect(activeTab(tabs, "/documents/d1/history")?.key).toBe("history");
    expect(activeTab(tabs, "/documents/d1/chat")).toBeNull();
  });
});
