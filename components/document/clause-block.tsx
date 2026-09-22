"use client";

import { cn } from "@/lib/utils";
import type { Clause, Finding } from "@/lib/types";
import { FindingBar } from "./finding-bar";
import { MarginMark } from "./margin-mark";

/**
 * Highlight the exact span a finding quotes.
 *
 * The fixtures guarantee that a finding-bearing clause body contains its
 * finding's clauseText verbatim. If that ever stops being true the
 * paragraph renders plain rather than guessing at a span — a highlight
 * over the wrong words is worse than no highlight.
 */
function withHighlight(paragraph: string, quotes: string[]) {
  const quote = quotes.find((q) => paragraph.includes(q));
  if (!quote) return paragraph;

  const at = paragraph.indexOf(quote);
  return (
    <>
      {paragraph.slice(0, at)}
      <mark className="border-b border-caution bg-caution/[0.15] text-ink">
        {quote}
      </mark>
      {paragraph.slice(at + quote.length)}
    </>
  );
}

/**
 * One clause of the contract, with its findings in the margin.
 *
 * The clause number sits in the gutter in the notation voice; the body
 * is Newsreader, because the clause is the part with legal consequence.
 * The body holds a reading measure and the findings sit in the margin
 * beside it, level with the words that caused them. Where the screen is
 * too narrow for a margin, they fall in beneath the clause rather than
 * squeezing the prose.
 */
export function ClauseBlock({
  clause,
  findings,
  findingNumbers,
  selectedFindingId,
  onSelectFinding,
  active,
}: {
  clause: Clause;
  /** The findings raised against this clause, in pipeline order. */
  findings: Finding[];
  /** findingId to display ordinal, e.g. "find-1" -> "01". */
  findingNumbers: Record<string, string>;
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  active: boolean;
}) {
  const quotes = findings.map((f) => f.clauseText);
  const paragraphs = clause.body.split("\n\n");
  const revised = clause.revisedAt !== null;

  return (
    <section
      id={`clause-${clause.id}`}
      data-clause={clause.id}
      aria-labelledby={`clause-heading-${clause.id}`}
      className={cn(
        "scroll-mt-14 py-8 transition-colors",
        active && "bg-parchment/40",
      )}
    >
      <div className="grid gap-x-10 gap-y-6 @3xl:grid-cols-[minmax(0,68ch)_minmax(200px,17rem)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {revised && <MarginMark kind="human" />}
            <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
              Clause {clause.number}
            </p>
          </div>

          <h2
            id={`clause-heading-${clause.id}`}
            className="mt-1 font-display text-h3 text-ink"
          >
            {clause.heading}
          </h2>

          <div className="mt-3 space-y-4 font-display text-body leading-relaxed text-ink">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{withHighlight(paragraph, quotes)}</p>
            ))}
          </div>

          {revised && (
            <p className="mt-4 font-mono text-notation uppercase tracking-notation text-accent">
              Revised by advocate
            </p>
          )}
        </div>

        {/* The margin. Empty for most clauses, which is what makes a
            note in it worth looking at. */}
        {findings.length > 0 && (
          <div className="space-y-1 @3xl:pt-6">
            {findings.map((finding) => (
              <FindingBar
                key={finding.findingId}
                finding={finding}
                number={findingNumbers[finding.findingId] ?? "--"}
                selected={selectedFindingId === finding.findingId}
                onSelect={() => onSelectFinding(finding.findingId)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
