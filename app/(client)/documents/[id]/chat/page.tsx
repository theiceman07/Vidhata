"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { ChatMessage } from "@/components/domain/chat-message";
import { EscalationPrompt } from "@/components/domain/escalation-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument } from "@/lib/api/documents";
import {
  buildInitialMessages,
  getMockReply,
  SUGGESTED_QUESTIONS,
} from "@/lib/mock/chat.mock";
import type { ChatMessage as ChatMessageType, ContractDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "error" | "loaded";

export default function ChatPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [highlightedClause, setHighlightedClause] = useState<string | null>(
    null,
  );
  const threadEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await getDocument(params.id);
      if (!result) throw new Error("Document not found.");
      setDoc(result);
      setMessages(buildInitialMessages(result));
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this document.",
      );
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(text: string) {
    if (!doc || !text.trim()) return;
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      citedClauseReference: null,
      isEscalation: false,
    };
    const reply = getMockReply(text, doc);
    const agentMessage: ChatMessageType = {
      id: `agent-${Date.now()}`,
      role: "agent",
      text: reply.text,
      citedClauseReference: reply.citedClauseReference,
      isEscalation: reply.isEscalation,
    };
    setMessages((prev) => [...prev, userMessage, agentMessage]);
    setInput("");
  }

  function handleCiteClick(clauseReference: string) {
    setHighlightedClause(clauseReference);
    const el = document.getElementById(
      `sidebar-${clauseReference.replace(/\s+/g, "-")}`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedClause(null), 1500);
  }

  if (state === "loading") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div>
      <PageHeader
        title="Ask about this document"
        description={doc.title}
        backHref={`/documents/${doc.id}`}
        backLabel={doc.title}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-card border border-line bg-paper p-4 shadow-card">
            <p className="mb-2 text-small font-medium text-muted-fg">
              Clauses
            </p>
            <ul className="space-y-1">
              {doc.findings.length === 0 && (
                <li className="text-small text-muted-fg">
                  No flagged clauses on this document.
                </li>
              )}
              {doc.findings.map((f) => (
                <li
                  key={f.findingId}
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
          {doc.advocate && (
            <div className="rounded-card border border-line bg-paper p-4 shadow-card">
              <p className="mb-1 text-small font-medium text-muted-fg">
                Advocate notes
              </p>
              <p className="text-small text-ink">
                Settled by {doc.advocate.name} ({doc.advocate.bar}). Ask me
                about any clause above.
              </p>
            </div>
          )}
        </aside>

        <div className="flex flex-col rounded-card border border-line bg-paper shadow-card">
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 480 }}>
            {messages.map((m) =>
              m.isEscalation ? (
                <EscalationPrompt
                  key={m.id}
                  advocateName={doc.advocate?.name ?? "your advocate"}
                />
              ) : (
                <ChatMessage
                  key={m.id}
                  message={m}
                  onCiteClick={handleCiteClick}
                />
              ),
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
                  className="rounded-full border border-line px-3 py-1 text-small text-muted-fg transition-colors hover:bg-canvas"
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any clause in this document"
                aria-label="Message"
              />
              <Button type="submit" size="icon" aria-label="Send">
                <Icon name="send" size={18} />
              </Button>
            </form>
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
