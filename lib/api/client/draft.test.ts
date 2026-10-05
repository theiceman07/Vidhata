import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import { getDocument, type IntakeInput } from "../documents";
import { settle } from "../testing";
import { createClientDraft, getClientDocument } from "./documents";

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
