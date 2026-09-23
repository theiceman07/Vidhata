"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import { getMockReply } from "@/lib/mock/chat.mock";
import type { ChatMessage, ContractDocument } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";

/**
 * The document's companion: a conversational agent docked beside the
 * settled text, the way an assistant sits beside a page in the browser.
 *
 * It explains the settled document and never advises. A question that
 * asks what to do is answered with a referral to the advocate who
 * settled it. The agent itself is still being built; until it lands,
 * replies come from lib/mock/chat.mock, which quotes the fixture text.
 *
 * It fills the height of its pane and keeps its own scroll, so it stays
 * beside the reader however far down the document they go.
 */
export function DocumentAgent({
  doc,
  onCite,
}: {
  doc: ContractDocument;
  /** Carry the document to a clause the agent quoted. */
  onCite: (clauseNumber: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const advocate = doc.advocate?.name ?? "your advocate";

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const question = text.trim();
    if (!question) return;
    const reply = getMockReply(question, doc);
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${now}`, role: "user", text: question, citedClauseReference: null, isEscalation: false },
      {
        id: `a-${now}`,
        role: "agent",
        text: reply.text,
        citedClauseReference: reply.citedClauseReference,
        isEscalation: reply.isEscalation,
      },
    ]);
    setInput("");
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-6 pt-5">
        <p className="text-meta font-medium text-ink">Ask about this document</p>
        <span className="rounded-full bg-parchment px-2.5 py-0.5 text-label text-muted-fg">
          Preview
        </span>
      </div>

      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-6">
        {empty ? (
          <div className="flex h-full flex-col justify-center pb-6 pt-10">
            <h2 className="font-display text-[30px] font-medium leading-tight tracking-[-0.015em] text-ink">
              What would you like to understand?
            </h2>
            <p className="mt-3 text-body text-muted-fg">
              Ask about any clause in the settled text. It explains what the
              document says, and leaves advice to {advocate}.
            </p>
          </div>
        ) : (
          <ol className="space-y-5 py-6">
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-card rounded-br-md bg-parchment px-4 py-3 text-body text-ink">
                    {m.text}
                  </p>
                </li>
              ) : m.isEscalation ? (
                <li key={m.id} className="rounded-card border border-caution/30 bg-caution/10 px-4 py-3">
                  <p className="text-meta font-medium text-caution-fg">This needs an advocate</p>
                  <p className="mt-1 text-body text-ink">
                    That asks what you should do, not what the document says.
                    {" "}{advocate} settled this document and can advise you.
                  </p>
                </li>
              ) : (
                <li key={m.id} className="text-body leading-relaxed text-ink">
                  <p>{m.text}</p>
                  {m.citedClauseReference && (
                    <button
                      type="button"
                      onClick={() => onCite(clauseNumberFromReference(m.citedClauseReference as string))}
                      className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-meta text-ink transition-colors hover:border-ink/40"
                    >
                      {m.citedClauseReference}
                      <Icon name="arrow_forward" size={16} />
                    </button>
                  )}
                </li>
              ),
            )}
          </ol>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="group relative m-4 mt-0"
      >
        <div
          aria-hidden
          className="prompt-ring pointer-events-none absolute -inset-[2px] rounded-[22px] opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
        />
        <div className="relative rounded-card border border-ink/15 bg-paper p-2 pl-4 transition-colors group-focus-within:border-transparent">
          <label htmlFor="agent-input" className="sr-only">
            Ask about this document
          </label>
          <textarea
            id="agent-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about a clause, a term, a date"
            className="caret-cycle field-bare block w-full resize-none bg-transparent pt-2 text-body text-ink outline-none placeholder:text-muted-fg"
          />
          <div className="flex items-center justify-between">
            <span className="text-label text-muted-fg">Explains, never advises</span>
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300",
                input.trim()
                  ? "bg-accent text-accent-fg hover:bg-accent-hover"
                  : "bg-ink/[0.06] text-muted-fg",
              )}
            >
              <Icon name="arrow_upward" size={20} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
