"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import { REVIEW_SUGGESTIONS, getReviewReply } from "@/lib/mock/review-agent.mock";
import type { ContractDocument, ReviewAgentReply } from "@/lib/types";

/**
 * The advocate's companion: a review agent docked beside the draft, the
 * counterpart of the client's document agent.
 *
 * It reads the first pass back to the advocate: what stands before
 * sign-off, each finding with its source, which sources are blocked, what
 * a clause says and what was raised on it. Every answer points at the
 * finding or clause it came from, one click away. It does not decide. AI
 * drafts, advocates decide: asked whether to settle, override or sign
 * off, it sets out the evidence and hands the question back.
 *
 * Replies are mocked (lib/mock/review-agent.mock) from the document's own
 * data until the real agent lands.
 */
export function ReviewAgent({
  doc,
  advocateId,
  onCite,
  onOpenFinding,
}: {
  doc: ContractDocument;
  advocateId: string;
  onCite: (clauseNumber: string) => void;
  onOpenFinding: (findingId: string) => void;
}) {
  const [thread, setThread] = useState<{ id: string; question: string; reply: ReviewAgentReply }[]>([]);
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread]);

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    setThread((prev) => [
      ...prev,
      { id: `q-${Date.now()}`, question, reply: getReviewReply(question, doc, advocateId) },
    ]);
    setInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-6 pt-5">
        <p className="text-meta font-medium text-ink">Review agent</p>
        <span className="rounded-full bg-parchment px-2.5 py-0.5 text-label text-muted-fg">
          Preview
        </span>
      </div>

      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-6">
        {thread.length === 0 ? (
          <div className="flex h-full flex-col justify-center pb-6 pt-10">
            <h2 className="font-display text-[30px] font-medium leading-tight tracking-[-0.015em] text-ink">
              Where should we start?
            </h2>
            <p className="mt-3 text-body text-muted-fg">
              It reads the first pass back to you: the findings, their
              sources and what stands before sign-off. The decisions stay
              yours.
            </p>
            <div className="mt-6 flex flex-col items-start gap-2">
              {REVIEW_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full bg-parchment px-4 py-2 text-meta text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-6 py-6">
            {thread.map(({ id, question, reply }) => (
              <li key={id} className="space-y-4">
                <p className="ml-auto max-w-[85%] rounded-card rounded-br-md bg-parchment px-4 py-3 text-body text-ink">
                  {question}
                </p>

                <div
                  className={cn(
                    reply.decision && "rounded-card border border-caution/30 bg-caution/10 px-4 py-3",
                  )}
                >
                  {reply.decision && (
                    <p className="mb-1 text-meta font-medium text-caution-fg">Your decision</p>
                  )}
                  <p className="whitespace-pre-line text-body leading-relaxed text-ink">
                    {reply.text}
                  </p>
                  {reply.refs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reply.refs.map((ref) => (
                        <button
                          key={ref.label}
                          type="button"
                          onClick={() =>
                            ref.findingId
                              ? onOpenFinding(ref.findingId)
                              : ref.clauseNumber && onCite(ref.clauseNumber)
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1 text-meta text-ink transition-colors hover:border-ink/40"
                        >
                          {ref.label}
                          <Icon name="arrow_forward" size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="group relative m-4 mt-0"
      >
        <div
          aria-hidden
          className="prompt-ring pointer-events-none absolute -inset-[2px] rounded-[22px] opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
        />
        <div className="relative rounded-card border border-ink/15 bg-paper p-2 pl-4 transition-colors group-focus-within:border-transparent">
          <label htmlFor="review-agent-input" className="sr-only">
            Ask about this review
          </label>
          <textarea
            id="review-agent-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="Ask about a finding, a source, a clause"
            className="caret-cycle field-bare block w-full resize-none bg-transparent pt-2 text-body text-ink outline-none placeholder:text-muted-fg"
          />
          <div className="flex items-center justify-between">
            <span className="text-label text-muted-fg">Reads the first pass · you decide</span>
            <button
              type="submit"
              aria-label="Ask"
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
