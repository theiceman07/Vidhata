import type { ChatAnswer } from "@/lib/api/chat";
import type { ChatMessage } from "@/lib/types";

/**
 * The state of one conversation with the agent, as plain transitions so each can be tested
 * without a screen. A question is in flight (`pending`), or it failed and can be put again
 * (`failed`), and never both. Putting a failed question again does not repeat it in the thread.
 */
export interface ThreadState {
  messages: ChatMessage[];
  pending: boolean;
  failed: { question: string; message: string } | null;
}

let sequence = 0;
export const nextMessageId = (prefix: string): string => `${prefix}-${Date.now()}-${++sequence}`;

export const initialThread = (messages: ChatMessage[] = []): ThreadState => ({
  messages,
  pending: false,
  failed: null,
});

export const canAsk = (state: ThreadState, question: string): boolean => !state.pending && question.trim() !== "";

export function beginAsk(state: ThreadState, question: string, id: string): ThreadState {
  if (!canAsk(state, question)) return state;
  const user: ChatMessage = { id, role: "user", text: question.trim(), citedClauseReference: null, isEscalation: false };
  return { messages: [...state.messages, user], pending: true, failed: null };
}

export function completeAsk(state: ThreadState, answer: ChatAnswer, id: string): ThreadState {
  const agent: ChatMessage = {
    id,
    role: "agent",
    text: answer.text,
    citedClauseReference: answer.citations[0]?.clauseReference || null,
    // A reply shown as returned carries its own escalation text, so the screen adds no referral.
    isEscalation: answer.status === "escalated" && !answer.asReturned,
    status: answer.status,
    citations: answer.citations,
    ...(answer.asReturned ? { asReturned: true, escalationRecorded: Boolean(answer.escalationRecorded) } : {}),
  };
  return { messages: [...state.messages, agent], pending: false, failed: null };
}

export function failAsk(state: ThreadState, question: string, message: string): ThreadState {
  return { ...state, pending: false, failed: { question, message } };
}

/** Put the failed question again. The user's message is already in the thread, so none is added. */
export function beginRetry(state: ThreadState): ThreadState {
  if (state.pending || !state.failed) return state;
  return { ...state, pending: true, failed: null };
}
