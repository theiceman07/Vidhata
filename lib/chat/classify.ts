/**
 * The gate before the agent answers anything: is this a question about what the
 * settled document says, or a question that asks for advice?
 *
 * Three answers, and the doubtful ones are not answered:
 *
 * - explain: it asks what the document says or means. Only this goes on to a reply.
 * - advise: it asks what to do, what will happen, whether to sign or sue, whether
 *   something is enforceable or safe, or asks the agent to set its rules aside.
 *   Any advice in a question makes the whole question advice, so a question that
 *   is half explanation and half advice is advice. It is sent to the advocate who
 *   settled the document, and the agent writes nothing of its own.
 * - unclear: nothing in it says what it is asking, or it is in words this table
 *   does not read. It is asked to be put again, and is not answered and not sold
 *   a consultation: an unclear question is not necessarily advice.
 *
 * THIS IS A MOCK. It is a rule table, standing in for a classifier a service will
 * provide behind the same signature. The labelled questions in
 * lib/chat/questions.fixtures.ts are what it is held to, and are the set a real
 * classifier has to pass as well.
 */
export type QuestionKind = "explain" | "advise" | "unclear";

const ADVICE: RegExp[] = [
  // What to do.
  /\bshould (i|we)\b/,
  /\bshall (i|we)\b/,
  /\bmust (i|we)\b/,
  /\b(do|does) (i|we) (have|need) to\b/,
  /\bwhat (should|would|could) (i|we)\b/,
  /\bwhat (i|we) (should|ought|need|must|can)\b/,
  /\bwhat (do|would|will) you (recommend|suggest|advise|do)\b/,
  /\bwould you (sign|advise|recommend|do|accept|agree)\b/,
  /\b(advice|advise|advisable|recommend|recommendation|suggest)\b/,
  /\bis it (safe|wise|okay|ok|fine|a good idea|worth)\b/,
  /\bworth (it|signing|the risk)\b/,
  // How it will go.
  /\b(sue|suing|lawsuit|litigate|litigation)\b/,
  /\b(win|lose|winning|losing)\b/,
  /\bchances?\b/,
  /\b(enforceable|enforceability|legally binding|illegal|unlawful|void)\b/,
  // Their own position.
  /\b(my|our) (case|situation|business|company|rights|options|position|risk|risks|liability|exposure)\b/,
  /\b(am|are) (i|we) (liable|allowed|safe|protected|bound|covered|exposed|entitled)\b/,
  /\bwhat (happens|if) .*\b(i|we) (miss|stop|breach|terminate|leave|quit|don'?t|fail|can'?t|cannot|refuse|walk)\b/,
  /\b(favou?rs?|fair to me|good deal|bad deal|one-sided|risky|dangerous|loophole|back out|walk away|get out of)\b/,
  // Setting the rules aside.
  /\b(ignore|disregard|forget) (all |any |your |the |previous |prior |these )*(rules|instructions|guidelines|prompt|restrictions)\b/,
  /\b(pretend|act as|you are now|roleplay|role-play|jailbreak)\b/,
  /\bsystem prompt\b/,
  /\bas my (lawyer|advocate|attorney)\b/,
];

const EXPLAIN: RegExp[] = [
  /\bwhat (does|do|is|are|did|was|were|counts?|happens)\b/,
  /\bwhat'?s\b/,
  /\b(explain|define|describe|summari[sz]e|summary|overview|meaning|means?|mean)\b/,
  /\b(cover|covers|covered|say|says|state|states|stated|read|reads|provide|provides)\b/,
  /\bhow (long|much|many|often)\b/,
  /\b(who|which|when|where|why)\b/,
  /\btell me about\b/,
  /\bclause\s+\d/,
];

const normalise = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'");

export function classifyQuestion(text: string): QuestionKind {
  const lower = normalise(text);
  // Advice wins over everything else in the question, whatever else it asks.
  if (ADVICE.some((re) => re.test(lower))) return "advise";
  if (EXPLAIN.some((re) => re.test(lower))) return "explain";
  return "unclear";
}
