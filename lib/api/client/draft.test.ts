import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { getDocument, type IntakeInput } from "../documents";
import { refusal, settle } from "../testing";
import { createClientDraft, getClientDocument, listClientDocuments } from "./documents";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const ORG = MOCK_CLIENT_ORG.id;
const OTHER = "org-bharosa-fintech";

const intake: IntakeInput = {
  title: "Mutual NDA · Test Counterparty",
  type: "nda",
  clientName: "Anaya Textiles Pvt Ltd",
  counterpartyName: "Test Counterparty Pvt Ltd",
  stateOfExecution: "Delhi",
  transactionValue: 0,
  counterpartyIsMsme: false,
  durationMonths: 24,
  governingLaw: "Laws of India",
  keyTerms: "Mutual confidentiality.",
};

describe("starting a draft, as the client's own organisation", () => {
  it("is the organisation's own draft, handed back as what a client reads", async () => {
    const made = await settle(createClientDraft(ORG, intake));
    expect(made.status).toBe("draft");
    expect(made.deal.counterpartyName).toBe("Test Counterparty Pvt Ltd");
    expect(made.signOff).toBeNull();
    // Nothing the record holds beyond what a client reads.
    expect(Object.keys(made)).not.toContain("orgId");
    expect(Object.keys(made)).not.toContain("advocate");
    expect(Object.keys(made)).not.toContain("findings");
    expect(await settle(getClientDocument(ORG, made.id))).toEqual(made);
  });

  it("belongs to the organisation that made it, and to no other", async () => {
    const made = await settle(createClientDraft(OTHER, intake));
    expect((await settle(getDocument(made.id)))?.orgId).toBe(OTHER);
    // For the organisation that did not make it, it is not there.
    expect(await settle(getClientDocument(ORG, made.id))).toBeNull();
    expect(await settle(getClientDocument(OTHER, made.id))).toEqual(made);
  });

  it("makes two drafts started together two documents, not one", async () => {
    const [a, b] = await Promise.all([
      settle(createClientDraft(ORG, { ...intake, title: "First" })),
      settle(createClientDraft(ORG, { ...intake, title: "Second" })),
    ]);
    expect(a.id).not.toBe(b.id);
  });
});

describe("a draft is refused when it breaks the rules the intake form holds", () => {
  const count = async () => (await settle(listClientDocuments(ORG))).length;
  const bad = (change: Record<string, unknown>) => ({ ...intake, ...change }) as unknown as IntakeInput;

  it("refuses a title that is too short, naming it, and creates nothing", async () => {
    const before = await count();
    expect(await refusal(createClientDraft(ORG, bad({ title: "ab" })))).toBe("Give this deal a short name.");
    expect(await count()).toBe(before);
  });

  it("refuses a negative value, and a duration under a month", async () => {
    const before = await count();
    expect(await refusal(createClientDraft(ORG, bad({ transactionValue: -1 })))).toBe("Transaction value cannot be negative.");
    expect(await refusal(createClientDraft(ORG, bad({ durationMonths: 0 })))).toBe("Enter the contract duration.");
    expect(await count()).toBe(before);
  });

  it("refuses a contract type that is not one the product drafts", async () => {
    const before = await count();
    expect(await refusal(createClientDraft(ORG, bad({ type: "will" })))).not.toBe("");
    expect(await refusal(createClientDraft(ORG, bad({ type: undefined })))).not.toBe("");
    expect(await count()).toBe(before);
  });

  it("refuses a missing counterparty, and a value that is not a number", async () => {
    const before = await count();
    expect(await refusal(createClientDraft(ORG, bad({ counterpartyName: "" })))).toBe("Enter the counterparty's name.");
    expect(await refusal(createClientDraft(ORG, bad({ transactionValue: "plenty" })))).not.toBe("");
    expect(await count()).toBe(before);
  });

  it("still makes a draft of what the form sends, and keeps the numbers as numbers", async () => {
    const doc = await settle(createClientDraft(ORG, bad({ transactionValue: "250000", durationMonths: "18" })));
    const stored = (await settle(getDocument(doc.id)))!;
    expect(stored.transactionValue).toBe(250_000);
    expect(stored.durationMonths).toBe(18);
  });
});
