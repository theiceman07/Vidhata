import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "@/components/domain/chat-message";
import { ChatPending, ChatSendError } from "@/components/domain/chat-status";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

// The tests compile JSX the classic way, which looks for React in scope (see clientScreens.test.ts).
(globalThis as { React?: typeof React }).React = React;

/** What the three C1 outcomes, the wait, and a failure look like on the screen. */

const agent = (over: Partial<ChatMessageType>): ChatMessageType => ({
  id: "a1",
  role: "agent",
  text: "Payment is due within 45 days.",
  citedClauseReference: null,
  isEscalation: false,
  ...over,
});
const html = (m: ChatMessageType) => renderToStaticMarkup(createElement(ChatMessage, { message: m }));

describe("an answered reply", () => {
  const m = agent({
    status: "answered",
    citedClauseReference: "Clause 4",
    citations: [
      { clauseReference: "Clause 4", quote: "due within 45 days" },
      { clauseReference: "Clause 9.1", quote: "interest at 1%" },
    ],
  });
  it("shows every clause it rests on under the answer, each one followable", () => {
    const out = html(m);
    expect(out).toContain("Payment is due within 45 days.");
    expect(out).toContain("Clause 4");
    expect(out).toContain("Clause 9.1");
    expect((out.match(/<button/g) ?? []).length).toBe(2);
    expect(out).toContain('title="due within 45 days"');
    expect(out).not.toContain("Not something this document answers");
  });
  it("shows a summary citation as a label, not a link to a clause that does not exist", () => {
    const out = html(agent({ status: "answered", citations: [{ clauseReference: "Summary", quote: "x" }] }));
    expect(out).toContain("Summary");
    expect(out).not.toContain("<button");
  });
});

describe("a refused reply", () => {
  it("is set apart from an answer and carries no citation", () => {
    const out = html(agent({ status: "refused", text: "I could not tell what you are asking." }));
    expect(out).toContain("Not something this document answers");
    expect(out).toContain("I could not tell what you are asking.");
    expect(out).not.toContain("<button");
    expect(out).not.toContain("Clauses this answer rests on");
  });
});

describe("the old message shape still renders", () => {
  it("shows the single cited clause of a message with no status", () => {
    const out = html(agent({ citedClauseReference: "Clause 7.2" }));
    expect(out).toContain("Clause 7.2");
    expect((out.match(/<button/g) ?? []).length).toBe(1);
  });
});

describe("waiting and failing", () => {
  it("announces that the agent is reading the document", () => {
    const out = renderToStaticMarkup(createElement(ChatPending));
    expect(out).toContain('role="status"');
    expect(out).toContain("Reading the settled document");
  });
  it("states the failure plainly and offers to try again", () => {
    const out = renderToStaticMarkup(createElement(ChatSendError, { message: "Could not reach the assistant.", onRetry: () => {} }));
    expect(out).toContain('role="alert"');
    expect(out).toContain("Could not reach the assistant.");
    expect(out).toContain("Try again");
  });
});
