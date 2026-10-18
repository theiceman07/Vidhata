import { chatReplySchema, type ChatReply as WireReply, type ChatRequest as WireRequest } from "@/lib/contracts";
import { answerQuestion, type ChatReply } from "@/lib/chat/answer";
import type { ChatSource } from "@/lib/chat/generate";
import type { ChatAnswerStatus, ChatCitationView } from "@/lib/types";
import { FAILURE_COPY, deadline, kindOfStatus, kindOfThrown, readDetail, type FailureKind } from "@/lib/net/failure";
import { z } from "zod";
import { ApiError, authed, type Fetcher } from "./backend";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { backendDataEnabled } from "./source";

/**
 * The swap boundary for the conversational agent, in the C1 shape (lib/contracts.ts).
 *
 * A transport takes a C1 request and returns whatever came back. Today that is the mock,
 * which runs the local gate, reply and check and dresses the result as a C1 reply. The real
 * one is `httpTransport`, which is not used by any screen yet: it needs a signed-in user's
 * token and the backend's chat endpoint, and the path below is a guess until that exists.
 * Whichever transport is used, `askDocumentQuestion` validates the reply against C1, so a
 * refusal that carries an answer, or an answer with no citation, is never shown.
 */

/** Said in place of the agent's own words when a question asks for advice. The screen shows its own referral. */
const ESCALATION_REASON = "The question asks what to do, not what the document says.";
/** An answer drawn from the summary rather than one clause cites the document as a whole. */
const SUMMARY_REFERENCE = "Summary";

/** `message` is fixed copy that can be shown. `detail` is what the server said, for debugging only. */
export class ChatError extends Error {
  readonly kind?: FailureKind;
  readonly detail?: string;
  constructor(message: string, info: { kind?: FailureKind; detail?: string } = {}) {
    super(message);
    this.name = "ChatError";
    this.kind = info.kind;
    this.detail = info.detail;
  }
}

const failure = (kind: FailureKind, detail?: string) => new ChatError(FAILURE_COPY[kind], { kind, detail });

export type ChatTransport = (request: WireRequest) => Promise<unknown>;

export interface ChatAnswer {
  status: ChatAnswerStatus;
  /** The answer when answered; the reason when refused or escalated. */
  text: string;
  citations: ChatCitationView[];
}

/** The span a mocked answer rests on: the clause as the reply quotes it, else the start of the reply. */
function quoteOf(text: string): string {
  const quoted = /reads: "([^"]+)"/.exec(text);
  return (quoted ? quoted[1] : text).trim().slice(0, 240);
}

/** Dress the local agent's reply as a C1 reply. Throws if the result would break C1. */
export function toWireReply(reply: ChatReply, language = "en"): WireReply {
  if (reply.kind === "escalation") {
    return chatReplySchema.parse({ status: "escalated", reason: ESCALATION_REASON, language });
  }
  if (reply.kind === "answer") {
    return chatReplySchema.parse({
      status: "answered",
      answer: reply.text,
      citations: [{ clause_reference: reply.citedClauseReference ?? SUMMARY_REFERENCE, quote: quoteOf(reply.text) }],
      language,
    });
  }
  // Unclear, not found, or withdrawn by the check: a refusal in the agent's fixed words.
  return chatReplySchema.parse({ status: "refused", reason: reply.text, language });
}

export function fromWireReply(wire: WireReply): ChatAnswer {
  return {
    status: wire.status,
    text: (wire.status === "answered" ? wire.answer : wire.reason) ?? "",
    citations: wire.citations.map((c) => ({ clauseReference: c.clause_reference, quote: c.quote })),
  };
}

/** The local agent behind the C1 boundary. Waits like a network call, and fails on ?fail=1 in preview. */
export function mockTransport(source: ChatSource, options: { delay?: boolean } = {}): ChatTransport {
  return async (request) => {
    if (options.delay !== false) await randomDelay();
    if (shouldSimulateFailure()) throw new MockApiError();
    return toWireReply(answerQuestion(request.question, source), request.language);
  };
}

/**
 * The real backend's chat endpoint (POST /documents/{id}/chat, backend/app/agents/router.py). It
 * answers in the C1 shape, and `askDocumentQuestion` still validates the reply against C1.
 * A failed call becomes a ChatError carrying fixed copy; what the server said stays in `detail`.
 */
export function backendChatTransport(fetchImpl?: Fetcher): ChatTransport {
  return async (request) => {
    try {
      return await authed(
        `/documents/${encodeURIComponent(request.document_id)}/chat`,
        { method: "POST", body: request },
        z.unknown(),
        fetchImpl,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        // A reply the backend sent that is not JSON is handled like any reply that breaks C1.
        if (err.code === "bad_reply") return null;
        throw new ChatError(err.message, { detail: err.detail });
      }
      throw err;
    }
  };
}

/** The transport a screen should use: the real backend when the flag is on, the local agent otherwise. */
export function chatTransport(source: ChatSource): ChatTransport {
  return backendDataEnabled() ? backendChatTransport() : mockTransport(source);
}

/** Used while there is no document to ask about. */
export const unavailableTransport: ChatTransport = async () => {
  throw new ChatError("This document is not ready to answer questions yet.");
};

/** How long the backend has to answer before the question is given up and can be put again. */
export const CHAT_TIMEOUT_MS = 30_000;

/** The backend's chat endpoint. Not used by any screen yet; the path is provisional. */
export function httpTransport(options: {
  apiBase: string;
  token: string;
  path?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): ChatTransport {
  return async (request) => {
    const f = options.fetchImpl ?? fetch;
    // The deadline covers the whole exchange, body included, so a stalled reply cannot hold the thread.
    const limit = deadline(options.timeoutMs ?? CHAT_TIMEOUT_MS);
    const signal = limit.signal;
    try {
      const res = await f(`${options.apiBase}${options.path ?? "/agents/chat"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${options.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal,
      });
      if (!res.ok) throw failure(kindOfStatus(res.status), await readDetail(res));
      return await res.json();
    } catch (err) {
      if (err instanceof ChatError) throw err;
      // A body that is not JSON comes through as a reply that fails C1, so only the wire can fail here.
      if (err instanceof SyntaxError) return null;
      throw failure(kindOfThrown(err), err instanceof Error ? err.message : undefined);
    } finally {
      limit.clear();
    }
  };
}

export const MAX_QUESTION_LENGTH = 2000;

export async function askDocumentQuestion(
  input: { documentId: string; question: string; language?: string },
  transport: ChatTransport,
): Promise<ChatAnswer> {
  const question = input.question.trim();
  if (!question) throw new ChatError("Type a question first.");
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new ChatError(`Keep the question under ${MAX_QUESTION_LENGTH} characters.`);
  }

  let raw: unknown;
  try {
    raw = await transport({ document_id: input.documentId, question, language: input.language ?? "en" });
  } catch (err) {
    if (err instanceof ChatError) throw err;
    if (err instanceof MockApiError) throw new ChatError(err.message);
    throw new ChatError("Could not reach the assistant. Check your connection and try again.");
  }

  const parsed = chatReplySchema.safeParse(raw);
  if (!parsed.success) throw new ChatError("The reply could not be read. Try again.");
  return fromWireReply(parsed.data);
}
