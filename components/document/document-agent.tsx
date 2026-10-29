"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { ChatCitations } from "@/components/domain/chat-message";
import { ChatPending, ChatSendError } from "@/components/domain/chat-status";
import { agentAvailable } from "@/lib/chatAccess";
import { CONSULTATION, PRICE_BASIS } from "@/lib/config/pricing";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  MAX_QUESTION_LENGTH,
  chatTransport,
  unavailableTransport,
} from "@/lib/api/chat";
import { useDocumentChat } from "@/lib/chat-session/useDocumentChat";
import {
  chatSourceOf,
  SUGGESTED_QUESTIONS,
  type ChatDocument,
} from "@/lib/mock/chat.mock";
import { getClientSummary } from "@/lib/api/client/delivery";
import { getClientSettlementNotes } from "@/lib/api/client/settlement-notes";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type {
  ClientDocument,
  ClientSettlementNote,
  SettledSummary,
} from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";

/**
 * The document's companion: a conversational agent docked beside the
 * settled text, the way an assistant sits beside a page in the browser.
 *
 * It explains the settled document and never advises. A question that
 * asks what to do is answered with a referral to the advocate who
 * settled it, an unclear one is asked to be put again, and a reply the
 * check refuses is replaced by a fixed message (lib/chat). The agent
 * itself is still being built; until it lands, replies come from
 * lib/mock/chat.mock, which quotes the settled text, its summary and the
 * advocate's released notes, and nothing else.
 *
 * It fills the height of its pane and keeps its own scroll, so it stays
 * beside the reader however far down the document they go.
 */
export function DocumentAgent({
  doc,
  onCite,
  activeClause = null,
}: {
  doc: ChatDocument & Pick<ClientDocument, "id" | "status" | "signOff">;
  /** Carry the document to a clause the agent quoted. */
  onCite: (clauseNumber: string) => void;
  /** The clause in view. The clause question is offered only with one, so no suggestion ends in a refusal. */
  activeClause?: string | null;
}) {
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [summary, setSummary] = useState<SettledSummary | null>(null);
  const [notes, setNotes] = useState<ClientSettlementNote[]>([]);
  // Questions go through the C1 boundary (lib/api/chat), which waits like a network call and can fail.
  const transport = useMemo(
    () =>
      doc
        ? chatTransport(chatSourceOf(doc, summary, notes))
        : unavailableTransport,
    [doc, summary, notes],
  );
  const chat = useDocumentChat({ documentId: doc.id, transport });
  const messages = chat.messages;
  // Named by the sign-off record, which this agent only ever has: it explains a settled document.
  const advocate = doc.signOff?.advocate ?? "your advocate";

  // The summary is a reading of the settled text, held to its clauses, and what the agent
  // answers an overview question from. Without it the agent still quotes the clauses.
  const available = agentAvailable(doc);
  const docId = doc.id;
  useEffect(() => {
    if (!available) return;
    let live = true;
    // Each is read through the client layer, and either failing leaves the agent answering from
    // the clauses alone, which it can always do.
    Promise.all([
      getClientSummary(MOCK_CLIENT_ORG.id, docId).catch(() => null),
      getClientSettlementNotes(MOCK_CLIENT_ORG.id, docId).catch(
        (): ClientSettlementNote[] => [],
      ),
    ]).then(([summaryRead, released]) => {
      if (!live) return;
      setSummary(
        summaryRead && summaryRead.result.state === "ready"
          ? summaryRead.result.summary
          : null,
      );
      setNotes(released);
    });
    return () => {
      live = false;
    };
  }, [available, docId]);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: scrollBehavior(),
    });
  }, [messages, chat.pending, chat.failed]);

  function send(text: string) {
    // Taken only if no other question is still being answered; the box is kept otherwise.
    if (chat.send(text)) setInput("");
  }

  // Before sign-off there is no settled document to explain. The pages do not mount
  // this then, and it refuses as well, so a new place to put it cannot show it early.
  if (!available) return null;

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-5 pb-1 pt-4">
        <h2 className="flex flex-wrap items-baseline gap-x-2 text-meta font-medium text-ink">
          Ask about this document
          <span className="text-label font-normal text-muted-fg">
            Explains, never advises
          </span>
        </h2>
        <span className="rounded-full bg-parchment px-2.5 py-0.5 text-label text-muted-fg">
          Preview
        </span>
      </div>

      {/* A log that is always mounted, so what is added to it (the question, the wait, the answer,
          a failure) is announced. It is focusable so the keyboard can scroll it. */}
      <div
        ref={threadRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation about this document"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {empty ? (
          <div className="pb-4 pt-4">
            <p className="font-display text-h3 text-ink">
              What would you like to understand?
            </p>
            <p className="mt-1.5 text-meta text-muted-fg">
              Ask about any clause in the settled text. It explains what the
              document says, and leaves advice to {advocate}.
            </p>
            {/* Two questions that ask what the document says, to start from. The third
                suggestion, which asks for advice, is only for the page that shows the refusal. */}
            <div className="mt-4 flex flex-col items-stretch gap-1.5">
              {[
                SUGGESTED_QUESTIONS[0],
                ...(activeClause
                  ? [`What does clause ${activeClause} mean?`]
                  : []),
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={chat.pending}
                  className="rounded-control bg-parchment px-3 py-2 text-left text-meta text-ink transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-5 py-6">
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-card rounded-br-md bg-parchment px-4 py-2.5 text-meta text-ink">
                    {m.text}
                  </p>
                </li>
              ) : m.isEscalation ? (
                <li
                  key={m.id}
                  className="rounded-card border border-progress/30 bg-progress-tint px-4 py-3"
                >
                  <p className="text-meta font-medium text-progress">
                    This needs an advocate
                  </p>
                  <p className="mt-1 text-body text-ink">
                    That asks what you should do, not what the document says.{" "}
                    {advocate} settled this document and can advise you.
                  </p>
                  <Link
                    href={`/documents/${doc.id}/consultation`}
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-meta font-medium text-paper transition-colors hover:bg-ink/85"
                  >
                    Request a consultation with {advocate}
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                  <p className="mt-2 text-meta text-muted-fg">
                    {CONSULTATION.price} {PRICE_BASIS}, payable only if{" "}
                    {advocate} accepts. A request is free, and the fee is
                    separate from the platform&apos;s fixed document fee.
                  </p>
                </li>
              ) : (
                <li key={m.id} className="text-meta leading-relaxed text-ink">
                  {m.status === "refused" && (
                    <p className="mb-1 text-label font-medium text-muted-fg">
                      Not something this document answers
                    </p>
                  )}
                  <p>{m.text}</p>
                  <ChatCitations
                    variant="docked"
                    citations={
                      m.citations?.length
                        ? m.citations
                        : m.citedClauseReference
                          ? [
                              {
                                clauseReference: m.citedClauseReference,
                                quote: "",
                              },
                            ]
                          : []
                    }
                    onCite={(reference) =>
                      onCite(clauseNumberFromReference(reference))
                    }
                  />
                </li>
              ),
            )}
            {chat.pending && (
              <li>
                <ChatPending />
              </li>
            )}
            {chat.failed && (
              <li>
                <ChatSendError
                  message={chat.failed.message}
                  onRetry={() => {
                    chat.retry();
                    // The button leaves the page when it is pressed; keep the keyboard in the conversation.
                    inputRef.current?.focus();
                  }}
                />
              </li>
            )}
          </ol>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="group relative mx-3 mb-3 mt-1"
      >
        <div className="relative rounded-control border border-ink/15 bg-surface p-2 pl-3 transition-colors group-focus-within:border-ink/40">
          <textarea
            ref={inputRef}
            id="agent-input"
            aria-label="Ask about this document"
            rows={1}
            maxLength={MAX_QUESTION_LENGTH}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about a clause, a term, a date"
            className="caret-cycle field-bare block w-full resize-none bg-transparent pt-1 text-meta text-ink outline-none placeholder:text-muted-fg"
          />
          <div className="flex items-center justify-between">
            <span />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || chat.pending}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 disabled:cursor-not-allowed",
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
