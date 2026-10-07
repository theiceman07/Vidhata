import { answerQuestion, type ChatReply } from "@/lib/chat/answer";
import type { ChatSource } from "@/lib/chat/generate";
import type { ChatMessage, ClientDocument, ClientSettlementNote, SettledSummary } from "@/lib/types";

export type { ChatReply, ChatSource };

/** What the agent reads of a document: the settled text, as a client has it. */
export type ChatDocument = Pick<ClientDocument, "title" | "clauses">;

export const SUGGESTED_QUESTIONS = [
  "What does this document cover?",
  "What does this clause mean?",
  "Should I sue them?",
];

/**
 * Everything the agent may answer from, put together: the settled clauses, the
 * summary of the document, and the notes the advocate released to the client. All
 * of it is what a client is handed (the summary and the notes are read through the
 * client layer), so there is no draft, no finding and no working note in it.
 */
export function chatSourceOf(
  doc: ChatDocument,
  summary: SettledSummary | null,
  settlementNotes: ClientSettlementNote[],
): ChatSource {
  return { title: doc.title, clauses: doc.clauses, summary, settlementNotes };
}

/**
 * A fixture standing in for the agent, in the three stages the real one will have:
 * a gate that decides whether a question asks what the document says or asks for
 * advice, a reply drawn only from the settled clauses, their summary and the
 * advocate's released notes, and a check that withdraws any reply that is not what
 * it should be (lib/chat). Nothing here explains the law, and a test holds every
 * reply to the document's own text.
 */
export function getMockReply(question: string, source: ChatSource): ChatReply {
  return answerQuestion(question, source);
}

export function buildInitialMessages(doc: Pick<ClientDocument, "title">): ChatMessage[] {
  return [
    {
      id: "welcome",
      role: "agent",
      text: `I can explain anything in "${doc.title}". I won't give advice on your situation. For that, book time with the settling advocate.`,
      citedClauseReference: null,
      isEscalation: false,
    },
  ];
}
