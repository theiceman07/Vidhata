import { describe, expect, it } from "vitest";
import { youSummary, type MoveSource } from "./moves";

const doc = (status: MoveSource["status"], done = 0, total = 0, openRequests = 0): MoveSource => ({
  id: `d-${status}-${done}-${total}`,
  status,
  openRequests,
  checklist: { done, total },
});

describe("youSummary, the sentence under the greeting", () => {
  it("says nothing when nothing is on the client's desk", () => {
    expect(youSummary([])).toBeNull();
    expect(youSummary([doc("under_review"), doc("executed", 3, 3)])).toBeNull();
  });

  it("counts a request to answer as a document that needs an answer", () => {
    expect(youSummary([doc("revision", 0, 0, 1)])).toBe("1 document needs your answer.");
    expect(youSummary([doc("revision"), doc("revision")])).toBe("2 documents need your answer.");
  });

  it("does not call a settled document with steps left a document that needs the client", () => {
    const sentence = youSummary([doc("settled", 2, 3)]);
    expect(sentence).toBe("1 has steps left on the execution checklist.");
    expect(sentence).not.toMatch(/needs? you/);
  });

  it("names each kind of thing separately, so the count never overpromises", () => {
    expect(
      youSummary([
        doc("revision", 0, 0, 1),
        doc("awaiting_payment"),
        doc("settled", 2, 3),
        doc("settled", 1, 3),
      ]),
    ).toBe(
      "1 document needs your answer, 1 is waiting for your payment and 2 have steps left on the execution checklist.",
    );
  });
});
