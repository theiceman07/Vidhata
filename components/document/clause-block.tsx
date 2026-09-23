"use client";

import { cn } from "@/lib/utils";
import { findingState } from "@/lib/findings";
import type { Clause, Finding, MarginNotes } from "@/lib/types";
import { FindingBar } from "./finding-bar";
import { AddMarginNote, MarginNote } from "./margin-note";
import { MarginMark } from "./margin-mark";

/**
 * How a quoted span reads, by the state of the finding that quotes it.
 *
 * Open findings underline in their severity colour. A finding waiting on
 * the client is dashed: nothing is decided yet, but nobody at Vidhata is
 * holding it. Settled findings keep a hairline in verified ink, because
 * the passage was looked at and decided, and that is worth seeing.
 */
function markClass(finding: Finding, emphasised: boolean): string {
  const state = findingState(finding);
  if (state === "settled") {
    return cn(
      "border-b border-verified/70",
      emphasised ? "bg-verified/10" : "bg-transparent",
    );
  }
  if (state === "with_client") {
    return cn(
      "border-b-2 border-dashed border-caution",
      emphasised ? "bg-caution/20" : "bg-transparent",
    );
  }
  const tone = {
    high: emphasised ? "border-flagged bg-flagged/15" : "border-flagged bg-flagged/[0.06]",
    medium: emphasised ? "border-caution bg-caution/25" : "border-caution bg-caution/10",
    low: emphasised ? "border-muted-fg bg-ink/10" : "border-muted-fg bg-ink/[0.04]",
  }[finding.severity];
  return cn("border-b-2", tone);
}

/**
 * Highlight the exact spans the findings quote.
 *
 * The fixtures guarantee that a finding-bearing clause body contains its
 * finding's clauseText verbatim. If that ever stops being true the
 * paragraph renders plain rather than guessing at a span: a highlight
 * over the wrong words is worse than no highlight.
 */
function withHighlights(
  paragraph: string,
  findings: Finding[],
  emphasisedId: string | null,
  onSelect: (findingId: string) => void,
) {
  const hits = findings
    .map((f) => ({ f, at: paragraph.indexOf(f.clauseText) }))
    .filter((h) => h.at !== -1 && h.f.clauseText.length > 0)
    .sort((a, b) => a.at - b.at);

  if (hits.length === 0) return paragraph;

  const out: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach(({ f, at }) => {
    if (at < cursor) return; // overlapping quote: the earlier one wins
    out.push(paragraph.slice(cursor, at));
    out.push(
      <mark
        key={f.findingId}
        data-finding={f.findingId}
        onClick={() => onSelect(f.findingId)}
        className={cn(
          "cursor-pointer rounded-[2px] text-ink transition-colors duration-150",
          markClass(f, emphasisedId === f.findingId),
          emphasisedId === f.findingId && "ring-1 ring-ink/15",
        )}
      >
        {f.clauseText}
      </mark>,
    );
    cursor = at + f.clauseText.length;
  });
  out.push(paragraph.slice(cursor));
  return out;
}

/**
 * One clause of the contract, with its findings in the margin.
 *
 * The clause number sits in the notation voice; the body is Newsreader,
 * because the clause is the part with legal consequence. The findings sit
 * in the margin level with the words that caused them. Where the pane is
 * too narrow for a margin they fall in beneath the clause rather than
 * squeezing the prose.
 *
 * On the advocate's side the margin also takes their own notes, below the
 * findings. Those are theirs alone; the client's copy has no notes.
 */
export function ClauseBlock({
  clause,
  findings,
  findingNumbers,
  selectedFindingId,
  hoveredFindingId,
  onSelectFinding,
  onHoverFinding,
  notes,
}: {
  clause: Clause;
  /** The findings raised against this clause, in pipeline order. */
  findings: Finding[];
  findingNumbers: Record<string, string>;
  selectedFindingId: string | null;
  hoveredFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onHoverFinding: (findingId: string | null) => void;
  /** The advocate's notes on this clause, and how to keep them. Advocate only. */
  notes?: MarginNotes;
}) {
  const paragraphs = clause.body.split("\n\n");
  const revised = clause.revisedAt !== null;
  const holdsSelection = findings.some((f) => f.findingId === selectedFindingId);
  const emphasised = hoveredFindingId ?? selectedFindingId;

  return (
    <section
      id={`clause-${clause.id}`}
      data-clause={clause.id}
      aria-labelledby={`clause-heading-${clause.id}`}
      className="group/clause relative scroll-mt-12 py-6"
    >
      {/* The clause in hand carries an ink rule in the gutter, so the
          reader's eye finds it after a jump. */}
      <span
        aria-hidden
        className={cn(
          "absolute -left-4 bottom-6 top-6 w-0.5 bg-ink transition-opacity duration-150 md:-left-5",
          holdsSelection ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="grid gap-x-10 gap-y-4 @3xl:grid-cols-[minmax(0,68ch)_minmax(220px,18rem)]">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-label text-muted-fg">{clause.number}</span>
            <h2
              id={`clause-heading-${clause.id}`}
              className="font-display text-h3 text-ink"
            >
              {clause.heading}
            </h2>
            {revised && (
              <span className="inline-flex items-center gap-1 text-label text-accent">
                <MarginMark kind="human" />
                Revised by advocate
              </span>
            )}
          </div>

          <div className="mt-2 space-y-3 font-clause text-body leading-relaxed text-ink">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>
                {withHighlights(paragraph, findings, emphasised, onSelectFinding)}
              </p>
            ))}
          </div>
        </div>

        {/* The margin. Empty for most clauses, which is what makes a
            note in it worth looking at. */}
        {(findings.length > 0 || notes) && (
          <div className="space-y-1 @3xl:pt-7">
            {findings.map((finding) => (
              <FindingBar
                key={finding.findingId}
                finding={finding}
                number={findingNumbers[finding.findingId] ?? "--"}
                selected={selectedFindingId === finding.findingId}
                onSelect={() => onSelectFinding(finding.findingId)}
                onHover={(on) => onHoverFinding(on ? finding.findingId : null)}
              />
            ))}

            {notes && (
              <div className={cn("space-y-2", findings.length > 0 && "pt-2")}>
                {notes.items.map((note) => (
                  <MarginNote
                    key={note.id}
                    note={note}
                    onUpdate={(text) => notes.onUpdate(note.id, text)}
                    onDelete={() => notes.onDelete(note.id)}
                  />
                ))}
                <AddMarginNote
                  onAdd={(text) => notes.onAdd(clause.id, text)}
                  visible={notes.items.length > 0}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
