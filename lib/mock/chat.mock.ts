import type { ChatMessage, ClientDocument, SettledSummary } from "@/lib/types";

/** What the agent reads of a document: the settled text, as a client has it. */
export type ChatSource = Pick<ClientDocument, "title" | "clauses">;

export const SUGGESTED_QUESTIONS = [
  "What does this document cover?",
  "What does this clause mean?",
  "Should I sue them?",
];

const ADVICE_PATTERN =
  /\b(should i|sue|advice|advise|worth it|what should i do|can i win)\b/i;

const OVERVIEW_PATTERN =
  /\b(summary|summari[sz]e|overview|covers?|key terms|what is this (document|agreement|contract)|what('s| is) (in|this) (document|agreement|contract))\b/i;

export interface ChatReply {
  text: string;
  citedClauseReference: string | null;
  isEscalation: boolean;
}

/**
 * A fixture standing in for the agent. It answers from two things only: the
 * clauses of the settled document, quoted as they are written, and the
 * plain-language summary of that document (lib/mock/summaries.mock.ts), whose
 * every line is held to the clauses it cites.
 *
 * It holds no explanation of its own. There is no glossary of legal terms and
 * no statute: a question about a term the document does not use is told so, and
 * a section number, an Act or a case appears in a reply only because the
 * document's own text or its summary says it. lib/mock/chat.mock.test.ts holds
 * every reply to that.
 */
export function getMockReply(
  userText: string,
  doc: ChatSource,
  summary: SettledSummary | null = null,
): ChatReply {
  if (ADVICE_PATTERN.test(userText)) {
    return { text: "", citedClauseReference: null, isEscalation: true };
  }

  const lower = userText.toLowerCase();

  // A question that names a clause, by its number or its heading, gets that clause.
  const named = doc.clauses.find(
    (c) => lower.includes(`clause ${c.number}`) || lower.includes(c.heading.toLowerCase()),
  );
  if (named) return quoteClause(named, summary);

  // A question about the document as a whole gets what its summary says it covers.
  if (OVERVIEW_PATTERN.test(userText) && summary && summary.items.length > 0) {
    return {
      text: `${doc.title} covers: ${summary.items.map((i) => i.label).join("; ")}. Ask about any of these, or about a clause by its number.`,
      citedClauseReference: null,
      isEscalation: false,
    };
  }

  // A looser match: a word of a heading.
  const loose = doc.clauses.find((c) =>
    c.heading
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length > 4 && lower.includes(word)),
  );
  if (loose) return quoteClause(loose, summary);

  return {
    text: "I can only explain what this settled document says. Ask about a clause by its number or heading, or ask what the document covers.",
    citedClauseReference: null,
    isEscalation: false,
  };
}

/**
 * The clause as it is written, and where the summary has a line about it, that
 * line. Nothing is paraphrased into a legal claim.
 */
function quoteClause(
  clause: ChatSource["clauses"][number],
  summary: SettledSummary | null,
): ChatReply {
  const quoted = `Clause ${clause.number}, ${clause.heading}, reads: "${clause.body.split("\n\n")[0]}"`;
  const lines = (summary?.items ?? []).filter((i) => i.clauses.includes(clause.number));
  const plain = lines.length > 0 ? ` In plain terms: ${lines.map((i) => i.text).join(" ")}` : "";
  return {
    text: `${quoted}${plain}`,
    citedClauseReference: `Clause ${clause.number}`,
    isEscalation: false,
  };
}

export function buildInitialMessages(doc: ChatSource): ChatMessage[] {
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
