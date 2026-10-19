import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({ getSupabaseClient: () => ({ auth: { getSession } }) }));

import { ChatError, askDocumentQuestion, backendChatTransport } from "@/lib/api/chat";

const DOC = "11111111-1111-4111-8111-111111111111";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchOf = (...replies: Response[]) => {
  const fn = vi.fn();
  for (const r of replies) fn.mockResolvedValueOnce(r);
  return fn as unknown as typeof fetch & ReturnType<typeof vi.fn>;
};
const ask = (f: typeof fetch) => askDocumentQuestion({ documentId: DOC, question: "  How long does it last? " }, backendChatTransport(f));

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token-not-real" } } });
});

describe("backendChatTransport", () => {
  it("posts the C1 request to the document's chat endpoint with the Bearer token", async () => {
    const f = fetchOf(json(200, { status: "refused", answer: null, citations: [], reason: "Not covered.", language: "en" }));
    await ask(f);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://localhost:8000/documents/${DOC}/chat`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-token-not-real");
    expect(JSON.parse(init.body)).toEqual({ document_id: DOC, question: "How long does it last?", language: "en" });
  });

  it("returns an answer with its citations", async () => {
    const f = fetchOf(json(200, {
      status: "answered", answer: "Six months.", citations: [{ clause_reference: "Clause 6", quote: "This Agreement continues for the Term." }],
      reason: null, language: "en",
    }));
    await expect(ask(f)).resolves.toEqual({
      status: "answered", text: "Six months.", citations: [{ clauseReference: "Clause 6", quote: "This Agreement continues for the Term." }],
    });
  });

  it.each(["refused", "escalated"] as const)("returns a %s reply with its reason and no citations", async (status) => {
    const f = fetchOf(json(200, { status, answer: null, citations: [], reason: "Ask an advocate.", language: "en" }));
    await expect(ask(f)).resolves.toEqual({ status, text: "Ask an advocate.", citations: [] });
  });

  it("never shows an answer that has no citation", async () => {
    const f = fetchOf(json(200, { status: "answered", answer: "Trust me.", citations: [], reason: null, language: "en" }));
    await expect(ask(f)).rejects.toThrow("The reply could not be read. Try again.");
  });

  it("never shows a refusal that carries an answer", async () => {
    const f = fetchOf(json(200, { status: "refused", answer: "Partly.", citations: [], reason: "No.", language: "en" }));
    await expect(ask(f)).rejects.toBeInstanceOf(ChatError);
  });

  it("treats a reply that is not JSON as a reply that cannot be read", async () => {
    const f = fetchOf(new Response("<html>", { status: 200 }));
    await expect(ask(f)).rejects.toThrow("The reply could not be read. Try again.");
  });

  it.each([
    [401, "You are signed out. Sign in again."],
    [404, "That document was not found."],
    [500, "Something went wrong on the server. Try again in a moment."],
  ])("turns HTTP %i into fixed copy, keeping the server's words out of it", async (status, copy) => {
    const err = await ask(fetchOf(json(status, { detail: "the server's own words" }))).catch((e) => e);
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toBe(copy);
    expect(err.message).not.toContain("own words");
  });

  it("makes no request without a session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const f = fetchOf();
    await expect(ask(f)).rejects.toThrow("You are signed out. Sign in again.");
    expect(f).not.toHaveBeenCalled();
  });
});
