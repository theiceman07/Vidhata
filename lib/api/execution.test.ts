import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientAuditTrail } from "@/lib/audit";
import { shapeClientSummary } from "@/lib/api/client/shape-document";
import { groupOf } from "@/lib/moves";
import { stateText } from "@/components/document/state-label";
import { getDocument, toggleExecutionStep } from "./documents";

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

// Signed off by Ananya Rao. Stamping is done and carries its proof, registration
// does not apply, and the e-signature is the one step left.
const id = "doc-nda-settled-2";
const client = "Anaya Textiles Pvt Ltd";

const read = async () => (await settle(getDocument(id)))!;
const sign = (complete: boolean) => settle(toggleExecutionStep(id, "esignature", complete, client));
const executedEntries = (doc: Awaited<ReturnType<typeof read>>) =>
  clientAuditTrail(doc).filter((e) => /Recorded as executed/.test(e.action));

describe("executing a settled document", () => {
  it("starts settled, with the e-signature the only step left", async () => {
    const doc = await read();
    expect(doc.status).toBe("settled");
    expect(doc.executedAt ?? null).toBeNull();
    expect(doc.executionSteps.filter((s) => s.applicable && !s.complete).map((s) => s.kind)).toEqual([
      "esignature",
    ]);
    expect(groupOf(shapeClientSummary(doc))).toBe("you");
    expect(executedEntries(doc)).toEqual([]);
  });

  it("is executed when the client confirms the last step, and says when and by whom", async () => {
    const doc = await sign(true);
    expect(doc.status).toBe("executed");
    expect(typeof doc.executedAt).toBe("string");
    expect(Number.isNaN(new Date(doc.executedAt!).getTime())).toBe(false);
    const step = doc.executionSteps.find((s) => s.kind === "esignature")!;
    expect(step).toMatchObject({ complete: true, completedBy: client });
  });

  it("reads as executed everywhere a client looks", async () => {
    const doc = await read();
    // The badge, the dashboard's grouping and the trail.
    expect(stateText(doc.status)).toBe("Executed");
    expect(groupOf(shapeClientSummary(doc))).toBe("done");
    const entries = executedEntries(doc);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ actor: client, at: doc.executedAt });
  });

  it("is one record however many times the last step is confirmed", async () => {
    const first = await read();
    await sign(true);
    const again = await read();
    expect(again.executedAt).toBe(first.executedAt);
    expect(executedEntries(again)).toHaveLength(1);
  });

  it("goes back to settled when a step is taken back, and the record goes with it", async () => {
    const doc = await sign(false);
    expect(doc.status).toBe("settled");
    expect(doc.executedAt).toBeNull();
    expect(groupOf(shapeClientSummary(doc))).toBe("you");
    expect(stateText(doc.status)).toBe("Settled");
    expect(executedEntries(doc)).toEqual([]);
  });

  it("is not executed while any applicable step is open", async () => {
    // Stamping is done; the e-signature is not. Taking stamping back too leaves two open.
    await settle(toggleExecutionStep(id, "stamping", false, client));
    const doc = await read();
    expect(doc.status).toBe("settled");
    await settle(toggleExecutionStep(id, "stamping", true, client));
    expect((await read()).status).toBe("settled");
  });

  it("leaves a step that does not apply out of the count", async () => {
    // Registration does not apply to this document, so it never holds execution up.
    const doc = await read();
    const registration = doc.executionSteps.find((s) => s.kind === "registration")!;
    expect(registration.applicable).toBe(false);
    expect((await sign(true)).status).toBe("executed");
    await sign(false);
  });

  it("changes nothing when it fails, and works again afterwards", async () => {
    failure.on = true;
    expect(await refusal(toggleExecutionStep(id, "esignature", true, client))).toMatch(
      /Could not update the checklist/,
    );
    failure.on = false;
    const unchanged = await read();
    expect(unchanged.status).toBe("settled");
    expect(unchanged.executionSteps.find((s) => s.kind === "esignature")!.complete).toBe(false);
    expect((await sign(true)).status).toBe("executed");
  });

  it("does not execute a document that is not signed off", async () => {
    // Nothing to execute before sign-off: the document has no steps to confirm.
    const doc = await settle(toggleExecutionStep("doc-vendor-revision", "esignature", true, client));
    expect(doc.status).toBe("revision");
    expect(doc.executedAt ?? null).toBeNull();
  });
});
