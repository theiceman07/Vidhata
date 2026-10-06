/**
 * What looks like a reference to the law in a piece of text: a section, an Act, a case.
 *
 * Used by the check on what the agent says, and by the tests that hold every
 * reply to the same rule: a reference appears in a reply only because the
 * document's own text, its summary or the corpus has it. It finds shapes, not
 * meaning, so it may name something that is not a reference and never misses
 * one of these forms.
 */
const SECTION = /\b(?:Sections?|Sec\.|Articles?|Rules?|Orders?)\s+\d+[A-Za-z]?(?:\(\w+\))*/g;
const SHORT = /\bss?\.\s?\d+[A-Za-z]?(?:\(\w+\))*/g;
const ACT = /\b(?:[A-Z][A-Za-z&()'-]*\s+){0,8}Act,?\s+(?:of\s+)?\d{4}\b/g;
const CASE = /\b[A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*)*\s+(?:v\.?|vs\.?)\s+[A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*)*/g;

export function findReferences(text: string): string[] {
  return [SECTION, SHORT, ACT, CASE].flatMap((re) => [...text.matchAll(re)].map((m) => m[0].trim()));
}
