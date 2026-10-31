"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { agentAvailable } from "@/lib/chatAccess";
import { documentIdentity } from "@/lib/documentTitle";
import { StateLabel } from "@/components/document/state-label";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { ChatMessage } from "@/components/domain/chat-message";
import { ChatPending, ChatSendError } from "@/components/domain/chat-status";
import { EscalationPrompt } from "@/components/domain/escalation-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAT_MAX_LENGTH, chatTransport, unavailableTransport } from "@/lib/api/chat";
import { getClientDocument } from "@/lib/api/client/documents";
import { useDocumentChat } from "@/lib/chat-session/useDocumentChat";
import { getClientSummary } from "@/lib/api/client/delivery";
import {
  buildInitialMessages,
  chatSourceOf,
  SUGGESTED_QUESTIONS,
} from "@/lib/mock/chat.mock";
import { getClientSettlementNotes } from "@/lib/api/client/settlement-notes";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type {
  ClientDocument,
  ClientSettlementNote,
  SettledSummary,
} from "@/lib/types";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DocumentTabs } from "@/components/document/document-tabs";
import { PageSkeleton } from "@/components/shared/page-skeleton";

type LoadState = "loading" | "error" | "loaded";

/**
 * The document's agent on a page of its own, from what a client is handed. It
 * explains the settled document and never advises, and there is nothing for it
 * to read until the advocate's sign-off is on record.
 */
export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ClientDocument | null>(null);
  const [summary, setSummary] = useState<SettledSummary | null>(null);
  const [notes, setNotes] = useState<ClientSettlementNote[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  // Questions go through the C1 boundary (lib/api/chat), which waits like a network call and can fail.
  const transport = useMemo(
    () => (doc ? chatTransport(chatSourceOf(doc, summary, notes)) : unavailableTransport),
    [doc, summary, notes],
  );
  const chat = useDocumentChat({ documentId: params.id, transport });
  const messages = chat.messages;
  const resetChat = chat.reset;
  const [input, setInput] = useState("");
  const over = input.length > CHAT_MAX_LENGTH;
  const [highlightedClause, setHighlightedClause] = useState<string | null>(
    null,
  );
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Each load takes a number; one that is no longer the latest (a new id, a retry, leaving the page) drops its result.
  const loadId = useRef(0);
  const citeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    const mine = ++loadId.current;
    const stale = () => mine !== loadId.current;
    setState("loading");
    try {
      const result = await getClientDocument(MOCK_CLIENT_ORG.id, params.id);
      if (stale()) return;
      if (!result) throw new Error("Document not found.");
      setDoc(result);
      resetChat(buildInitialMessages(result));
      // The summary is asked for only once the document is signed off, and what it says is
      // the API's to give. Without one the agent still quotes the clauses.
      setSummary(null);
      setNotes([]);
      if (agentAvailable(result)) {
        const [read, released] = await Promise.all([
          getClientSummary(MOCK_CLIENT_ORG.id, params.id).catch(() => null),
          getClientSettlementNotes(MOCK_CLIENT_ORG.id, params.id).catch((): ClientSettlementNote[] => []),
        ]);
        if (stale()) return;
        if (read && read.result.state === "ready") setSummary(read.result.summary);
        setNotes(released);
      }
      setState("loaded");
    } catch (err) {
      if (stale()) return;
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this document.",
      );
      setState("error");
    }
  }, [params.id, resetChat]);

  useEffect(() => {
    load();
    return () => {
      loadId.current += 1;
    };
  }, [load]);

  useEffect(() => () => clearTimeout(citeTimer.current), []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: scrollBehavior() });
  }, [messages, chat.pending, chat.failed]);

  function sendMessage(text: string) {
    if (!doc) return;
    // Taken only if no other question is still being answered; the box is kept otherwise.
    if (chat.send(text)) setInput("");
  }

  function handleCiteClick(clauseReference: string) {
    setHighlightedClause(clauseReference);
    const el = document.getElementById(
      `sidebar-${clauseReference.replace(/\s+/g, "-")}`,
    );
    el?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    clearTimeout(citeTimer.current);
    citeTimer.current = setTimeout(() => setHighlightedClause(null), 1500);
  }

  if (state === "loading") {
    return (
      <PageSkeleton tabs description={false}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
          <Skeleton className="h-60 rounded-card" />
          <Skeleton className="h-[26rem] rounded-card" />
        </div>
      </PageSkeleton>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  // The chat agent explains the settled document. Before sign-off there
  // is no settled document to explain, and nothing reaches the client
  // until there is a recorded sign-off.
  const signOff = doc.signOff;
  if (!agentAvailable(doc) || !signOff) {
    // Says only that it is not open yet: the document is not named, as the
    // delivery and the summary do not name one that is not signed off.
    return (
      <div className="w-full">
        <PageHeader
          title="Ask about this document"
          back={{ fallbackHref: `/documents/${doc.id}`, label: "Document" }}
        />
        <p className="border-l-2 border-line pl-4 text-body text-ink">
          Questions open once an advocate has settled and signed off this
          document. Until then there is no settled text to explain.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        stacked
        status={<StateLabel state={doc.status} />}
        title={documentIdentity(doc.title).name}
        meta={[documentIdentity(doc.title).with]}
        back={{ fallbackHref: `/documents/${doc.id}`, label: doc.title }}
        tabs={<DocumentTabs documentId={doc.id} signedOff={Boolean(doc.signOff)} checklist={doc.checklist} />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-paper p-4 shadow-card">
            <p className="mb-2 text-small font-medium text-muted-fg">
              Clauses
            </p>
            <ul className="space-y-1">
              {doc.findingList.length === 0 && (
                <li className="text-small text-muted-fg">
                  No flagged clauses on this document.
                </li>
              )}
              {doc.findingList.map((f) => (
                <li
                  key={f.number}
                  id={`sidebar-${f.clauseReference.replace(/\s+/g, "-")}`}
                  className={cn(
                    "rounded-control px-2 py-1.5 text-small transition-colors",
                    highlightedClause === f.clauseReference
                      ? "bg-accent/15 text-accent"
                      : "text-ink",
                  )}
                >
                  {f.clauseReference}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-paper p-4 shadow-card">
            <p className="mb-1 text-small font-medium text-muted-fg">
              Advocate notes
            </p>
            <p className="text-small text-ink">
              Settled by {signOff.advocate} ({signOff.enrolment}). Ask me
              about any clause above.
            </p>
          </div>
        </aside>

        <div className="flex flex-col rounded-card border border-line bg-paper shadow-card">
          {/* A log that is always mounted, so what is added to it (the question, the wait, the answer,
              a failure) is announced. It is focusable so the keyboard can scroll it. */}
          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation about this document"
            tabIndex={0}
            className="max-h-[calc(100dvh-26rem)] min-h-[18rem] flex-1 space-y-3 overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            {messages.map((m) =>
              m.isEscalation ? (
                <EscalationPrompt
                  key={m.id}
                  advocateName={signOff.advocate}
                  href={`/documents/${doc.id}/consultation`}
                />
              ) : (
                <ChatMessage
                  key={m.id}
                  message={m}
                  onCiteClick={handleCiteClick}
                />
              ),
            )}
            {chat.pending && <ChatPending />}
            {chat.failed && (
              <ChatSendError
                message={chat.failed.message}
                onRetry={() => {
                  chat.retry();
                  // The button leaves the page when it is pressed; keep the keyboard in the conversation.
                  inputRef.current?.focus();
                }}
              />
            )}
            <div ref={threadEndRef} />
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-2 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={chat.pending}
                  className="min-h-11 rounded-control border border-line px-4 py-1 text-small text-muted-fg transition-colors hover:bg-canvas sm:min-h-0 sm:px-3 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                aria-invalid={over}
                aria-describedby="chat-length"
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any clause"
                aria-label="Ask about a clause in this document"
              />
              <Button type="submit" size="icon" aria-label="Send" disabled={chat.pending || over} className="h-11 w-11 shrink-0">
                <Icon name="send" size={18} />
              </Button>
            </form>
            <div className="mt-1.5 flex items-center justify-between gap-4">
              <p id="chat-length" className="text-meta text-muted-fg">
                {input.length} of {CHAT_MAX_LENGTH} characters
              </p>
            </div>
            {over && (
              <p aria-live="polite" className="mt-1 border-l-2 border-flagged pl-4 text-small text-ink">
                That is {input.length - CHAT_MAX_LENGTH} characters over the limit. Shorten your question to send it.
              </p>
            )}
            <p className="mt-2 text-small text-muted-fg">
              Ask about anything in this document. For advice on your
              situation, book a consultation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
