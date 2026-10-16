"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatError, MAX_QUESTION_LENGTH, askDocumentQuestion, type ChatTransport } from "@/lib/api/chat";
import type { ChatMessage } from "@/lib/types";
import { beginAsk, beginRetry, completeAsk, failAsk, initialThread, nextMessageId } from "./thread";

/**
 * One conversation with the document's agent: the thread, whether a question is in flight, and
 * a failed question that can be put again. Questions go one at a time.
 */
export function useDocumentChat(options: {
  documentId: string;
  initialMessages?: ChatMessage[];
  transport: ChatTransport;
}) {
  const [state, setState] = useState(() => initialThread(options.initialMessages));
  const stateRef = useRef(state);
  stateRef.current = state;
  const transportRef = useRef(options.transport);
  transportRef.current = options.transport;
  const busy = useRef(false);
  const live = useRef(true);
  const epoch = useRef(0); // bumped by reset, so a reply to the old thread is dropped
  const { documentId } = options;

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const run = useCallback(
    async (question: string) => {
      const mine = epoch.current;
      const current = () => live.current && epoch.current === mine;
      try {
        const answer = await askDocumentQuestion({ documentId, question }, transportRef.current);
        if (current()) setState((s) => completeAsk(s, answer, nextMessageId("a")));
      } catch (err) {
        const message = err instanceof ChatError ? err.message : "Could not get an answer. Try again.";
        if (current()) setState((s) => failAsk(s, question, message));
      } finally {
        if (epoch.current === mine) busy.current = false;
      }
    },
    [documentId],
  );

  /** Returns false when the question was not taken: empty, too long, or another is still being answered. */
  const send = useCallback(
    (text: string): boolean => {
      const question = text.trim();
      // Too long is refused here, not after it is in the thread, where a retry could only fail again.
      if (!question || question.length > MAX_QUESTION_LENGTH || busy.current) return false;
      busy.current = true;
      setState((s) => beginAsk(s, question, nextMessageId("u")));
      void run(question);
      return true;
    },
    [run],
  );

  const retry = useCallback(() => {
    const failed = stateRef.current.failed;
    if (!failed || busy.current) return;
    busy.current = true;
    setState((s) => beginRetry(s));
    void run(failed.question);
  }, [run]);

  /** Start the thread again, as when a document finishes loading. */
  const reset = useCallback((messages: ChatMessage[]) => {
    epoch.current += 1;
    busy.current = false;
    setState(initialThread(messages));
  }, []);

  return { messages: state.messages, pending: state.pending, failed: state.failed, send, retry, reset };
}
