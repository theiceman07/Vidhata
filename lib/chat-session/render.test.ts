import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "@/components/domain/chat-message";
import { ChatPending, ChatSendError } from "@/components/domain/chat-status";
import { DocumentAgent } from "@/components/document/document-agent";
import { shapeClientDocument } from "@/lib/api/client/shape-document";
import { mockDocuments } from "@/lib/mock/documents.mock";
import { scrollBehavior } from "@/lib/motion";
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
    expect(out).not.toContain("title=");
    expect(out).not.toContain("Not something this document answers");
  });
  it("puts what it quotes in a disclosure anyone can open, not in a tooltip", () => {
    const out = html(m);
    expect(out).toContain("<details");
    expect(out).toContain("<summary");
    expect(out).toContain("What it quotes");
    expect(out).toContain("due within 45 days");
    expect(out).toContain("interest at 1%");
  });
  it("offers no disclosure when there is nothing quoted", () => {
    const out = html(agent({ status: "answered", citedClauseReference: "Clause 7.2" }));
    expect(out).not.toContain("<details");
  });
  it("keeps two citations to one clause apart", () => {
    const out = html(
      agent({
        status: "answered",
        citations: [
          { clauseReference: "Clause 4", quote: "first span" },
          { clauseReference: "Clause 4", quote: "second span" },
        ],
      }),
    );
    expect(out).toContain("first span");
    expect(out).toContain("second span");
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
  it("says that the agent is reading the document, leaving the announcing to the thread's log", () => {
    const out = renderToStaticMarkup(createElement(ChatPending));
    expect(out).not.toContain('role="status"');
    expect(out).not.toContain("aria-live");
    expect(out).toContain("Reading the settled document");
  });
  it("states the failure plainly and offers to try again", () => {
    const out = renderToStaticMarkup(createElement(ChatSendError, { message: "Could not reach the assistant.", onRetry: () => {} }));
    expect(out).toContain('role="alert"');
    expect(out).toContain("Could not reach the assistant.");
    expect(out).toContain("Try again");
  });
});

describe("the docked agent's thread", () => {
  const settled = mockDocuments.filter((d) => d.status === "settled" || d.status === "executed")[0];
  const doc = shapeClientDocument(settled);
  const out = renderToStaticMarkup(createElement(DocumentAgent, { doc, onCite: () => {} }));

  it("is a persistent polite log with a name, and can be scrolled from the keyboard", () => {
    expect(out).toContain('role="log"');
    expect(out).toContain('aria-live="polite"');
    expect(out).toContain('aria-label="Conversation about this document"');
    expect(out).toContain('tabindex="0"');
  });
  it("has its input and a send button that is off until there is a question", () => {
    expect(out).toContain('id="agent-input"');
    expect(out).toMatch(/<button[^>]*aria-label="Send"[^>]*disabled/);
    expect(out).toContain('maxLength="2000"');
  });
});

describe("scrollBehavior", () => {
  const media = (matches: boolean) => ({ matchMedia: () => ({ matches }) as MediaQueryList });
  it("is smooth unless the reader asked for reduced motion", () => {
    expect(scrollBehavior(media(false))).toBe("smooth");
    expect(scrollBehavior(media(true))).toBe("auto");
  });
  it("is smooth where there is no window to ask", () => {
    expect(scrollBehavior(undefined)).toBe("smooth");
  });
});
