import { describe, expect, it } from "vitest";
import { mockDocuments as DOCUMENTS } from "@/lib/mock/documents.mock";
import { partiesVisibleInQueue, queueSearchFields, upNextPartiesLine } from "@/lib/queueParties";

const unclaimed = DOCUMENTS.filter((d) => d.status === "pending_review");
const claimed = DOCUMENTS.filter((d) => d.status !== "pending_review");

function matches(doc: (typeof DOCUMENTS)[number], q: string) {
  return queueSearchFields(doc).some((s) => s.toLowerCase().includes(q.toLowerCase()));
}

describe("queue parties for unclaimed documents", () => {
  it("has fixtures on both sides", () => {
    expect(unclaimed.length).toBeGreaterThan(0);
    expect(claimed.length).toBeGreaterThan(0);
  });

  it("does not match a search for the counterparty or the client", () => {
    for (const d of unclaimed) {
      expect(matches(d, d.counterpartyName)).toBe(false);
      expect(matches(d, d.clientName)).toBe(false);
    }
  });

  it("still matches the title", () => {
    for (const d of unclaimed) expect(matches(d, d.title)).toBe(true);
  });

  it("gives the Up next card no parties line", () => {
    for (const d of unclaimed) {
      expect(partiesVisibleInQueue(d)).toBe(false);
      expect(upNextPartiesLine(d)).toBeNull();
    }
  });

  it("keeps both parties after a claim", () => {
    for (const d of claimed) {
      expect(matches(d, d.counterpartyName)).toBe(true);
      expect(matches(d, d.clientName)).toBe(true);
      expect(upNextPartiesLine(d)).toBe(`${d.clientName} and ${d.counterpartyName}`);
    }
  });
});
