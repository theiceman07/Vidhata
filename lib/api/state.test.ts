import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockConsultations } from "@/lib/mock/consultations.mock";

/** How many requests the preview starts with that match, so a count is read from the fixtures. */
function seededFor(match: { orgId?: string; documentId?: string; paid?: boolean }): number {
  return mockConsultations.filter(
    (c) =>
      (match.orgId === undefined || c.orgId === match.orgId) &&
      (match.documentId === undefined || c.documentId === match.documentId) &&
      (match.paid === undefined || (c.paidAt !== null) === match.paid),
  ).length;
}

// The mock layer's failure switch is the real one: ?fail=1 in the URL, with the
// preview-mode variable on. A test turns it on here, and the window it loads
// reads it. (The delay module is deliberately not mocked: a mock would be
// carried across the simulated refreshes, and bind them all to the first load.)
const failure = { on: false };

/** sessionStorage, as a map: enough to be read back after a "refresh". */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}
type FakeStorage = ReturnType<typeof fakeStorage>;
/** The stored value, as a test reads and damages it. */
type Raw = { fingerprint: string; slices: Record<string, unknown> };
const KEY = "vidhata-preview-state";

/**
 * A page load: every module is evaluated afresh against whatever the tab's
 * storage holds, exactly as a refresh does. Nothing but the storage survives.
 */
async function load(storage: FakeStorage | null, reload = vi.fn()) {
  vi.resetModules();
  const listeners: Record<string, () => void> = {};
  vi.stubGlobal("window", {
    get sessionStorage() {
      if (!storage) throw new Error("storage is blocked");
      return storage;
    },
    addEventListener: (name: string, fn: () => void) => void (listeners[name] = fn),
    location: {
      reload,
      get search() {
        return failure.on ? "?fail=1" : "";
      },
    },
  });
  return {
    listeners,
    reload,
    state: await import("./state"),
    documents: await import("./documents"),
    consultations: await import("./consultations"),
    notes: await import("./notes"),
    privacy: await import("./privacy"),
    billing: await import("./billing"),
    account: await import("./account"),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_VIDHATA_PREVIEW_MODE", "1");
  failure.on = false;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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

type Loaded = Awaited<ReturnType<typeof load>>;

/** A new document, screened and awaiting payment. */
async function screened(app: Loaded) {
  const draft = await settle(
    app.documents.createDraftDocument({
      title: "Persistence test",
      type: "vendor",
      clientName: "Anaya Textiles Pvt Ltd",
      counterpartyName: "Counterparty Pvt Ltd",
      stateOfExecution: "Delhi",
      transactionValue: 150_000,
      counterpartyIsMsme: false,
      durationMonths: 12,
      governingLaw: "Laws of India",
      keyTerms: "",
    }),
  );
  await settle(app.documents.startAnalysis(draft.id));
  vi.advanceTimersByTime(60_000);
  return (await settle(app.documents.getDocument(draft.id)))!;
}

function datesIn(value: unknown, path = "state"): string[] {
  if (value instanceof Date) return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => datesIn(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => datesIn(v, `${path}.${k}`));
  }
  return [];
}

describe("a refresh", () => {
  it("keeps a paid document, with every time still a string and nothing else changed", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    const unpaid = await screened(first);
    const paid = await settle(first.documents.payFee(unpaid.id));
    await vi.runAllTimersAsync();

    const second = await load(storage);
    const after = (await settle(second.documents.getDocument(unpaid.id)))!;
    expect(after).toEqual(paid);
    expect(after.status).toBe("pending_review");
    expect(typeof after.payment?.paidAt).toBe("string");
    expect(typeof after.createdAt).toBe("string");
    expect(datesIn(after)).toEqual([]);
    // And the fixtures are still there beside it.
    const all = await settle(second.documents.listDocuments("org-anaya-textiles"));
    expect(all.some((d) => d.id === "doc-nda-settled")).toBe(true);
  });

  it("holds no Date anywhere, and reads back exactly as it was written", async () => {
    const storage = fakeStorage();
    const app = await load(storage);
    const doc = await screened(app);
    await settle(app.documents.payFee(doc.id));
    await settle(
      app.consultations.requestConsultation("doc-nda-settled", "Does clause 4.1 let either side end early?"),
    );
    await settle(app.notes.addNote({ documentId: doc.id, clauseId: "cl-1", advocateId: "adv-current", text: "A note." }));
    await settle(app.privacy.setTrainingOptIn("org-anaya-textiles", true));
    await settle(app.billing.saveBillingProfile("org-anaya-textiles", { name: "Anaya", gstin: "22AAAAA0000A1Z5" }));

    const snapshot = app.state.snapshot();
    expect(datesIn(snapshot)).toEqual([]);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("keeps a pipeline that was running, and finishes it", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    const draft = await settle(
      first.documents.createDraftDocument({
        title: "Mid-run",
        type: "nda",
        clientName: "Anaya Textiles Pvt Ltd",
        counterpartyName: "Counterparty Pvt Ltd",
        stateOfExecution: "Delhi",
        transactionValue: 0,
        counterpartyIsMsme: false,
        durationMonths: 12,
        governingLaw: "Laws of India",
        keyTerms: "",
      }),
    );
    const running = await settle(first.documents.startAnalysis(draft.id));
    expect(running.status).toBe("analysing");
    await vi.runAllTimersAsync();

    const second = await load(storage);
    expect((await settle(second.documents.getDocument(draft.id)))!.status).toBe("analysing");
    vi.advanceTimersByTime(60_000);
    expect((await settle(second.documents.getDocument(draft.id)))!.status).toBe("awaiting_payment");
  });

  it("is saved when the page is hidden, without waiting for the next call", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    const doc = await screened(first);
    // Change something in memory that no API wait will save.
    first.state.snapshot().documents.find((d) => d.id === doc.id)!.title = "Edited in memory";
    first.listeners.pagehide();

    const second = await load(storage);
    expect((await settle(second.documents.getDocument(doc.id)))!.title).toBe("Edited in memory");
  });

  it("keeps the other slices when only one store has loaded on the page", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    await settle(first.consultations.requestConsultation("doc-nda-settled", "A question for the advocate?"));
    await vi.runAllTimersAsync();

    // A page that only loads the documents store, and reads a document.
    vi.resetModules();
    vi.stubGlobal("window", { sessionStorage: storage, addEventListener: () => {}, location: { search: "" } });
    const documents = await import("./documents");
    await settle(documents.getDocument("doc-nda-settled"));
    await vi.runAllTimersAsync();

    const third = await load(storage);
    // The one just made, beside whatever the preview starts with.
    expect(await settle(third.consultations.listOrgConsultations("org-anaya-textiles"))).toHaveLength(
      seededFor({ orgId: "org-anaya-textiles" }) + 1,
    );
  });
});

describe("payments and requests, after a refresh", () => {
  it("make one payment when Pay is pressed again on a restored paid document", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    const unpaid = await screened(first);
    const paid = await settle(first.documents.payFee(unpaid.id));
    await vi.runAllTimersAsync();

    const second = await load(storage);
    vi.advanceTimersByTime(5_000);
    const again = await settle(second.documents.payFee(unpaid.id));
    expect(again.payment).toEqual(paid.payment);
    expect(again.status).toBe("pending_review");
    const invoices = await settle(second.billing.listInvoices("org-anaya-textiles"));
    expect(invoices.filter((i) => i.documentId === unpaid.id)).toHaveLength(1);
  });

  it("make one consultation request, one payment and one answer", async () => {
    const storage = fakeStorage();
    const question = "Does clause 4.1 let either side end early?";
    const first = await load(storage);
    const asked = await settle(first.consultations.requestConsultation("doc-nda-settled-2", question));
    await vi.runAllTimersAsync();

    // Refreshed, the same question for the same document is still the one request.
    const second = await load(storage);
    const again = await settle(second.consultations.requestConsultation("doc-nda-settled-2", question));
    expect(again.id).toBe(asked.id);
    // Made once: the preview's own request on this document, and this one.
    expect(await settle(second.consultations.listConsultations("doc-nda-settled-2"))).toHaveLength(
      seededFor({ documentId: "doc-nda-settled-2" }) + 1,
    );

    await settle(second.consultations.acceptConsultation("adv-current", asked.id));
    const paid = await settle(second.consultations.payConsultation(asked.id));
    await vi.runAllTimersAsync();

    // Refreshed, paying again moves no money and records nothing new.
    const third = await load(storage);
    vi.advanceTimersByTime(5_000);
    const paidAgain = await settle(third.consultations.payConsultation(asked.id));
    expect(paidAgain.paidAt).toBe(paid.paidAt);
    const invoices = await settle(third.billing.listInvoices("org-anaya-textiles"));
    // One payment for this request, beside the invoices for the ones the preview starts with, paid.
    expect(invoices.filter((i) => i.kind === "consultation_fee")).toHaveLength(
      seededFor({ orgId: "org-anaya-textiles", paid: true }) + 1,
    );

    // The answer, once paid, is written once and read back as written.
    await settle(third.consultations.answerConsultation("adv-current", asked.id, "Yes, on thirty days' notice."));
    await vi.runAllTimersAsync();
    const fourth = await load(storage);
    const read = (await settle(fourth.consultations.listConsultations("doc-nda-settled-2"))).find(
      (c) => c.id === asked.id,
    );
    expect(read).toMatchObject({ status: "answered", answer: "Yes, on thirty days' notice." });
  });

  it("keeps an advocate's notes and the client's choices", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    await settle(first.notes.addNote({ documentId: "doc-msa-pending", clauseId: "cl-1", advocateId: "adv-current", text: "Check this." }));
    await settle(first.privacy.setTrainingOptIn("org-anaya-textiles", true));
    await vi.runAllTimersAsync();

    const second = await load(storage);
    expect(await settle(second.notes.listNotes("doc-msa-pending", "adv-current"))).toHaveLength(1);
    const privacy = await settle(second.privacy.getPrivacy("org-anaya-textiles"));
    expect(privacy.trainingOptIn).toBe(true);
    expect(privacy.consentLog).toHaveLength(1);
  });
});

describe("the team, after a refresh", () => {
  it("keeps an invitation, and the same invitation made again is still one", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    await settle(first.account.inviteMember("org-anaya-textiles", "priya@anaya-textiles.example"));
    await settle(first.account.saveProfile("org-anaya-textiles", { name: "Meera S. Shah", email: "meera@anaya-textiles.example" }));
    await vi.runAllTimersAsync();

    const second = await load(storage);
    await settle(second.account.inviteMember("org-anaya-textiles", "PRIYA@anaya-textiles.example"));
    const account = await settle(second.account.getAccount("org-anaya-textiles"));
    expect(account.members.filter((m) => m.email.toLowerCase() === "priya@anaya-textiles.example")).toHaveLength(1);
    expect(account.profile.name).toBe("Meera S. Shah");
    expect(datesIn(account)).toEqual([]);
  });
});

describe("failure injection", () => {
  it("is unchanged by a restore: a refused call still changes nothing, and works again", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    const unpaid = await screened(first);
    await vi.runAllTimersAsync();

    const second = await load(storage);
    failure.on = true;
    expect(await refusal(second.documents.payFee(unpaid.id))).toMatch(/payment did not go through/);
    expect(await refusal(second.documents.getDocument(unpaid.id))).toBe("Could not load this document.");
    failure.on = false;
    expect((await settle(second.documents.getDocument(unpaid.id)))!.status).toBe("awaiting_payment");
    expect((await settle(second.documents.payFee(unpaid.id))).status).toBe("pending_review");
  });
});

describe("a stored state that cannot be used", () => {
  async function stored() {
    const storage = fakeStorage();
    const first = await load(storage);
    const doc = await screened(first);
    await vi.runAllTimersAsync();
    expect(storage.map.has(KEY)).toBe(true);
    return { storage, doc };
  }
  const edit = (storage: FakeStorage, change: (state: Raw) => void) => {
    const state = JSON.parse(storage.map.get(KEY)!) as Raw;
    change(state);
    storage.map.set(KEY, JSON.stringify(state));
  };

  it.each([
    ["a different schema version", (s: Raw) => (s.fingerprint = s.fingerprint.replace(/^\d+:/, "999:"))],
    ["different fixtures", (s: Raw) => (s.fingerprint = s.fingerprint.replace(/:.*$/, ":0badf00d"))],
  ])("is discarded whole on %s, and the fixtures are used", async (_label, change) => {
    const { storage, doc } = await stored();
    edit(storage, change);

    const app = await load(storage);
    expect(await settle(app.documents.getDocument(doc.id))).toBeNull();
    const all = await settle(app.documents.listDocuments("org-anaya-textiles"));
    expect(all.map((d) => d.id)).toContain("doc-nda-settled");
    expect(storage.map.get(KEY) ?? "").not.toContain(doc.id);
  });

  it.each([
    ["not JSON", "{not json"],
    ["null", "null"],
    ["an array", "[]"],
    ["an empty object", "{}"],
    ["a number", "42"],
  ])("falls back to the fixtures when the value is %s, and does not crash", async (_label, value) => {
    const { storage, doc } = await stored();
    storage.map.set(KEY, value);

    const app = await load(storage);
    expect(await settle(app.documents.getDocument(doc.id))).toBeNull();
    expect((await settle(app.documents.listDocuments("org-anaya-textiles"))).length).toBeGreaterThan(0);
    // What was there is gone: the next call has written the fixtures in its place.
    expect(storage.map.get(KEY) ?? "").not.toContain(doc.id);
    expect(storage.map.get(KEY) ?? "").not.toBe(value);
  });

  it.each([
    ["documents that are not a list", (s: Raw) => (s.slices.documents = "oops")],
    ["a document with no findings", (s: Raw) => delete (s.slices.documents as Record<string, unknown>[])[0].findings],
    ["a missing slice", (s: Raw) => delete s.slices.consultations],
    ["a consultation that is not an object", (s: Raw) => (s.slices.consultations = [7])],
  ])("falls back to the fixtures, with the right fingerprint, when it holds %s", async (_label, change) => {
    const { storage, doc } = await stored();
    edit(storage, change);

    const app = await load(storage);
    expect(await settle(app.documents.getDocument(doc.id))).toBeNull();
    expect((await settle(app.documents.listDocuments("org-anaya-textiles"))).length).toBeGreaterThan(0);
  });

  it("is simply not used when the tab will not give out its storage", async () => {
    const app = await load(null);
    const all = await settle(app.documents.listDocuments("org-anaya-textiles"));
    expect(all.map((d) => d.id)).toContain("doc-nda-settled");
    // Nothing throws when it tries to save, either.
    expect(() => app.state.saveNow()).not.toThrow();
  });

  it("has a fingerprint that is the same for the same fixtures", async () => {
    const a = await load(fakeStorage());
    const b = await load(fakeStorage());
    expect(a.state.fingerprint()).toBe(b.state.fingerprint());
    expect(a.state.fingerprint()).toMatch(new RegExp(`^${a.state.SCHEMA_VERSION}:[0-9a-f]+$`));
  });
});

describe("resetting the demo data", () => {
  it("clears what is stored, starts again from the fixtures, and does not save over it on the way out", async () => {
    const storage = fakeStorage();
    const first = await load(storage);
    const doc = await screened(first);
    await vi.runAllTimersAsync();
    expect(storage.map.has(KEY)).toBe(true);

    first.state.resetDemoData();
    expect(storage.map.has(KEY)).toBe(false);
    expect(first.reload).toHaveBeenCalledTimes(1);
    // The page-hide that follows a reload must not write the old state back.
    first.listeners.pagehide();
    expect(storage.map.has(KEY)).toBe(false);

    const second = await load(storage);
    expect(await settle(second.documents.getDocument(doc.id))).toBeNull();
  });
});
