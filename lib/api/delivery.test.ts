import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDelivery } from "./delivery";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import type { ContractDocument } from "@/lib/types";

// The mock layer's failure switch (?fail=1 in a browser), set by a test.
const failure = vi.hoisted(() => ({ on: false }));
vi.mock("./delay", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delay")>();
  return { ...original, shouldSimulateFailure: () => failure.on };
});

// A test can hand the API a changed copy of a document, to reach states the
// fixtures do not hold (a sign-off with nothing recorded, an executed one).
const hold = vi.hoisted(() => ({
  override: null as null | ((doc: unknown) => unknown),
}));
vi.mock("./documents", async (importOriginal) => {
  const original = await importOriginal<typeof import("./documents")>();
  return {
    ...original,
    getDocument: async (id: string) => {
      const doc = await original.getDocument(id);
      return doc && hold.override ? hold.override(doc) : doc;
    },
  };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  failure.on = false;
  hold.override = null;
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

function changed(change: (doc: ContractDocument) => void) {
  hold.override = (doc) => {
    const copy = structuredClone(doc as ContractDocument);
    change(copy);
    return copy;
  };
}

const settled = "doc-nda-settled";
const notSignedOff = ["doc-msa-pending", "doc-vendor-revision", "doc-employment-rereview"];

describe("the delivery", () => {
  it("is handed over for a signed-off document, with the recorded sign-off", async () => {
    const doc = getMockDocumentById(settled)!;
    const result = await settle(getDelivery(settled));
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    const { delivery } = result;
    expect(delivery.signOff).toEqual({
      advocate: doc.advocate!.name,
      enrolment: doc.advocate!.bar,
      at: doc.settledAt,
    });
    expect(delivery.title).toBe(doc.title);
    expect(delivery.status).toBe("settled");
    expect(delivery.summary?.documentId).toBe(settled);
    const applicable = doc.executionSteps.filter((s) => s.applicable);
    expect(delivery.checklist).toEqual({
      done: applicable.filter((s) => s.complete).length,
      total: applicable.length,
    });
  });

  it("is not available before sign-off, and says nothing else", async () => {
    for (const id of notSignedOff) {
      expect(await settle(getDelivery(id)), id).toEqual({ state: "not_available" });
    }
  });

  it("is not available for a sign-off with no advocate or date on record", async () => {
    // No document reaches a client without a recorded advocate sign-off.
    changed((doc) => {
      doc.advocate = null;
    });
    expect(await settle(getDelivery(settled))).toEqual({ state: "not_available" });

    changed((doc) => {
      doc.settledAt = null;
    });
    expect(await settle(getDelivery(settled))).toEqual({ state: "not_available" });
  });

  it("holds even when the document says it is signed off but is not (the status is the gate)", async () => {
    changed((doc) => {
      doc.status = "under_review";
    });
    const result = await settle(getDelivery(settled));
    expect(result).toEqual({ state: "not_available" });
    expect(JSON.stringify(result)).not.toMatch(/Rhea|Kapoor|Kavach|summary/i);
  });

  it("is still handed over when there is no summary for this draft, with the summary left out", async () => {
    changed((doc) => {
      doc.version += 1;
    });
    const result = await settle(getDelivery(settled));
    expect(result.state).toBe("ready");
    if (result.state === "ready") expect(result.delivery.summary).toBeNull();
  });

  it("reads as executed once the document is", async () => {
    changed((doc) => {
      doc.status = "executed";
    });
    const result = await settle(getDelivery(settled));
    expect(result.state === "ready" && result.delivery.status).toBe("executed");
  });

  it("is refused for a document that does not exist", async () => {
    expect(await refusal(getDelivery("doc-nope"))).toBe("Document not found.");
  });

  it("fails as an error, and reads again once it works", async () => {
    failure.on = true;
    expect(await refusal(getDelivery(settled))).toMatch(/Could not load this delivery/);
    failure.on = false;
    expect((await settle(getDelivery(settled))).state).toBe("ready");
  });
});

describe("what the delivery screen holds back", () => {
  const root = path.resolve(__dirname, "..", "..");
  const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

  it("has no draft banner and no coverage panel", () => {
    const page = read("app", "(client)", "documents", "[id]", "delivery", "page.tsx");
    expect(page).not.toMatch(/DraftBanner|CoveragePanel/);
  });

  it("offers downloads that do not work, and builds no file", () => {
    const source = read("components", "domain", "download-options.tsx");
    expect(source).toContain("Downloads aren't enabled in this preview.");
    // Code only: the file's own comments explain what it does not do.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // Disabled controls, no link, no handler, nothing that makes a file.
    expect((code.match(/<Button[^>]*\bdisabled\b/g) ?? []).length).toBe(2);
    expect(code).not.toMatch(/href=|onClick|download=|Blob|createObjectURL|window\.print|toast/);
  });
});
