"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DURATION, EASE, duration } from "@/lib/motion";
import { findingState } from "@/lib/findings";
import type { WorkspaceDocument, WorkspaceFinding } from "@/lib/types";
import { PIPELINE_LAYERS, clauseNumberFromReference } from "@/lib/types";
import { AddedByLabel } from "./added-by-label";
import { useReviewScope } from "./review-scope-context";
import { ScopeTagLabel } from "./scope-tag-label";
import { scopeNote } from "@/lib/reviewScope";
import { StateLabel } from "./state-label";
import { SeverityMark } from "./severity";
import { CitationBlock } from "./citation-block";
import { AuditTrail, type TrailEntry } from "./audit-trail";

type Draft = { kind: "note" } | { kind: "request" } | null;

const DRAFT_COPY = {
  note: {
    label: "Advocate note",
    placeholder: "Record the reasoning that settles this finding.",
    action: "Settle with note",
  },
  request: {
    label: "Request to the client",
    placeholder: "What do you need from the client before this can be settled?",
    action: "Send to client",
  },
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-meta font-medium text-ink">{title}</h3>
      {children}
    </section>
  );
}

/**
 * The finding, as a first-class object: what the concern is, what it
 * rests on, what was asked and answered, what has happened to it, and
 * the decision that is available now.
 *
 * Role is not cosmetic. The rule id, the pipeline layer and the
 * advocate's own notes are advocate-facing; the client reads the concern,
 * its source and the outcome. Only the advocate holding the document
 * adjudicates, so nobody else sees a decision control.
 */
export function FindingDetail({
  doc,
  finding,
  number,
  role,
  canAdjudicate,
  claim,
  onSettle,
  onReopen,
  onRequestChange,
  requestBlockedReason = null,
  busy = false,
  trail,
}: {
  doc: WorkspaceDocument;
  finding: WorkspaceFinding;
  number: string;
  role: "client" | "advocate";
  /** An advocate holding this document. */
  canAdjudicate: boolean;
  /** Offered to an advocate looking at a document nobody has claimed. */
  claim?: { onClaim: () => void; claiming: boolean; disabledReason: string | null };
  onSettle: (note: string | null) => void;
  onReopen: () => void;
  onRequestChange: (request: string) => void;
  /**
   * Why no revision request can be made, once the limit is reached. The
   * request buttons are not offered, and this is said in their place.
   * Settling and sign-off are unaffected.
   */
  requestBlockedReason?: string | null;
  busy?: boolean;
  /** The record to draw the history from. Each portal brings its own. */
  trail: TrailEntry[];
}) {
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState<Draft>(null);
  const [text, setText] = useState("");

  // A different finding in hand discards a half-written note rather than
  // carrying it over to a finding it was not written about.
  useEffect(() => {
    setDraft(null);
    setText("");
  }, [finding.findingId]);

  const state = findingState(finding);
  const settled = state === "settled";
  const tag = useReviewScope()?.tags[finding.findingId];
  const clauseNumber = clauseNumberFromReference(finding.clauseReference);
  const clause = doc.clauses.find((c) => c.number === clauseNumber);
  const history = trail.filter(
    (e) => (e.findingId ?? e.findingNumber) === finding.findingId,
  );
  const request = finding.changeRequest;
  // Each decision names the finding it is about, so a screen reader hears
  // which one a control acts on, not just the verb.
  const which = `finding ${number}, clause ${clauseNumber}`;

  function open(next: Draft, initial = "") {
    setDraft(next);
    setText(initial);
  }

  function submit() {
    const value = text.trim();
    if (!value || !draft) return;
    if (draft.kind === "note") onSettle(value);
    if (draft.kind === "request") onRequestChange(value);
    setDraft(null);
    setText("");
  }

  return (
    <motion.div
      key={finding.findingId}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration(DURATION.findingOpen, reduced), ease: EASE.standard }}
      className="flex min-h-full flex-col"
    >
      <div className="flex-1 space-y-6 p-4 lg:p-5">
        <header>
          <p className="font-mono text-meta text-muted-fg">
            Finding {number}
            <span aria-hidden className="mx-1.5 text-muted-fg">·</span>
            {/* A reference with no clause number ("Whole document") is said as it is, not as "Clause Whole document". */}
            {/\d/.test(clauseNumber) ? `Clause ${clauseNumber}` : clauseNumber}
          </p>
          <h2 className="mt-0.5 font-display text-h3 text-ink">
            {clause?.heading ?? finding.clauseReference}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SeverityMark severity={finding.severity} />
            <StateLabel state={state} />
            {finding.source === "advocate" && <AddedByLabel />}
            {tag && <ScopeTagLabel tag={tag} />}
          </div>
          {/* Said only where there is a decision to make. What was decided
              before, or decided this round, has its tag and nothing more. */}
          {tag && !settled && (
            <p className="mt-2 text-meta text-muted-fg">{scopeNote(tag, settled)}</p>
          )}
          <p className="mt-3 text-body text-ink">{finding.description}</p>
        </header>

        {/* Source sits directly under the concern: never behind a disclosure. */}
        <Section title="Source">
          <CitationBlock citation={finding.citation} bare />
        </Section>

        {/* R1 may leave the quoted span and the remedy out; an empty section is not shown as a blank one. */}
        {finding.clauseText.trim() && (
          <Section title="Passage">
            <blockquote className="border-l-2 border-line pl-3 font-clause text-body text-ink">
              {finding.clauseText}
            </blockquote>
          </Section>
        )}

        <Section title="Suggested remedy">
          {finding.remedySuggested.trim() ? (
            <p className="text-meta text-ink">{finding.remedySuggested}</p>
          ) : (
            <p className="text-meta text-muted-fg">No remedy was suggested.</p>
          )}
        </Section>

        {request && (
          <Section title="Requested from the client">
            <div className="space-y-3 border-l-2 border-move pl-3">
              <div>
                <p className="text-meta text-ink">{request.request}</p>
                <p className="mt-1 text-meta text-muted-fg">
                  {role === "client"
                    ? "Your advocate asked for your answer"
                    : `${request.requestedBy}, advocate`}{" "}
                  · {format(new Date(request.requestedAt), "d MMM yyyy")}
                </p>
              </div>
              {request.response ? (
                <div>
                  <p className="text-label font-medium text-muted-fg">Client response</p>
                  <p className="mt-1 text-meta text-ink">{request.response}</p>
                  {request.respondedAt && (
                    <p className="mt-1 text-meta text-muted-fg">
                      {doc.clientName} ·{" "}
                      {format(new Date(request.respondedAt), "d MMM yyyy")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-meta text-muted-fg">
                  Awaiting the client&apos;s response.
                </p>
              )}
            </div>
          </Section>
        )}

        {role === "advocate" && finding.overrideNote && (
          <Section title="Advocate note">
            <p className="border-l-2 border-accent pl-3 text-meta text-ink">
              {finding.overrideNote}
            </p>
          </Section>
        )}

        {role === "advocate" && (
          <Section title="Raised by">
            {finding.source === "advocate" ? (
              // No pipeline rule or layer is behind it, so none is named.
              <p className="text-meta text-ink">
                Added by the advocate in review. No pipeline rule is behind it.
              </p>
            ) : (
              <p className="font-mono text-meta text-muted-fg">
                {finding.ruleApplied}
                {finding.layer !== undefined && (
                  <>
                    <span aria-hidden className="mx-1.5 text-muted-fg">·</span>
                    Layer {finding.layer} · {PIPELINE_LAYERS[finding.layer].name}
                  </>
                )}
              </p>
            )}
          </Section>
        )}

        {history.length > 0 && <AuditTrail entries={history} title="History" />}
      </div>

      {/* The decision, pinned to the foot of the pane so it is always in
          reach however long the evidence above runs. */}
      {role === "advocate" && (
        <footer className="sticky bottom-0 border-t border-line bg-canvas p-4 lg:px-5">
          {!canAdjudicate ? (
            claim ? (
              <div className="space-y-2">
                <p className="text-meta text-ink">
                  Claim this document to decide its findings. Claiming
                  assigns it to you alone.
                </p>
                {claim.disabledReason && (
                  <p className="text-meta text-muted-fg">{claim.disabledReason}</p>
                )}
                <Button
                  size="sm"
                  onClick={claim.onClaim}
                  disabled={claim.claiming || Boolean(claim.disabledReason)}
                >
                  {claim.claiming ? "Claiming" : "Claim document"}
                </Button>
              </div>
            ) : (
              <p className="text-meta text-muted-fg">
                {doc.advocate ? `${doc.advocate.name} holds this document.` : "Read only."}
              </p>
            )
          ) : settled ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-meta text-ink">
                Settled
                {finding.resolvedAt &&
                  ` · ${format(new Date(finding.resolvedAt), "d MMM yyyy, HH:mm")}`}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={onReopen}
                disabled={busy}
                aria-label={`Reopen ${which}`}
              >
                Reopen
              </Button>
            </div>
          ) : draft ? (
            <div className="space-y-2">
              <label htmlFor="finding-draft" className="block text-label font-medium text-muted-fg">
                {DRAFT_COPY[draft.kind].label}
              </label>
              <Textarea
                id="finding-draft"
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={DRAFT_COPY[draft.kind].placeholder}
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setDraft(null);
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={busy || !text.trim()}
                  aria-label={`${DRAFT_COPY[draft.kind].action}, ${which}`}
                >
                  {DRAFT_COPY[draft.kind].action}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft(null)}
                  disabled={busy}
                  aria-label={`Cancel, ${which}`}
                >
                  Cancel
                </Button>
                <span className="ml-auto hidden font-mono text-label text-muted-fg sm:inline">
                  Ctrl ↵
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {state === "with_client" && (
                <p className="text-meta text-muted-fg">
                  The client has not answered yet. You can still decide it.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => onSettle(null)}
                  disabled={busy}
                  aria-label={`Settle ${which}`}
                  aria-keyshortcuts="C"
                >
                  Settle
                  <kbd className="font-mono text-label opacity-70">C</kbd>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => open({ kind: "note" })}
                  disabled={busy}
                  aria-label={`Settle with note, ${which}`}
                >
                  Settle with note
                </Button>
                {!request && !requestBlockedReason && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => open({ kind: "request" }, finding.remedySuggested)}
                    disabled={busy}
                    aria-label={`Request change, ${which}`}
                  >
                    Request change
                  </Button>
                )}
              </div>
              {!request && requestBlockedReason && (
                <p className="text-meta text-muted-fg">{requestBlockedReason}</p>
              )}
            </div>
          )}
        </footer>
      )}
    </motion.div>
  );
}
