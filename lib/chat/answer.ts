import { checkReply, type CheckFailure } from "./check";
import { classifyQuestion } from "./classify";
import { generateReply, type ChatSource, type Generator } from "./generate";

/**
 * What a client is told for a question, in the three stages: the gate before, the
 * grounded reply, the check after.
 *
 * - answer: the question asks what the document says, a reply was drawn from it,
 *   and the check passed. Only this carries anything the generator wrote.
 * - not_found: the question asks what the document says, and the document has
 *   nothing to answer it from.
 * - escalation: the question asks for advice. The agent writes nothing: the screen
 *   offers a consultation with the advocate who settled the document.
 * - rephrase: the question is unclear, or in words the gate does not read. It is
 *   asked to be put again. No offer of a consultation: an unclear question is not
 *   necessarily advice, and a fumble is not a sale.
 * - withdrawn: a reply was written and the check refused it. It is replaced by a
 *   fixed message, and nothing the generator wrote is shown.
 */
export type ChatReplyKind = "answer" | "not_found" | "escalation" | "rephrase" | "withdrawn";

export interface ChatReply {
  kind: ChatReplyKind;
  text: string;
  citedClauseReference: string | null;
  isEscalation: boolean;
}

export const REPHRASE_TEXT =
  "I could not tell what you are asking. I can explain what this settled document says: ask what a clause says or means, or what the document covers.";

export const NOT_FOUND_TEXT =
  "I can only explain what this settled document says, and I could not find that in it. Ask about a clause by its number or heading, or ask what the document covers.";

export const WITHDRAWN_TEXT =
  "I could not give an answer to that which I can stand behind from this document. Ask about a clause by its number or heading.";

let withdrawn = 0;

/**
 * How many replies the check has withdrawn in this tab. A counter and nothing more:
 * there is no source for it beyond the tab, so no screen reports it as a figure.
 */
export const withdrawnReplyCount = (): number => withdrawn;

export function answerQuestion(
  question: string,
  source: ChatSource,
  options: {
    /** The generator to use. The mock by default; a test passes one that misbehaves. */
    generate?: Generator;
    /** Text no reply may hold. */
    forbidden?: string[];
    /** Told why, when a reply is withdrawn. */
    onWithdrawn?: (reason: CheckFailure) => void;
  } = {},
): ChatReply {
  const kind = classifyQuestion(question);

  if (kind === "advise") {
    return { kind: "escalation", text: "", citedClauseReference: null, isEscalation: true };
  }
  if (kind === "unclear") {
    return { kind: "rephrase", text: REPHRASE_TEXT, citedClauseReference: null, isEscalation: false };
  }

  const reply = (options.generate ?? generateReply)(question, source);
  if (!reply.found) {
    return { kind: "not_found", text: NOT_FOUND_TEXT, citedClauseReference: null, isEscalation: false };
  }

  const checked = checkReply(reply, source, { forbidden: options.forbidden });
  if (!checked.ok) {
    withdrawn += 1;
    options.onWithdrawn?.(checked.reason);
    return { kind: "withdrawn", text: WITHDRAWN_TEXT, citedClauseReference: null, isEscalation: false };
  }

  return {
    kind: "answer",
    text: reply.text,
    citedClauseReference: reply.citedClauseReference,
    isEscalation: false,
  };
}
