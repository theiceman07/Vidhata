import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockSummaries } from "@/lib/mock/summaries.mock";
import { getSettledSummary } from "./summaries";

// The mock layer's failure switch (?fail=1 in a browser), set by a test.
const failure = vi.hoisted(() => ({ on: false }));
vi.mock("./delay", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delay")>();
  return { ...original, shouldSimulateFailure: () => failure.on };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  failure.on = false;
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  const caught = promise.then(
    () => "",
    (e: Error) => e.message,
  );
  await vi.runAllTimersAsync();
  return caught;
}

const settled = "doc-nda-settled";
// Not signed off: with an advocate, and with the client.
const notSignedOff = ["doc-msa-pending", "doc-vendor-revision", "doc-employment-rereview"];

describe("the summary", () => {
  it("is read for a signed-off document, at the draft it was written from", async () => {
    const result = await settle(getSettledSummary(settled));
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.summary.documentId).toBe(settled);
      expect(result.summary.items.length).toBeGreaterThan(0);
    }
  });

  it("is not available before sign-off, and the answer carries nothing of the content", async () => {
    for (const id of notSignedOff) {
      const result = await settle(getSettledSummary(id));
      expect(result, id).toEqual({ state: "not_available" });
    }
  });

  it("stays unavailable before sign-off even if a summary is stored for the document", async () => {
    // The gate is the API's, not the page's: a stored summary cannot leave early.
    const early = {
      documentId: "doc-vendor-revision",
      draft: 4,
      items: [{ label: "Term", text: "A line that must not leave early.", clauses: [] }],
    };
    mockSummaries.push(early);
    try {
      const result = await settle(getSettledSummary("doc-vendor-revision"));
      expect(result).toEqual({ state: "not_available" });
      expect(JSON.stringify(result)).not.toMatch(/must not leave early/);
    } finally {
      mockSummaries.splice(mockSummaries.indexOf(early), 1);
    }
  });

  it("is not shown against a text that has changed since it was written", async () => {
    const fixture = mockSummaries.find((s) => s.documentId === settled)!;
    const written = fixture.draft;
    fixture.draft = written + 1;
    try {
      expect(await settle(getSettledSummary(settled))).toEqual({ state: "none" });
    } finally {
      fixture.draft = written;
    }
  });

  it("says so when a signed-off document has no summary", async () => {
    const index = mockSummaries.findIndex((s) => s.documentId === settled);
    const [removed] = mockSummaries.splice(index, 1);
    try {
      expect(await settle(getSettledSummary(settled))).toEqual({ state: "none" });
    } finally {
      mockSummaries.splice(index, 0, removed);
    }
  });

  it("hands over a copy, so reading it cannot change the fixture", async () => {
    const result = await settle(getSettledSummary(settled));
    if (result.state !== "ready") throw new Error("expected a summary");
    result.summary.items[0].text = "Changed by a reader.";
    const again = await settle(getSettledSummary(settled));
    if (again.state !== "ready") throw new Error("expected a summary");
    expect(again.summary.items[0].text).not.toBe("Changed by a reader.");
  });

  it("is refused for a document that does not exist", async () => {
    expect(await refusal(getSettledSummary("doc-nope"))).toBe("Document not found.");
  });

  it("fails as an error, and reads again once it works", async () => {
    failure.on = true;
    expect(await refusal(getSettledSummary(settled))).toMatch(/Could not load the summary/);
    failure.on = false;
    expect((await settle(getSettledSummary(settled))).state).toBe("ready");
  });
});
