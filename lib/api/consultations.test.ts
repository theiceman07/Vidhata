import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listConsultations, requestConsultation } from "./consultations";

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

// Settled by Rhea Kapoor. The vendor agreement is not signed off.
const settled = "doc-nda-settled";
const unsigned = "doc-vendor-revision";

describe("requesting a consultation", () => {
  it("is with the advocate who settled the document, read from the document", async () => {
    const request = await settle(requestConsultation(settled, "Can the term be extended?"));
    expect(request).toMatchObject({
      documentId: settled,
      advocateName: "Rhea Kapoor",
      question: "Can the term be extended?",
      status: "requested",
    });
    // There is no way to name another advocate: the function takes none.
    expect(requestConsultation.length).toBe(2);
  });

  it("is refused on a document that has not been signed off", async () => {
    expect(await refusal(requestConsultation(unsigned, "A question"))).toMatch(
      /opens once the document is signed off/,
    );
    expect(await settle(listConsultations(unsigned))).toEqual([]);
  });

  it("is refused for a document that does not exist", async () => {
    expect(await refusal(requestConsultation("doc-nope", "A question"))).toBe("Document not found.");
  });

  it("needs a question, and a sane length", async () => {
    expect(await refusal(requestConsultation(settled, "   "))).toMatch(/what you would like to ask/);
    expect(await refusal(requestConsultation(settled, "x".repeat(1501)))).toMatch(/under 1500/);
  });

  it("is made once, however many times the button is pressed", async () => {
    const question = "Does this restrict me after the term ends?";
    const first = requestConsultation(settled, question);
    const second = requestConsultation(settled, `  ${question}  `);
    await vi.runAllTimersAsync();
    const [a, b] = await Promise.all([first, second]);
    expect(a.id).toBe(b.id);
    const listed = await settle(listConsultations(settled));
    expect(listed.filter((c) => c.question === question)).toHaveLength(1);
  });

  it("creates nothing when it fails, and can be tried again", async () => {
    const before = (await settle(listConsultations(settled))).length;
    failure.on = true;
    expect(await refusal(requestConsultation(settled, "A new question"))).toMatch(
      /Nothing was created/,
    );
    failure.on = false;
    expect((await settle(listConsultations(settled))).length).toBe(before);
    await settle(requestConsultation(settled, "A new question"));
    expect((await settle(listConsultations(settled))).length).toBe(before + 1);
  });

  it("is stored as requested, and has no payment", async () => {
    const [latest] = await settle(listConsultations(settled));
    expect(latest.status).toBe("requested");
    expect(Object.keys(latest).sort()).toEqual(
      ["advocateName", "documentId", "id", "orgId", "question", "requestedAt", "status"].sort(),
    );
  });
});

// The question is the client's own words and may hold sensitive facts. It goes
// to the client and the advocate, and nowhere else: not the trail, not a
// notification, not an export. Files that build those are held to it, and any
// not built yet are covered the moment they exist.
describe("where the question may not go", () => {
  const root = path.resolve(__dirname, "..", "..");
  const files = [
    "lib/audit.ts",
    "lib/notifications.ts",
    "lib/api/notifications.ts",
    "lib/privacy.ts",
    "lib/api/privacy.ts",
    "lib/billing.ts",
    "lib/api/billing.ts",
  ]
    .map((f) => path.join(root, f))
    .filter((f) => existsSync(f));

  it("lists the files it guards", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the question out of the trail, notifications, exports and billing", () => {
    const offenders = files.filter((f) =>
      /api\/consultations|\.question\b|\bquestion:/i.test(readFileSync(f, "utf8")),
    );
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
