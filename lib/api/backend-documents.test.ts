import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({ getSupabaseClient: () => ({ auth: { getSession } }) }));

import { ApiError } from "@/lib/api/backend";
import { getBackendDocument, listBackendDocuments, toContractDocument } from "@/lib/api/backend-documents";
import { claimBackendDocument, listBackendQueue, releaseBackendDocument } from "@/lib/api/backend-queue";

const ID = "11111111-1111-4111-8111-111111111111";
const ORG = "22222222-2222-4222-8222-222222222222";
const LAWYER = "33333333-3333-4333-8333-333333333333";
const row = (over: Record<string, unknown> = {}) => ({
  id: ID, org_id: ORG, created_by: ORG, doc_type: "nda", state: "drafted", state_of_execution: "Karnataka",
  transaction_value: 250000, triage_tier: "standard", assigned_lawyer_id: null, draft_for_settlement: false,
  created_at: "2026-10-18T08:00:00Z", updated_at: "2026-10-18T09:00:00Z", ...over,
});
const queueItem = (over: Record<string, unknown> = {}) => ({
  id: ID, doc_type: "nda", state_of_execution: "Karnataka", transaction_value: "250000.00",
  triage_tier: "enhanced", queued_at: "2026-10-18T08:30:00Z", org_id: ORG, org_name: "Acme Pvt Ltd", ...over,
});
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchOf = (...replies: Response[]) => {
  const fn = vi.fn();
  for (const r of replies) fn.mockResolvedValueOnce(r);
  return fn as unknown as typeof fetch & ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token-not-real" } } });
});

describe("toContractDocument", () => {
  it.each([
    ["drafted", null, "draft"],
    ["under_ai_review", null, "analysing"],
    ["pending_lawyer_review", null, "pending_review"],
    ["pending_lawyer_review", LAWYER, "under_review"],
    ["lawyer_commented", LAWYER, "revision"],
    ["revision_in_progress", LAWYER, "revision"],
    ["lawyer_approved", LAWYER, "settled"],
    ["delivered", LAWYER, "settled"],
  ])("maps backend state %s (lawyer %s) to %s", (state, lawyer, status) => {
    expect(toContractDocument(row({ state, assigned_lawyer_id: lawyer })).status).toBe(status);
  });

  it("fills what the backend does not hold with honest placeholders, never invented facts", () => {
    const d = toContractDocument(row());
    expect(d).toMatchObject({
      id: ID, orgId: ORG, type: "nda", tier: "standard", stateOfExecution: "Karnataka", transactionValue: 250000,
      counterpartyName: "Not recorded", clauses: [], findings: [], executionSteps: [], advocate: null,
      claimedAt: null, settledAt: null, analysisCompletesAt: null, version: 1, revisionCount: 0,
    });
  });

  it("copes with null optional columns", () => {
    const d = toContractDocument(row({ state_of_execution: null, transaction_value: null, triage_tier: null }));
    expect(d).toMatchObject({ stateOfExecution: "Not recorded", transactionValue: 0, tier: null });
  });

  it("names the assigned advocate only as assigned, since the backend gives no name", () => {
    expect(toContractDocument(row({ state: "pending_lawyer_review", assigned_lawyer_id: LAWYER })).advocate)
      .toEqual({ id: LAWYER, name: "Assigned advocate", bar: "" });
  });

  it("rejects a state it does not know", () => {
    expect(() => toContractDocument(row({ state: "negotiation_in_progress" }))).toThrowError(ApiError);
    expect(() => toContractDocument(row({ state: "mystery" }))).toThrowError(ApiError);
  });

  it("rejects a contract type the screens cannot show yet instead of guessing one", () => {
    expect(() => toContractDocument(row({ doc_type: "esop" }))).toThrowError(ApiError);
  });
});

describe("listBackendDocuments / getBackendDocument", () => {
  it("GETs /documents with the Bearer token and maps every row", async () => {
    const f = fetchOf(json(200, [row(), row({ id: "44444444-4444-4444-8444-444444444444", doc_type: "msa" })]));
    const docs = await listBackendDocuments(f);
    expect(docs.map((d) => d.type)).toEqual(["nda", "msa"]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("http://localhost:8000/documents");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer test-token-not-real");
  });

  it("reads a single document", async () => {
    const f = fetchOf(json(200, row()));
    await expect(getBackendDocument(ID, f)).resolves.toMatchObject({ id: ID });
    expect(f.mock.calls[0][0]).toBe(`http://localhost:8000/documents/${ID}`);
  });

  it("returns null for a document that is not found, as the mock does", async () => {
    await expect(getBackendDocument(ID, fetchOf(json(404, { detail: "no" })))).resolves.toBeNull();
  });

  it("lets other failures through as ApiError", async () => {
    await expect(getBackendDocument(ID, fetchOf(json(500, {})))).rejects.toMatchObject({ code: "server" });
  });

  it("is bad_reply when one row is unreadable", async () => {
    await expect(listBackendDocuments(fetchOf(json(200, [row({ state: "mystery" })])))).rejects.toMatchObject({ code: "bad_reply" });
  });
});

describe("the lawyer queue", () => {
  it("lists queue items as pending-review documents with the organisation's name", async () => {
    const f = fetchOf(json(200, [queueItem()]));
    const [d] = await listBackendQueue(f);
    expect(f.mock.calls[0][0]).toBe("http://localhost:8000/queue");
    expect(d).toMatchObject({ id: ID, status: "pending_review", tier: "enhanced", clientName: "Acme Pvt Ltd",
      transactionValue: 250000, createdAt: "2026-10-18T08:30:00Z", advocate: null });
  });

  it("claims with POST and returns the claimed document as under review", async () => {
    const f = fetchOf(json(200, row({ state: "pending_lawyer_review", assigned_lawyer_id: LAWYER })));
    const d = await claimBackendDocument(ID, f);
    expect(f.mock.calls[0][0]).toBe(`http://localhost:8000/queue/${ID}/claim`);
    expect(f.mock.calls[0][1].method).toBe("POST");
    expect(d.status).toBe("under_review");
  });

  it("surfaces a claim someone else already holds as a conflict", async () => {
    await expect(claimBackendDocument(ID, fetchOf(json(409, { detail: "taken" })))).rejects.toMatchObject({ code: "conflict" });
  });

  it("releases with POST", async () => {
    const f = fetchOf(json(200, { ok: true }));
    await expect(releaseBackendDocument(ID, f)).resolves.toBeUndefined();
    expect(f.mock.calls[0][0]).toBe(`http://localhost:8000/queue/${ID}/release`);
  });
});
