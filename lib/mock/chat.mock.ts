import type { ChatMessage, ContractDocument } from "@/lib/types";

export const SUGGESTED_QUESTIONS = [
  "What does this clause mean?",
  "What's a non-compete clause?",
  "Should I sue them?",
];

const TERM_DEFINITIONS: Record<string, string> = {
  "non-compete":
    "A non-compete clause restricts one party from engaging in a competing business for a period of time. Indian courts read these narrowly under Section 27 of the Indian Contract Act, 1872, which voids restraints on trade except in a few defined situations.",
  msme:
    "MSME stands for Micro, Small and Medium Enterprise. The MSMED Act, 2006 gives registered MSMEs statutory protection on payment timelines from larger counterparties.",
};

function findTermDefinition(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [term, definition] of Object.entries(TERM_DEFINITIONS)) {
    if (lower.includes(term)) return definition;
  }
  return null;
}

const ADVICE_PATTERN =
  /\b(should i|sue|advice|advise|worth it|what should i do|can i win)\b/i;
const DEFINITION_PATTERN = /\b(what('|’)?s a|what is a|define|meaning of)\b/i;

export interface ChatReply {
  text: string;
  citedClauseReference: string | null;
  isEscalation: boolean;
}

export function getMockReply(
  userText: string,
  doc: ContractDocument,
): ChatReply {
  if (ADVICE_PATTERN.test(userText)) {
    return { text: "", citedClauseReference: null, isEscalation: true };
  }

  const definition = findTermDefinition(userText);
  if (definition && DEFINITION_PATTERN.test(userText)) {
    return {
      text: definition,
      citedClauseReference: null,
      isEscalation: false,
    };
  }
  if (definition) {
    return {
      text: definition,
      citedClauseReference: null,
      isEscalation: false,
    };
  }

  const finding = doc.findings[0];
  if (finding) {
    return {
      text: `${finding.clauseReference} covers this: "${finding.clauseText}" In plain terms — ${finding.description}`,
      citedClauseReference: finding.clauseReference,
      isEscalation: false,
    };
  }

  return {
    text: "This document doesn't have any flagged clauses to point to. Ask me about a specific section and I'll explain what it means.",
    citedClauseReference: null,
    isEscalation: false,
  };
}

export function buildInitialMessages(doc: ContractDocument): ChatMessage[] {
  return [
    {
      id: "welcome",
      role: "agent",
      text: `I can explain anything in "${doc.title}". I won't give advice on your situation — for that, book time with the settling advocate.`,
      citedClauseReference: null,
      isEscalation: false,
    },
  ];
}
