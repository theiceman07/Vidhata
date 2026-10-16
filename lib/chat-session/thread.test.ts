import { describe, expect, it } from "vitest";
import type { ChatAnswer } from "@/lib/api/chat";
import type { ChatMessage } from "@/lib/types";
import { beginAsk, beginRetry, canAsk, completeAsk, failAsk, initialThread, nextMessageId } from "./thread";

const welcome: ChatMessage = { id: "welcome", role: "agent", text: "Hi", citedClauseReference: null, isEscalation: false };
const answered: ChatAnswer = {
  status: "answered",
  text: "Payment is due in 45 days.",
  citations: [{ clauseReference: "Clause 4", quote: "due in 45 days" }],
};

describe("a conversation", () => {
  it("puts the question in the thread and waits", () => {
    const s = beginAsk(initialThread([welcome]), "  What is clause 4?  ", "u1");
    expect(s.pending).toBe(true);
    expect(s.messages.map((m) => [m.role, m.text])).toEqual([["agent", "Hi"], ["user", "What is clause 4?"]]);
  });
  it("takes one question at a time, and no empty one", () => {
    const waiting = beginAsk(initialThread(), "first", "u1");
    expect(canAsk(waiting, "second")).toBe(false);
    expect(beginAsk(waiting, "second", "u2")).toBe(waiting);
    expect(canAsk(initialThread(), "   ")).toBe(false);
  });
  it("adds the answer with every clause it rests on", () => {
    const s = completeAsk(beginAsk(initialThread(), "q", "u1"), answered, "a1");
    const last = s.messages[s.messages.length - 1];
    expect(s.pending).toBe(false);
    expect(last).toMatchObject({ role: "agent", status: "answered", citedClauseReference: "Clause 4", isEscalation: false });
    expect(last.citations).toEqual(answered.citations);
  });
  it("marks an escalation so the screen shows the referral", () => {
    const s = completeAsk(beginAsk(initialThread(), "q", "u1"), { status: "escalated", text: "r", citations: [] }, "a1");
    expect(s.messages[s.messages.length - 1]).toMatchObject({ status: "escalated", isEscalation: true, citedClauseReference: null });
  });
  it("keeps the question when it fails, and puts it again without repeating it in the thread", () => {
    const asked = beginAsk(initialThread(), "What is clause 4?", "u1");
    const failed = failAsk(asked, "What is clause 4?", "Could not reach the assistant.");
    expect(failed).toMatchObject({ pending: false, failed: { question: "What is clause 4?", message: "Could not reach the assistant." } });
    expect(failed.messages).toHaveLength(1);
    const again = beginRetry(failed);
    expect(again).toMatchObject({ pending: true, failed: null });
    expect(again.messages).toHaveLength(1);
    expect(completeAsk(again, answered, "a1").messages).toHaveLength(2);
  });
  it("has nothing to put again unless a question failed, and not while one is in flight", () => {
    const idle = initialThread();
    expect(beginRetry(idle)).toBe(idle);
    const waiting = beginAsk(idle, "q", "u1");
    expect(beginRetry(waiting)).toBe(waiting);
  });
  it("gives every message its own id", () => {
    expect(nextMessageId("u")).not.toBe(nextMessageId("u"));
  });
});
