/**
 * Plain-language meanings for the words the product uses and a client may
 * not know. They define Vidhata's own process, never a point of law: a
 * statute, a section or a case is never glossed here.
 */
export const GLOSSARY = {
  "sign-off":
    "An advocate's recorded decision that the document is settled. You read the document only after this.",
  "execution checklist":
    "The steps after sign-off, in order: stamping, registration and e-signature, with a place to keep the proof.",
  settled: "Every finding has been decided by an advocate.",
  finding:
    "A concern the first pass raised about a clause. An advocate decides each one.",
  empanelled: "On Vidhata's panel of advocates, and invited to review documents.",
} as const;

export type GlossTerm = keyof typeof GLOSSARY;
