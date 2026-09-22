"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DURATION, EASE, duration } from "@/lib/motion";
import { canSettle, findingState } from "@/lib/findings";
import type { ContractDocument, Finding } from "@/lib/types";
import { PIPELINE_LAYERS } from "@/lib/types";
import { Dateline } from "./dateline";
import { StateLabel } from "./state-label";
import { CitationBlock } from "./citation-block";

/**
 * The finding, with its evidence beside it.
 *
 * Role is not cosmetic. Per Dashboard_Data_Spec.md the rule id, the
 * override note and the pipeline layer are advocate-facing detail; the
 * client stays at the "what is happening with my document" level and
 * never sees the rule machinery. Only an advocate adjudicates, so the
 * client view carries no settle control at all.
 */
export function FindingDetail({
  doc,
  finding,
  number,
  role,
  onSettle,
  onReopen,
  busy = false,
}: {
  doc: ContractDocument;
  finding: Finding;
  number: string;
  role: "client" | "advocate";
  onSettle: (note: string | null) => void;
  onReopen: () => void;
  busy?: boolean;
}) {
  const reduced = useReducedMotion();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");

  const settled = findingState(finding) === "settled";
  const settleable = canSettle(finding);

  const raisedBy = `AI first pass · ${format(new Date(doc.createdAt), "d MMM yyyy")}`;
  const resolvedBy =
    settled && doc.advocate ? `${doc.advocate.name}, advocate` : null;

  return (
    <motion.div
      key={finding.findingId}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: duration(DURATION.findingOpen, reduced),
        ease: EASE.standard,
      }}
      className="space-y-decision"
    >
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <Dateline segments={[`Finding ${number}`, finding.clauseReference]} />
          <StateLabel state={settled ? "settled" : "open"} />
        </div>

        <p className="text-body text-ink">{finding.description}</p>

        {/* Advocate-only: the rule machinery behind the concern. */}
        {role === "advocate" && (
          <Dateline
            segments={[
              finding.ruleApplied,
              `Layer ${finding.layer} · ${PIPELINE_LAYERS[finding.layer].name}`,
            ]}
          />
        )}
      </header>

      <section>
        <h3 className="mb-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
          The passage
        </h3>
        <blockquote className="border-l-2 border-line pl-4 font-display text-body text-ink">
          {finding.clauseText}
        </blockquote>
      </section>

      <section>
        <h3 className="mb-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
          Source
        </h3>
        <CitationBlock
          citations={finding.citations}
          raisedBy={raisedBy}
          resolvedBy={resolvedBy}
        />
      </section>

      <section>
        <h3 className="mb-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
          Suggested remedy
        </h3>
        <p className="text-meta text-ink">{finding.remedySuggested}</p>
      </section>

      {/* The advocate's own words, once recorded, are part of the
          document's record and are shown to the advocate who reads it
          next. They are never surfaced to the client. */}
      {role === "advocate" && finding.overrideNote && (
        <section>
          <h3 className="mb-3 font-mono text-notation uppercase tracking-notation text-muted-fg">
            Advocate note
          </h3>
          <p className="border-l-2 border-accent pl-4 text-meta text-ink">
            {finding.overrideNote}
          </p>
        </section>
      )}

      {role === "advocate" && (
        <footer className="border-t border-line pt-6">
          {settled ? (
            <div className="space-y-3">
              <p className="text-meta text-muted-fg">
                This finding is settled. Reopening it returns the document
                to the queue.
              </p>
              <Button variant="outline" onClick={onReopen} disabled={busy}>
                Reopen finding
              </Button>
            </div>
          ) : !settleable ? (
            // State the fact, then the owner. The reason lives in text
            // beside the control, not only in a tooltip.
            <div className="space-y-3">
              <p className="text-meta text-flagged">
                This finding cannot be settled while its source is blocked.
                Resolve the citation against the corpus first.
              </p>
              <Button disabled>Settle finding</Button>
            </div>
          ) : noteOpen ? (
            <div className="space-y-3">
              <label
                htmlFor="advocate-note"
                className="block font-mono text-notation uppercase tracking-notation text-muted-fg"
              >
                Advocate note
              </label>
              <Textarea
                id="advocate-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Record the reasoning that settles this finding."
                rows={4}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => onSettle(note.trim() || null)}
                  disabled={busy || !note.trim()}
                >
                  Settle with note
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setNoteOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => onSettle(null)} disabled={busy}>
                Settle finding
              </Button>
              <Button
                variant="outline"
                onClick={() => setNoteOpen(true)}
                disabled={busy}
              >
                Settle with note
              </Button>
            </div>
          )}
        </footer>
      )}
    </motion.div>
  );
}
