import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({ getSupabaseClient: () => ({ auth: { getSession } }) }));

import { ApiError } from "@/lib/api/backend";
import { asViewedBy, toContractDocument } from "@/lib/api/backend-documents";
import {
  addBackendFinding,
  adjudicateBackendFinding,
  listBackendClientFindings,
  listBackendFindings,
  signOffBackendDocument,
} from "@/lib/api/backend-findings";
import { shapeClientFindings } from "@/lib/api/client/shape-findings";
import { addFinding, claimDocument, getDocument, getDocumentForReview, signOffDocument, updateFinding } from "@/lib/api/documents";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";

const DOC = "11111111-1111-4111-8111-111111111111";
const ORG = "22222222-2222-4222-8222-222222222222";
const ME = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const F1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const F2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const F3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const agent = (over: Record<string, unknown> = {}) => ({
  origin: "agent", finding_id: F1, id: F1, version_no: 1, layer: "STATUTORY", severity: "critical",
  clause_reference: "Clause 8", description: "Post-termination non-compete restrains trade.",
  rule_applied: "NDA_NON_COMPETE_VOID", remedy_suggested: "Delete the non-compete.",
  citation: "Indian Contract Act, 1872, s. 27", citation_type: "STATUTORY", status: "pending",
  advocate_notes: null, adjudicated_at: null, ...over,
});
const advocate = (over: Record<string, unknown> = {}) => ({
  origin: "advocate", finding_id: F2, id: F2, version_no: 1, severity: "medium", clause_reference: "Clause 5",
  description: "No notice period.", rule_applied: null, remedy_suggested: null, status: "added",
  advocate_notes: null, adjudicated_at: "2026-10-19T05:00:00Z", ...over,
});
const clientRow = (over: Record<string, unknown> = {}) => ({
  finding_id: F1, id: F1, severity: "critical", clause_reference: "Clause 8", description: "d",
  remedy_suggested: "r", citation: "Indian Contract Act, 1872, s. 27", citation_type: "STATUTORY",
  status: "confirmed", origin: "agent", ...over,
});
const docRow = (over: Record<string, unknown> = {}) => ({
  id: DOC, org_id: ORG, doc_type: "nda", state: "pending_lawyer_review", state_of_execution: "Karnataka",
  transaction_value: 250000, triage_tier: "standard", assigned_lawyer_id: ME,
  created_at: "2026-10-19T04:00:00Z", updated_at: "2026-10-19T05:00:00Z", ...over,
});

type Routes = Record<string, () => Response>;
function backend(routes: Routes) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const method = init.method ?? "GET";
    calls.push({ method, path, body: init.body ? JSON.parse(init.body as string) : undefined });
    const route = routes[`${method} ${path}`];
    return route ? route() : json(500, { detail: `unrouted ${method} ${path}` });
  }));
  return calls;
}

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token-not-real", user: { id: ME } } } });
  vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "backend");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the advocate's findings from the backend", () => {
  it("maps an agent finding: layer name to the integer, citation kept, undecided", async () => {
    backend({ [`GET /documents/${DOC}/findings`]: () => json(200, [agent()]) });
    const [f] = await listBackendFindings(DOC);
    expect(f).toMatchObject({
      findingId: F1, number: "01", source: "pipeline", layer: 2, severity: "critical", clauseReference: "Clause 8",
      ruleApplied: "NDA_NON_COMPETE_VOID", citation: "Indian Contract Act, 1872, s. 27", disposition: "pending",
      overrideNote: null, resolvedAt: null,
    });
  });

  it("maps an advocate-added finding with no layer or citation made up for it, already decided", async () => {
    backend({ [`GET /documents/${DOC}/findings`]: () => json(200, [advocate()]) });
    const [f] = await listBackendFindings(DOC);
    expect(f).toMatchObject({ findingId: F2, source: "advocate", disposition: "confirmed", citation: "", ruleApplied: "", overrideNote: null });
    expect(f.resolvedAt).toBe("2026-10-19T05:00:00Z");
  });

  it("numbers by place in the list, and keeps the override reason only on an overridden finding", async () => {
    backend({
      [`GET /documents/${DOC}/findings`]: () => json(200, [
        agent({ status: "overridden", advocate_notes: " Fine for this deal. " }),
        agent({ finding_id: F3, id: F3, status: "confirmed", advocate_notes: "noted" }),
      ]),
    });
    const [a, b] = await listBackendFindings(DOC);
    expect([a.number, b.number]).toEqual(["01", "02"]);
    expect(a.overrideNote).toBe("Fine for this deal.");
    expect(b.overrideNote).toBeNull();
  });

  it("says Whole document for a finding with no clause reference", async () => {
    backend({ [`GET /documents/${DOC}/findings`]: () => json(200, [agent({ clause_reference: null })]) });
    expect((await listBackendFindings(DOC))[0].clauseReference).toBe("Whole document");
  });

  it("ignores fields it does not know, such as the deprecated id alias", async () => {
    backend({ [`GET /documents/${DOC}/findings`]: () => json(200, [agent({ id: "not-even-a-uuid", brand_new: 1 })]) });
    await expect(listBackendFindings(DOC)).resolves.toHaveLength(1);
  });

  it.each([
    ["an unknown layer", agent({ layer: "NOT_A_LAYER" })],
    ["no layer on an agent finding", agent({ layer: null })],
    ["no citation on an agent finding", agent({ citation: null })],
    ["a blank citation on an agent finding", agent({ citation: "  " })],
    ["an empty description", agent({ description: " " })],
    ["an unknown severity", agent({ severity: "urgent" })],
    ["an unknown origin", { ...agent(), origin: "robot" }],
  ])("refuses the whole list over %s, never a silent skip", async (_name, bad) => {
    backend({ [`GET /documents/${DOC}/findings`]: () => json(200, [agent({ finding_id: F3, id: F3 }), bad]) });
    await expect(listBackendFindings(DOC)).rejects.toMatchObject({ code: "bad_reply" });
  });

  it("passes the backend's refusal through as a typed error", async () => {
    backend({ [`GET /documents/${DOC}/findings`]: () => json(404, { detail: "Document not found" }) });
    await expect(listBackendFindings(DOC)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("the client's findings from the backend", () => {
  it("maps confirmed and added findings as settled, with no layer or rule carried over", async () => {
    backend({
      [`GET /documents/${DOC}/client-findings`]: () => json(200, [clientRow(), clientRow({ finding_id: F2, id: F2, origin: "advocate", status: "added", citation: null, citation_type: null })]),
    });
    const [a, b] = await listBackendClientFindings(DOC);
    expect(a).toMatchObject({ source: "pipeline", disposition: "confirmed", ruleApplied: "", overrideNote: null, citation: "Indian Contract Act, 1872, s. 27" });
    expect(b).toMatchObject({ source: "advocate", disposition: "confirmed", citation: "" });
  });

  it("reaches the client screens only through the allowlist: no layer, rule, notes or ids of the advocate", async () => {
    backend({
      [`GET /documents/${DOC}/client-findings`]: () => json(200, [clientRow(), clientRow({ finding_id: F2, id: F2, origin: "advocate", status: "added", citation: null })]),
    });
    const findings = await listBackendClientFindings(DOC);
    const settled = { ...toContractDocument(docRow({ state: "lawyer_approved" })), findings };
    const shaped = shapeClientFindings(settled);
    expect(shaped).toHaveLength(2);
    for (const s of shaped) {
      expect(Object.keys(s).sort()).toEqual(["clauseReference", "clauseText", "detail", "number", "request"]);
      expect(Object.keys(s.detail ?? {}).sort()).toEqual(expect.arrayContaining(["citation", "description", "disposition", "severity"]));
      expect(JSON.stringify(s)).not.toMatch(/NDA_|STATUTORY|adjudicat|advocate_notes|ruleApplied|layer/);
    }
    expect(shaped.map((s) => s.detail?.advocateAdded)).toEqual([undefined, true]);
  });

  it("refuses the whole list when one finding cannot be read", async () => {
    backend({ [`GET /documents/${DOC}/client-findings`]: () => json(200, [clientRow(), clientRow({ status: "pending" })]) });
    await expect(listBackendClientFindings(DOC)).rejects.toMatchObject({ code: "bad_reply" });
  });
});

describe("the advocate's writes", () => {
  it("confirms and overrides with the backend's own body", async () => {
    const calls = backend({
      [`POST /findings/${F1}/adjudicate`]: () => json(200, agent({ status: "confirmed" })),
    });
    await adjudicateBackendFinding(F1, { action: "confirm" });
    await adjudicateBackendFinding(F1, { action: "override", notes: "Not applicable here." });
    expect(calls.map((c) => c.body)).toEqual([{ action: "confirm" }, { action: "override", notes: "Not applicable here." }]);
  });

  it("adds a finding with no layer and no citation in the body", async () => {
    const calls = backend({ [`POST /documents/${DOC}/findings`]: () => json(201, advocate()) });
    await addBackendFinding(DOC, { severity: "medium", description: "  No notice period. ", clauseReference: " Clause 5 " });
    expect(calls[0].body).toEqual({ severity: "medium", description: "No notice period.", clause_reference: "Clause 5" });
    await addBackendFinding(DOC, { severity: "low", description: "x", clauseReference: "  " });
    expect(calls[1].body).toMatchObject({ clause_reference: null });
  });

  it("signs off by moving the document to lawyer_approved", async () => {
    const calls = backend({ [`POST /documents/${DOC}/transition`]: () => json(200, docRow({ state: "lawyer_approved" })) });
    await signOffBackendDocument(DOC);
    expect(calls[0].body).toEqual({ to_state: "lawyer_approved" });
  });

  it("names a refusal as a typed error without putting the server's words in the message", async () => {
    backend({ [`POST /documents/${DOC}/transition`]: () => json(409, { detail: "2 high/critical finding(s) still need your decision before sign-off" }) });
    const err = await signOffBackendDocument(DOC).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("conflict");
    expect(err.message).not.toMatch(/high\/critical/);
  });
});

describe("whose claim it is", () => {
  const held = (id: string) => toContractDocument(docRow({ assigned_lawyer_id: id }));

  it("shows the signed-in advocate's own claim as the screens' current advocate", () => {
    expect(asViewedBy(held(ME), ME).advocate?.id).toBe(CURRENT_ADVOCATE.id);
  });

  it("leaves another advocate's claim as theirs, so it still reads as held by someone else", () => {
    expect(asViewedBy(held(OTHER), ME).advocate?.id).toBe(OTHER);
  });

  it("changes nothing with no viewer, or on a document nobody holds", () => {
    expect(asViewedBy(held(ME), null).advocate?.id).toBe(ME);
    const free = toContractDocument(docRow({ assigned_lawyer_id: null }));
    expect(asViewedBy(free, ME)).toBe(free);
  });
});

describe("the document API on the real backend", () => {
  const review = (extra: Routes = {}): Routes => ({
    [`GET /documents/${DOC}`]: () => json(200, docRow()),
    [`GET /documents/${DOC}/findings`]: () => json(200, [agent(), advocate()]),
    ...extra,
  });

  it("gives the advocate the document with its findings, held by the current advocate", async () => {
    backend(review());
    const doc = await getDocumentForReview(DOC);
    expect(doc?.findings.map((f) => f.findingId)).toEqual([F1, F2]);
    expect(doc?.advocate?.id).toBe(CURRENT_ADVOCATE.id);
  });

  it("is null for a document the advocate cannot see", async () => {
    backend({ [`GET /documents/${DOC}`]: () => json(404, { detail: "Document not found" }) });
    await expect(getDocumentForReview(DOC)).resolves.toBeNull();
  });

  it("claims, then returns the document with its findings", async () => {
    const calls = backend(review({ [`POST /queue/${DOC}/claim`]: () => json(200, docRow()) }));
    const doc = await claimDocument(DOC, CURRENT_ADVOCATE, { noConflictWithEitherParty: true });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([`POST /queue/${DOC}/claim`, `GET /documents/${DOC}`, `GET /documents/${DOC}/findings`]);
    expect(doc.findings).toHaveLength(2);
  });

  it("confirms a finding, then rereads the record", async () => {
    const calls = backend(review({ [`POST /findings/${F1}/adjudicate`]: () => json(200, agent({ status: "confirmed" })) }));
    const doc = await updateFinding(DOC, F1, { disposition: "confirmed", overrideNote: null }, CURRENT_ADVOCATE.id);
    expect(calls[0]).toMatchObject({ method: "POST", path: `/findings/${F1}/adjudicate`, body: { action: "confirm" } });
    expect(doc.findings).toHaveLength(2);
  });

  it("overrides with its reason, and refuses an override with none before asking the backend", async () => {
    const calls = backend(review({ [`POST /findings/${F1}/adjudicate`]: () => json(200, agent({ status: "overridden" })) }));
    await updateFinding(DOC, F1, { disposition: "overridden", overrideNote: " Not applicable. " }, CURRENT_ADVOCATE.id);
    expect(calls[0].body).toEqual({ action: "override", notes: "Not applicable." });
    const before = calls.length;
    await expect(updateFinding(DOC, F1, { disposition: "overridden", overrideNote: "  " }, CURRENT_ADVOCATE.id)).rejects.toThrow(/needs a reason/);
    expect(calls).toHaveLength(before);
  });

  it("does not pretend a decision can be taken back", async () => {
    const calls = backend(review());
    await expect(updateFinding(DOC, F1, { disposition: "pending", overrideNote: null }, CURRENT_ADVOCATE.id)).rejects.toThrow(/cannot be reopened/);
    expect(calls).toHaveLength(0);
  });

  it("adds a finding without sending any layer, rule or citation", async () => {
    const calls = backend(review({ [`POST /documents/${DOC}/findings`]: () => json(201, advocate()) }));
    await addFinding(DOC, {
      findingId: "manual-1", source: "advocate", layer: 6, severity: "medium", clauseReference: "Clause 5", clauseText: "",
      description: "No notice period.", ruleApplied: "MANUAL", remedySuggested: "stub text", citation: "made up",
      disposition: "pending", overrideNote: null, resolvedAt: null, changeRequest: null,
    }, CURRENT_ADVOCATE.id);
    expect(calls[0].body).toEqual({ severity: "medium", description: "No notice period.", clause_reference: "Clause 5" });
  });

  it("signs off, then rereads the settled record", async () => {
    let state = "pending_lawyer_review";
    const calls = backend(review({
      [`GET /documents/${DOC}`]: () => json(200, docRow({ state })),
      [`POST /documents/${DOC}/transition`]: () => {
        state = "lawyer_approved";
        return json(200, docRow({ state }));
      },
    }));
    const doc = await signOffDocument(DOC, CURRENT_ADVOCATE.id);
    expect(calls[0].body).toEqual({ to_state: "lawyer_approved" });
    expect(doc.status).toBe("settled");
    expect(doc.findings).toHaveLength(2);
  });

  it("gives a client the findings only once the document is signed off", async () => {
    const calls = backend({ [`GET /documents/${DOC}`]: () => json(200, docRow({ state: "pending_lawyer_review", assigned_lawyer_id: null })) });
    const doc = await getDocument(DOC);
    expect(doc?.findings).toEqual([]);
    expect(calls.map((c) => c.path)).toEqual([`/documents/${DOC}`]); // the client route is not even asked
  });

  it("reads the client findings of a signed-off document", async () => {
    backend({
      [`GET /documents/${DOC}`]: () => json(200, docRow({ state: "lawyer_approved" })),
      [`GET /documents/${DOC}/client-findings`]: () => json(200, [clientRow()]),
    });
    expect((await getDocument(DOC))?.findings.map((f) => f.findingId)).toEqual([F1]);
  });

  it("treats a forbidden client route as no findings, but any other failure as a failure", async () => {
    const settled = () => json(200, docRow({ state: "lawyer_approved" }));
    backend({ [`GET /documents/${DOC}`]: settled, [`GET /documents/${DOC}/client-findings`]: () => json(403, { detail: "no" }) });
    expect((await getDocument(DOC))?.findings).toEqual([]);
    backend({ [`GET /documents/${DOC}`]: settled, [`GET /documents/${DOC}/client-findings`]: () => json(500, { detail: "boom" }) });
    await expect(getDocument(DOC)).rejects.toMatchObject({ code: "server" });
  });
});
