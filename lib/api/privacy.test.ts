import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestConsultation } from "./consultations";
import {
  getPrivacy,
  requestDataExport,
  requestDeletion,
  setTrainingOptIn,
  withdrawDeletion,
} from "./privacy";

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

const org = "org-anaya-textiles";

describe("training use", () => {
  it("is off until the client turns it on, with nothing in the log", async () => {
    expect(await settle(getPrivacy(org))).toEqual({
      trainingOptIn: false,
      consentLog: [],
      deletionRequestedAt: null,
    });
  });

  it("logs every change with its time, and a repeat changes nothing", async () => {
    const on = await settle(setTrainingOptIn(org, true));
    expect(on.trainingOptIn).toBe(true);
    expect(on.consentLog).toHaveLength(1);
    expect(on.consentLog[0].granted).toBe(true);
    expect(new Date(on.consentLog[0].at).getTime()).not.toBeNaN();

    const again = await settle(setTrainingOptIn(org, true));
    expect(again.consentLog).toHaveLength(1);

    const off = await settle(setTrainingOptIn(org, false));
    expect(off.trainingOptIn).toBe(false);
    expect(off.consentLog.map((e) => e.granted)).toEqual([true, false]);
  });

  it("changes nothing when it fails", async () => {
    const before = await settle(getPrivacy(org));
    failure.on = true;
    expect(await refusal(setTrainingOptIn(org, true))).toMatch(/Nothing was changed/);
    failure.on = false;
    expect(await settle(getPrivacy(org))).toEqual(before);
  });
});

describe("the export", () => {
  it("holds this organisation's documents only, as a preview", async () => {
    const { fileName, contents } = await settle(requestDataExport(org));
    const file = JSON.parse(contents);
    expect(fileName).toBe("vidhata-export-preview.json");
    expect(file.preview).toBe(true);
    const ids = file.documents.map((d: { id: string }) => d.id);
    expect(ids).toContain("doc-nda-settled");
    expect(ids).toContain("doc-vendor-revision");
    // Another organisation's document is not here.
    expect(ids).not.toContain("doc-msa-pending");
  });

  it("holds the client's own consultation question, and the consent log", async () => {
    await settle(requestConsultation("doc-nda-settled", "A question only the client wrote."));
    const file = JSON.parse((await settle(requestDataExport(org))).contents);
    expect(file.consultationRequests.map((c: { question: string }) => c.question)).toContain(
      "A question only the client wrote.",
    );
    expect(Array.isArray(file.consentLog)).toBe(true);
  });

  it("holds nothing of an unsigned document's review beyond what is addressed", async () => {
    const { contents } = await settle(requestDataExport(org));
    expect(contents).not.toMatch(/find-9|find-10|PLACEHOLDER|overrideNote|ruleApplied/);
  });

  it("prepares nothing when it fails", async () => {
    failure.on = true;
    expect(await refusal(requestDataExport(org))).toMatch(/Could not prepare/);
  });
});

describe("a deletion request", () => {
  it("needs the explicit confirmation, whatever the screen did", async () => {
    expect(
      await refusal(requestDeletion(org, {} as unknown as { understood: true })),
    ).toMatch(/Confirm the request/);
    expect((await settle(getPrivacy(org))).deletionRequestedAt).toBeNull();
  });

  it("is recorded, and the first time is kept when it is asked again", async () => {
    const first = await settle(requestDeletion(org, { understood: true }));
    expect(first.deletionRequestedAt).not.toBeNull();
    vi.setSystemTime(new Date(Date.now() + 60_000));
    const second = await settle(requestDeletion(org, { understood: true }));
    expect(second.deletionRequestedAt).toBe(first.deletionRequestedAt);
  });

  it("keeps the consent log, which is the proof a revocation happened", async () => {
    const before = (await settle(getPrivacy(org))).consentLog;
    expect(before.length).toBeGreaterThan(0);
    await settle(requestDeletion(org, { understood: true }));
    expect((await settle(getPrivacy(org))).consentLog).toEqual(before);
  });

  it("deletes nothing: the documents are all still there", async () => {
    await settle(requestDeletion(org, { understood: true }));
    const file = JSON.parse((await settle(requestDataExport(org))).contents);
    expect(file.documents.length).toBeGreaterThan(0);
  });

  it("can be withdrawn, and records nothing when it fails", async () => {
    failure.on = true;
    expect(await refusal(withdrawDeletion(org))).toMatch(/Could not withdraw/);
    failure.on = false;
    expect((await settle(getPrivacy(org))).deletionRequestedAt).not.toBeNull();
    expect((await settle(withdrawDeletion(org))).deletionRequestedAt).toBeNull();
  });
});
