import type { ClientClause, ClientSettlementNote, SettledSummary } from "@/lib/types";

/**
 * What the agent reads: the settled clauses, quoted as written, the plain-language
 * summary of the document, and the notes the advocate released to the client. All
 * of it is what a client is handed, so there is no draft, no finding, no working
 * note and no advocate's decision for a reply to be drawn from.
 */
export interface ChatSource {
  title: string;
  clauses: Pick<ClientClause, "number" | "heading" | "body">[];
  summary: SettledSummary | null;
  settlementNotes: ClientSettlementNote[];
}

/** Where a reply was drawn from. A reply with none is not a reply. */
export type Ground =
  | { kind: "clause"; number: string }
  | { kind: "summary"; label: string }
  | { kind: "settlement_note"; id: string };

export interface GeneratedReply {
  /** False when the document has nothing to answer from. Then there is no text. */
  found: boolean;
  text: string;
  grounds: Ground[];
  /** Every span the text quotes, word for word, so the check can find it in the source. */
  quotes: string[];
  /** The clause the reply is about, for a link in the screen. */
  citedClauseReference: string | null;
}

/** A generator is what the real service replaces. The check holds whichever it is. */
export type Generator = (question: string, source: ChatSource) => GeneratedReply;

const OVERVIEW =
  /\b(summary|summari[sz]e|overview|covers?|key terms|what is this (document|agreement|contract)|what('s| is) (in|this) (document|agreement|contract))\b/i;

const NOTHING: GeneratedReply = { found: false, text: "", grounds: [], quotes: [], citedClauseReference: null };

/** The clause as it is written, its summary line where there is one, and the advocate's note on it. */
function aboutClause(clause: ChatSource["clauses"][number], source: ChatSource): GeneratedReply {
  const first = clause.body.split("\n\n")[0];
  const lines = (source.summary?.items ?? []).filter((i) => i.clauses.includes(clause.number));
  // The advocate's note on this clause, and on no other: it is shown beside the clause the
  // client asked about, labelled as the advocate's, and not drawn on for any other question.
  const notes = source.settlementNotes.filter((n) => n.clauseNumber === clause.number);

  const parts = [`Clause ${clause.number}, ${clause.heading}, reads: "${first}"`];
  if (lines.length > 0) parts.push(`In plain terms: ${lines.map((i) => i.text).join(" ")}`);
  for (const n of notes) parts.push(`Your advocate's note on this clause: "${n.text}"`);

  return {
    found: true,
    text: parts.join(" "),
    grounds: [
      { kind: "clause", number: clause.number },
      ...lines.map((i): Ground => ({ kind: "summary", label: i.label })),
      ...notes.map((n): Ground => ({ kind: "settlement_note", id: n.id })),
    ],
    quotes: [first, ...notes.map((n) => n.text)],
    citedClauseReference: `Clause ${clause.number}`,
  };
}

/**
 * THE MOCK GENERATOR. Grounded retrieval and no more: it finds the clause a
 * question names, or what the summary says the document covers, and says it back.
 * It holds no explanation of its own, no glossary and no statute. A real generator
 * replaces it behind this signature and is held to the same check.
 */
export const generateReply: Generator = (question, source) => {
  const lower = question.toLowerCase();

  // A question that names a clause, by its number or its heading, gets that clause.
  const named = source.clauses.find(
    (c) => lower.includes(`clause ${c.number}`) || lower.includes(c.heading.toLowerCase()),
  );
  if (named) return aboutClause(named, source);

  // A question about the document as a whole gets what its summary says it covers.
  const items = source.summary?.items ?? [];
  if (OVERVIEW.test(question) && items.length > 0) {
    return {
      found: true,
      text: `${source.title} covers: ${items.map((i) => i.label).join("; ")}. Ask about any of these, or about a clause by its number.`,
      grounds: items.map((i): Ground => ({ kind: "summary", label: i.label })),
      quotes: [],
      citedClauseReference: null,
    };
  }

  // A looser match: a word of a heading.
  const loose = source.clauses.find((c) =>
    c.heading
      .toLowerCase()
      .split(/\s+/)
      .some((word) => word.length > 4 && lower.includes(word)),
  );
  if (loose) return aboutClause(loose, source);

  return NOTHING;
};
