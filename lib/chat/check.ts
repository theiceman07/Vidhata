import { lookupCitation } from "@/lib/citations";
import { CORPUS } from "@/lib/mock/corpus.mock";
import type { ChatSource, GeneratedReply, Ground } from "./generate";
import { findReferences } from "./references";

/**
 * The check after the agent has written a reply, before the client sees it.
 *
 * It does not trust the generator, whichever one it is. A reply is withdrawn, and
 * the client is shown a fixed message in its place, if it fails any of these, and
 * the first that fails is the reason:
 *
 * - it has no grounds: nothing it was drawn from.
 * - a ground is not in the source: a clause, summary line or note that is not there.
 * - a quote is not in what it was drawn from, word for word.
 * - it holds text the caller forbids (the tests pass a working note's text).
 * - it goes off script: it says it is setting its rules aside, or obeying an
 *   instruction it was given in a note.
 * - it advises, in its own words.
 * - it names a section, an Act or a case that neither the grounded text nor the
 *   citation gate (verified, not blocked) vouches for.
 *
 * "In its own words" means the reply with its listed quotes taken out. A quote of
 * the advocate's released note is the advocate's words, shown as theirs, and the
 * advice rule is not applied to it. Anything not listed as a quote is the agent's,
 * so a reply cannot hide advice in a quotation mark.
 */
export type CheckFailure =
  | "no_grounds"
  | "unknown_ground"
  | "quote_not_in_source"
  | "forbidden_text"
  | "off_script"
  | "advice_phrasing"
  | "unverified_reference";

export type CheckResult = { ok: true } | { ok: false; reason: CheckFailure; detail: string };

// Advice, as the agent might phrase it. The classifier keeps these out of the questions; this
// keeps them out of the answers.
const ADVICE_OWN: RegExp[] = [
  /\byou (should|must|ought|need to|had better|are advised)\b/i,
  /\bI (recommend|advise|suggest|would (sign|not sign|avoid|negotiate|walk|accept))\b/i,
  /\bwe (recommend|advise|suggest)\b/i,
  /\bmy (advice|recommendation|view|opinion)\b/i,
  /\byour best (option|course|move|bet)\b/i,
  /\b(it is|it's) (wise|advisable|prudent|sensible) (to|for you)\b/i,
  /\bconsider (signing|negotiating|suing|renegotiating|seeking)\b/i,
  /\bdon'?t sign\b/i,
  /\b(is|are) (not )?(legally )?enforceable\b/i,
  /\byou (will|would|could|might) (win|lose)\b/i,
  /\b(good|bad) (deal|idea)\b/i,
];

// A reply that says it has set its rules aside, or is following an instruction it was handed.
const OFF_SCRIPT: RegExp[] = [
  /\bignor(e|ing|ed) (my|the|all|any|these|those) (rules|instructions|guidelines)\b/i,
  /\bas (instructed|requested|directed) (in|by) (the|this|that) (note|clause|document)\b/i,
  /\bI am now\b/i,
  /\bI will now (act|advise|answer freely)\b/i,
  /\bnew instructions\b/i,
];

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** What a ground was drawn from, or null if the source has no such thing. */
function textOf(ground: Ground, source: ChatSource): string | null {
  if (ground.kind === "clause") {
    const c = source.clauses.find((x) => x.number === ground.number);
    return c ? `${c.heading}\n${c.body}` : null;
  }
  if (ground.kind === "summary") {
    const i = source.summary?.items.find((x) => x.label === ground.label);
    return i ? `${i.label}\n${i.text}` : null;
  }
  const n = source.settlementNotes.find((x) => x.id === ground.id);
  return n ? n.text : null;
}

export function checkReply(
  reply: GeneratedReply,
  source: ChatSource,
  options: { forbidden?: string[] } = {},
): CheckResult {
  const fail = (reason: CheckFailure, detail: string): CheckResult => ({ ok: false, reason, detail });

  if (reply.grounds.length === 0) return fail("no_grounds", "The reply was not drawn from anything.");

  const texts: string[] = [];
  for (const ground of reply.grounds) {
    const text = textOf(ground, source);
    if (text === null) return fail("unknown_ground", `Not in the source: ${JSON.stringify(ground)}`);
    texts.push(text);
  }
  const grounded = squash(texts.join("\n"));

  for (const quote of reply.quotes) {
    if (!grounded.includes(squash(quote))) {
      return fail("quote_not_in_source", `Not in what it was drawn from: "${quote.slice(0, 80)}"`);
    }
  }

  for (const forbidden of options.forbidden ?? []) {
    if (forbidden.length >= 4 && reply.text.includes(forbidden)) {
      return fail("forbidden_text", "The reply holds text it may not.");
    }
  }

  // The agent's own words: the reply without its listed quotes.
  const own = reply.quotes.reduce((text, quote) => text.split(quote).join(" "), reply.text);

  if (OFF_SCRIPT.some((re) => re.test(own))) return fail("off_script", "The reply left its script.");
  if (ADVICE_OWN.some((re) => re.test(own))) return fail("advice_phrasing", "The reply advises.");

  // A citation the gate verifies, whole, is vouched for: it is taken out before what is left
  // is looked at. Anything else that names the law has to be in the text it was drawn from.
  const withoutVerified = CORPUS.reduce(
    (text, entry) => (lookupCitation(entry.label).status === "verified" ? text.split(entry.label).join(" ") : text),
    reply.text,
  );
  const vouched = `${grounded} ${squash(source.title)}`;
  for (const reference of findReferences(withoutVerified)) {
    if (!vouched.includes(reference)) {
      return fail("unverified_reference", `Not vouched for: ${reference}`);
    }
  }

  return { ok: true };
}
