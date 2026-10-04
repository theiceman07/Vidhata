import { CORPUS, type CorpusEntry } from "@/lib/mock/corpus.mock";
import type { Citation, Finding } from "@/lib/types";

/**
 * The citation gate: a citation is verified or it is blocked.
 *
 * Matching is exact. The only thing normalised is whitespace and letter
 * case, so "indian contract act, 1872,  s.27" is the same citation as
 * "Indian Contract Act, 1872, s.27". Nothing else is forgiven: a missing
 * comma, a different section, an extra word is a near-miss, and a near-miss
 * is blocked. A citation wrongly marked verified is the one failure this
 * gate exists to prevent, so there is no fuzzy matching, and there must
 * never be.
 */

/** Whitespace and case, and nothing more. */
export function normaliseCitation(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

// Both ways a citation can be written: by its label, or by its corpus ref.
const INDEX = new Map<string, CorpusEntry>();
for (const entry of CORPUS) {
  INDEX.set(normaliseCitation(entry.label), entry);
  INDEX.set(normaliseCitation(entry.ref), entry);
}

export type BlockedReason = "empty" | "not_in_corpus";

export interface CitationLookup {
  status: "verified" | "blocked";
  /** The corpus's own label when verified; what was typed, trimmed, when not. */
  text: string;
  corpusRef: string | null;
  /** Why it was blocked. Null when verified. */
  reason: BlockedReason | null;
}

export function lookupCitation(input: string): CitationLookup {
  const key = normaliseCitation(input);
  if (key === "") {
    return { status: "blocked", text: "", corpusRef: null, reason: "empty" };
  }
  const entry = INDEX.get(key);
  if (entry) {
    return { status: "verified", text: entry.label, corpusRef: entry.ref, reason: null };
  }
  return {
    status: "blocked",
    text: input.replace(/\s+/g, " ").trim(),
    corpusRef: null,
    reason: "not_in_corpus",
  };
}

/**
 * Run the gate again over a citation that is already on the record.
 *
 * What it says now is what the corpus holds now. A blocked citation becomes
 * verified only by matching the corpus, never by being relabelled, and a
 * verified one that no longer matches becomes blocked. Who withdrew it, and
 * why, stays on the record: a withdrawal is a decision about the finding,
 * not a result of the gate.
 */
export function recheckCitation(citation: Citation): Citation {
  let result = lookupCitation(citation.text);
  if (result.status === "blocked" && citation.corpusRef) {
    result = lookupCitation(citation.corpusRef);
  }
  return {
    ...citation,
    status: result.status,
    corpusRef: result.corpusRef,
    // A verified citation carries the corpus's own wording; a blocked one
    // keeps what was written.
    text: result.status === "verified" ? result.text : citation.text,
  };
}

/** Every citation on every finding, run through the gate again. */
export function recheckFindings(findings: Finding[]): Finding[] {
  return findings.map((finding) => ({
    ...finding,
    citations: finding.citations.map(recheckCitation),
  }));
}
