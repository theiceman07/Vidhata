import { afterEach, describe, expect, it, vi } from "vitest";
import { shapeClientDocument } from "@/lib/api/client/shape-document";
import { summaryResultFor } from "@/lib/api/summaries";
import { answerQuestion } from "@/lib/chat/answer";
import type { ChatSource } from "@/lib/chat/generate";
import { QUESTIONS } from "@/lib/chat/questions.fixtures";
import { chatReplySchema } from "@/lib/contracts";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { FAILURE_COPY } from "@/lib/net/failure";
import {
  CHAT_MAX_LENGTH,
  CHAT_TIMEOUT_MS,
  ChatError,
  MAX_QUESTION_LENGTH,
  askDocumentQuestion,
  httpTransport,
  mockTransport,
  toWireReply,
  unavailableTransport,
} from "./chat";

const settled = mockDocuments.filter((d) => d.status === "settled" || d.status === "executed")[0];
const client = shapeClientDocument(settled);
const read = summaryResultFor(settled);
const source: ChatSource = {
  title: client.title,
  clauses: client.clauses,
  summary: read.state === "ready" ? read.summary : null,
  settlementNotes: [],
};
const ask = (question: string, transport = mockTransport(source, { delay: false })) =>
  askDocumentQuestion({ documentId: "doc-1", question }, transport);

describe("every reply the local agent can give is a valid C1 reply", () => {
  it("holds for the whole labelled question set", () => {
    for (const { text } of QUESTIONS) {
      expect(() => toWireReply(answerQuestion(text, source)), text).not.toThrow();
    }
  });
  it("maps the agent's five outcomes onto answered, refused and escalated", () => {
    const status = (q: string) => toWireReply(answerQuestion(q, source)).status;
    expect(status(`What does clause ${client.clauses[0].number} say?`)).toBe("answered");
    expect(status("Should I sue them?")).toBe("escalated");
    expect(status("asdf qwer")).toBe("refused");
  });
});

describe("asking a question", () => {
  it("returns a cited answer for a question about a clause", async () => {
    const first = client.clauses[0];
    const answer = await ask(`What does clause ${first.number} say?`);
    expect(answer.status).toBe("answered");
    expect(answer.text).not.toBe("");
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations[0].quote).not.toBe("");
  });
  it("escalates a question that asks for advice, with no answer text of the agent's own to show", async () => {
    const answer = await ask("Should I sue them?");
    expect(answer.status).toBe("escalated");
    expect(answer.citations).toEqual([]);
  });
  it("refuses an unclear question without citations", async () => {
    const answer = await ask("asdf qwer");
    expect(answer.status).toBe("refused");
    expect(answer.citations).toEqual([]);
  });
  it("refuses an empty or oversize question before asking anything", async () => {
    const transport = vi.fn();
    await expect(ask("   ", transport)).rejects.toBeInstanceOf(ChatError);
    await expect(ask("x".repeat(MAX_QUESTION_LENGTH + 1), transport)).rejects.toBeInstanceOf(ChatError);
    expect(transport).not.toHaveBeenCalled();
  });
  it("sends a C1 request", async () => {
    const transport = vi.fn(async () => chatReplySchema.parse({ status: "refused", reason: "x" }));
    await askDocumentQuestion({ documentId: "doc-1", question: " What is clause 4? " }, transport);
    expect(transport).toHaveBeenCalledWith({ document_id: "doc-1", question: "What is clause 4?", language: "en" });
  });
});

describe("when the reply cannot be trusted", () => {
  const respond = (body: unknown) => async () => body;
  it.each([
    ["a refusal that carries an answer", { status: "refused", answer: "partial", reason: "x", citations: [] }],
    ["an escalation that carries an answer", { status: "escalated", answer: "partial", reason: "x" }],
    ["an answer with no citation", { status: "answered", answer: "Forty-five days." }],
    ["a status C1 does not have", { status: "maybe", reason: "x" }],
    ["something that is not a reply at all", "<html>502</html>"],
  ])("never shows %s", async (_name, body) => {
    await expect(ask("What is clause 4?", respond(body))).rejects.toThrow(/could not be read/);
  });
  it("says so plainly when the transport fails", async () => {
    const down = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(ask("What is clause 4?", down)).rejects.toThrow(/Could not reach the assistant/);
    await expect(ask("What is clause 4?", unavailableTransport)).rejects.toThrow(/not ready/);
  });
});

describe("httpTransport", () => {
  const request = { document_id: "doc-1", question: "What is clause 4?", language: "en" };
  it("posts the C1 request with the user's token", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "refused", reason: "x" }), { status: 200 }));
    const out = await httpTransport({ apiBase: "https://api.test", token: "tok", fetchImpl: fetchImpl as unknown as typeof fetch })(request);
    expect(out).toEqual({ status: "refused", reason: "x" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/agents/chat");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual(request);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("does not cut a request off before its deadline", async () => {
    vi.useFakeTimers();
    const slow = (_url: string, init: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
        setTimeout(() => resolve(new Response(JSON.stringify({ status: "refused", reason: "x" }))), 29_000);
      });
    const pending = transportWith(slow)(request);
    await vi.advanceTimersByTimeAsync(29_000);
    expect(await pending).toEqual({ status: "refused", reason: "x" });
  });
  const transportWith = (fetchImpl: unknown, timeoutMs?: number) =>
    httpTransport({ apiBase: "https://api.test", token: "t", timeoutMs, fetchImpl: fetchImpl as typeof fetch });
  const failWith = (fetchImpl: unknown, timeoutMs?: number) =>
    askDocumentQuestion({ documentId: "doc-1", question: "What is clause 4?" }, transportWith(fetchImpl, timeoutMs)).catch((e) => e);

  it.each([
    [401, "unauthorized"],
    [403, "unauthorized"],
    [413, "too_large"],
    [404, "client"],
    [422, "client"],
    [500, "server"],
    [503, "server"],
  ] as const)("a %i is told in fixed words for %s, never in the server's", async (status, kind) => {
    const err = await failWith(async () => new Response(JSON.stringify({ detail: "Traceback: psycopg2 at /srv/app.py" }), { status }));
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toBe(FAILURE_COPY[kind]);
    expect(err.kind).toBe(kind);
    expect(err.message).not.toMatch(/psycopg2|Traceback/);
    expect(err.detail).toBe("Traceback: psycopg2 at /srv/app.py"); // kept for debugging, not shown
  });
  it("says the connection failed when the request throws", async () => {
    const err = await failWith(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(err.message).toBe(FAILURE_COPY.network);
    expect(err.kind).toBe("network");
  });
  it("gives every call a deadline of about 30 seconds", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "refused", reason: "x" })));
    await transportWith(fetchImpl)({ document_id: "doc-1", question: "q", language: "en" });
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(CHAT_TIMEOUT_MS).toBe(30_000);
  });
  it("gives up on a request that never answers, so the question can be put again", async () => {
    const hangs = (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
      });
    vi.useFakeTimers();
    const pending = failWith(hangs, 20);
    await vi.advanceTimersByTimeAsync(20);
    const err = await pending;
    expect(err).toBeInstanceOf(ChatError);
    expect(err.message).toBe(FAILURE_COPY.timeout);
    expect(err.kind).toBe("timeout");
  });
  it("gives up on a reply whose body stalls", async () => {
    const stalls = async (_url: string, init: RequestInit) =>
      ({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener("abort", () => reject(init.signal!.reason));
          }),
      }) as unknown as Response;
    vi.useFakeTimers();
    const pending = failWith(stalls, 20);
    await vi.advanceTimersByTimeAsync(20);
    const err = await pending;
    expect(err.kind).toBe("timeout");
  });
  it("does not trust a 200 whose body is not JSON", async () => {
    const err = await failWith(async () => new Response("<html>ok</html>", { status: 200 }));
    expect(err.message).toMatch(/could not be read/);
  });
});

describe("the chat screen's own length limit", () => {
  it("is 1000, and never above what ask() enforces, so the screen cannot allow what ask() refuses", () => {
    expect(CHAT_MAX_LENGTH).toBe(1000);
    expect(CHAT_MAX_LENGTH).toBeLessThanOrEqual(MAX_QUESTION_LENGTH);
  });
});
