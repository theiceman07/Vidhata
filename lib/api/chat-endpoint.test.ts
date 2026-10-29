import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth/supabaseClient", () => ({ getSupabaseClient: () => ({ auth: { getSession } }) }));

import { ChatMessage } from "@/components/domain/chat-message";
import { ChatPending } from "@/components/domain/chat-status";
import { toContractDocument } from "@/lib/api/backend-documents";
import {
  CHAT_INVALID_QUESTION,
  CHAT_SOMETHING_WRONG,
  ChatError,
  askDocumentChat,
} from "@/lib/api/chat";
import { chatBackendEnabled } from "@/lib/api/source";
import { CHAT_OPEN_STATES, chatOpenForState } from "@/lib/chatAccess";
import { beginAsk, completeAsk, initialThread } from "@/lib/chat-session/thread";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

/**
 * The chat endpoint (POST /documents/{id}/chat) as Tejaswi's stub answers it, one test per
 * rendering rule agreed for C9. Fixtures mirror backend/app/agents/conversational/stub_router.py.
 */

const DOC = "11111111-1111-4111-8111-111111111111";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchOf = (...replies: (Response | Error)[]) => {
  const fn = vi.fn();
  for (const r of replies) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  return fn as unknown as typeof fetch & ReturnType<typeof vi.fn>;
};

const reply = (over: Record<string, unknown>) => ({
  turn_id: "44444444-4444-4444-8444-444444444444",
  document_id: DOC,
  citations: [],
  reason: null,
  retrieval_score: null,
  escalation_id: null,
  ...over,
});
const ANSWERED = reply({
  status: "answered",
  answer: "The term of this agreement is five years from the effective date.",
  retrieval_score: 0.66,
  citations: [
    { source: "document", chunk_id: "stub:9", clause_number: "9", heading: "Term", snippet: "The Term of this agreement is Five (5) years." },
    { source: "document", chunk_id: "stub:h", clause_number: null, heading: "Definitions", snippet: "Words used in this agreement." },
    { source: "document", chunk_id: "stub:s", clause_number: null, heading: null, snippet: "For the term and Ten (10) years thereafter." },
    { source: "lawyer_note", chunk_id: "stub:note:0", clause_number: null, heading: "Lawyer note", snippet: "Sample advocate note: acceptable." },
  ],
});
const REFUSED = reply({
  status: "refused",
  answer: "I could not find that in this document.",
  reason: "low_retrieval_score",
  retrieval_score: 0.21,
});
const ESCALATED = reply({
  status: "escalated",
  answer: "Your question has been passed to your advocate.",
  reason: "advice_request",
  escalation_id: "55555555-5555-4555-8555-555555555555",
});
const UNRECORDED = reply({
  status: "escalated",
  answer: "This needs your advocate, but it could not be recorded just now.",
  reason: "advice_request",
});

const ask = (f: typeof fetch, question = "stub:answered") => askDocumentChat({ documentId: DOC, question }, f);

/** What the thread shows for one reply: the screen's own rendering, after the thread takes it. */
async function shown(body: unknown): Promise<{ message: ChatMessageType; html: string }> {
  const answer = await ask(fetchOf(json(200, body)));
  const state = completeAsk(beginAsk(initialThread(), "q", "u1"), answer, "a1");
  const message = state.messages[state.messages.length - 1];
  return { message, html: renderToStaticMarkup(createElement(ChatMessage, { message })) };
}

beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: "test-token-not-real" } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("askDocumentChat", () => {
  it("posts the question to the document's chat endpoint with the same Bearer token as other calls", async () => {
    const f = fetchOf(json(200, ANSWERED));
    await ask(f, "  How long does it last? ");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://localhost:8000/documents/${DOC}/chat`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-token-not-real");
    expect(JSON.parse(init.body)).toEqual({ question: "How long does it last?", language: "en" });
  });
});

describe("rendering rules", () => {
  it("answered: shows the answer with clickable citations, number and heading together, heading alone, or the snippet alone", async () => {
    const { message, html } = await shown(ANSWERED);
    expect(html).toContain("The term of this agreement is five years");
    // Number and heading together, and it can be followed.
    expect(html).toMatch(/<button[^>]*>.*Clause 9 · Term<\/button>/);
    // No number: the heading alone, as a label.
    expect(html).toContain("Definitions");
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*Definitions/);
    // Neither: only the snippet.
    expect(html).toContain("For the term and Ten (10) years thereafter.");
    expect(message.citations?.find((c) => c.quote.startsWith("For the term"))).toMatchObject({ clauseReference: "", heading: undefined });
  });

  it("refused: shows the answer as returned in the neutral style, never the reason", async () => {
    const { message, html } = await shown(REFUSED);
    expect(message.status).toBe("refused");
    expect(html).toContain("I could not find that in this document.");
    expect(html).toContain("bg-canvas");
    expect(html).not.toContain("low_retrieval_score");
    // The screen's own label is not added to a reply shown as returned.
    expect(html).not.toContain("Not something this document answers");
  });

  it("escalated: shows the answer as returned, with a tick only when an escalation id came back", async () => {
    const recorded = await shown(ESCALATED);
    expect(recorded.html).toContain("Your question has been passed to your advocate.");
    expect(recorded.html).toContain("data-escalation-recorded");
    expect(recorded.html).not.toContain("advice_request");
    // The screen's own referral is not used: the reply carries its own text.
    expect(recorded.message.isEscalation).toBe(false);

    const unrecorded = await shown(UNRECORDED);
    expect(unrecorded.html).toContain("could not be recorded just now");
    expect(unrecorded.html).not.toContain("data-escalation-recorded");
  });

  it("lawyer_note: a citation from an advocate's note is never rendered for the client", async () => {
    const { message, html } = await shown(ANSWERED);
    expect(message.citations).toHaveLength(3);
    expect(html).not.toContain("Lawyer note");
    expect(html).not.toContain("Sample advocate note");
  });

  it("HTTP 422: treated as an invalid question", async () => {
    const err = await ask(fetchOf(json(422, { detail: [{ loc: ["body", "question"], msg: "too long" }] }))).catch((e) => e);
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toBe(CHAT_INVALID_QUESTION);
  });

  it("network error: one generic message, nothing the wire said", async () => {
    const err = await ask(fetchOf(new TypeError("Failed to fetch"))).catch((e) => e);
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toBe(CHAT_SOMETHING_WRONG);
    // A server error and an unreadable reply read the same.
    expect((await ask(fetchOf(json(500, { detail: "boom" }))).catch((e) => e)).message).toBe(CHAT_SOMETHING_WRONG);
    expect((await ask(fetchOf(json(200, { status: "answered" }))).catch((e) => e)).message).toBe(CHAT_SOMETHING_WRONG);
  });

  it("waiting: the thread is pending while a reply is out, and shows a loading state", () => {
    const state = beginAsk(initialThread(), "stub:answered", "u1");
    expect(state.pending).toBe(true);
    expect(renderToStaticMarkup(createElement(ChatPending))).toContain("Reading the settled document");
  });
});

describe("the flag and the chat-open rule", () => {
  it("NEXT_PUBLIC_VIDHATA_CHAT is off unless set to 1", () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_CHAT", "");
    expect(chatBackendEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_CHAT", "1");
    expect(chatBackendEnabled()).toBe(true);
  });

  it("chat opens for lawyer_approved or delivered, and those are exactly the states read as settled", () => {
    expect(CHAT_OPEN_STATES).toEqual(["lawyer_approved", "delivered"]);
    const states = ["drafted", "under_ai_review", "pending_lawyer_review", "lawyer_commented", "revision_in_progress", "lawyer_approved", "delivered"];
    for (const state of states) {
      const doc = toContractDocument({
        id: DOC, org_id: DOC, doc_type: "nda", state, state_of_execution: null, transaction_value: null,
        triage_tier: null, assigned_lawyer_id: DOC, created_at: "2026-10-18T08:00:00Z", updated_at: "2026-10-18T09:00:00Z",
      } as Parameters<typeof toContractDocument>[0]);
      expect(doc.status === "settled", state).toBe(chatOpenForState(state));
    }
  });

  it("the fixed copy added for the endpoint has no em dash", () => {
    for (const copy of [CHAT_INVALID_QUESTION, CHAT_SOMETHING_WRONG]) expect(copy).not.toContain("—");
  });
});
