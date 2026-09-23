"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DURATION, EASE, duration } from "@/lib/motion";
import {
  blockingCitations,
  findingState,
  settleNeedsNote,
} from "@/lib/findings";
import { buildAuditTrail } from "@/lib/audit";
import type { ContractDocument, Finding } from "@/lib/types";
import { PIPELINE_LAYERS, clauseNumberFromReference } from "@/lib/types";
import { StateLabel } from "./state-label";
import { SeverityMark } from "./severity";
import { CitationBlock } from "./citation-block";
import { AuditTrail } from "./audit-trail";

type Draft =
  | { kind: "note" }
  | { kind: "request" }
  | { kind: "withdraw"; citationId: string }
  | null;

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
  withdraw: {
    label: "Why the finding stands without this source",
    placeholder: "The finding will rest on your judgment. Record why.",
    action: "Withdraw source",
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
      <h3 className="mb-2 text-label font-medium text-muted-fg">{title}</h3>
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
  onWithdrawSource,
  busy = false,
}: {
  doc: ContractDocument;
  finding: Finding;
  number: string;
  role: "client" | "advocate";
  /** An advocate holding this document. */
  canAdjudicate: boolean;
  /** Offered to an advocate looking at a document nobody has claimed. */
  claim?: { onClaim: () => void; claiming: boolean; disabledReason: string | null };
  onSettle: (note: string | null) => void;
  onReopen: () => void;
  onRequestChange: (request: string) => void;
  onWithdrawSource: (citationId: string, note: string) => void;
  busy?: boolean;
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
  const blocked = blockingCitations(finding).length > 0;
  const needsNote = settleNeedsNote(finding);
  const clauseNumber = clauseNumberFromReference(finding.clauseReference);
  const clause = doc.clauses.find((c) => c.number === clauseNumber);
  const history = buildAuditTrail(doc).filter((e) => e.findingId === finding.findingId);
  const request = finding.changeRequest;

  function open(next: Draft, initial = "") {
    setDraft(next);
    setText(initial);
  }

  function submit() {
    const value = text.trim();
    if (!value || !draft) return;
    if (draft.kind === "note") onSettle(value);
    if (draft.kind === "request") onRequestChange(value);
    if (draft.kind === "withdraw") onWithdrawSource(draft.citationId, value);
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
          <p className="font-mono text-label text-muted-fg">
            Finding {number}
            <span className="mx-1.5 text-line">·</span>
            Clause {clauseNumber}
          </p>
          <h2 className="mt-0.5 font-display text-h3 text-ink">
            {clause?.heading ?? finding.clauseReference}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SeverityMark severity={finding.severity} />
            <StateLabel state={state} />
            {blocked && <StateLabel state="citation_blocked" />}
          </div>
          <p className="mt-3 text-body text-ink">{finding.description}</p>
        </header>

        {/* Source sits directly under the concern: never behind a disclosure. */}
        <Section title="Source">
          <CitationBlock
            citations={finding.citations}
            showWithdrawalNote={role === "advocate"}
            blockedActions={
              canAdjudicate && !settled
                ? (citation) =>
                    draft?.kind === "withdraw" ? null : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => open({ kind: "withdraw", citationId: citation.id })}
                        >
                          Withdraw source
                        </Button>
                        {!request && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => open({ kind: "request" }, finding.remedySuggested)}
                          >
                            Ask the client instead
                          </Button>
                        )}
                      </div>
                    )
                : undefined
            }
          />
        </Section>

        <Section title="Passage">
          <blockquote className="border-l-2 border-line pl-3 font-clause text-body text-ink">
            {finding.clauseText}
          </blockquote>
        </Section>

        <Section title="Suggested remedy">
          <p className="text-meta text-ink">{finding.remedySuggested}</p>
        </Section>

        {request && (
          <Section title="Requested from the client">
            <div className="space-y-3 border-l-2 border-caution pl-3">
              <div>
                <p className="text-meta text-ink">{request.request}</p>
                <p className="mt-1 text-label text-muted-fg">
                  {request.requestedBy}, advocate ·{" "}
                  {format(new Date(request.requestedAt), "d MMM yyyy")}
                </p>
              </div>
              {request.response ? (
                <div>
                  <p className="text-label font-medium text-muted-fg">Client response</p>
                  <p className="mt-1 text-meta text-ink">{request.response}</p>
                  {request.respondedAt && (
                    <p className="mt-1 text-label text-muted-fg">
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
            <p className="font-mono text-label text-muted-fg">
              {finding.ruleApplied}
              <span className="mx-1.5 text-line">·</span>
              Layer {finding.layer} · {PIPELINE_LAYERS[finding.layer].name}
            </p>
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
              <Button size="sm" variant="outline" onClick={onReopen} disabled={busy}>
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
                <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>
                  {DRAFT_COPY[draft.kind].action}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                  Cancel
                </Button>
                <span className="ml-auto hidden font-mono text-label text-muted-fg sm:inline">
                  Ctrl ↵
                </span>
              </div>
            </div>
          ) : blocked ? (
            <div className="space-y-1">
              <p className="text-meta text-flagged">
                Settling is unavailable while the source is blocked.
              </p>
              <p className="text-meta text-muted-fg">
                Withdraw the source above, or ask the client to resolve the clause.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {needsNote && (
                <p className="text-meta text-muted-fg">
                  No verified source remains, so settling needs your reasoning
                  on the record.
                </p>
              )}
              {state === "with_client" && (
                <p className="text-meta text-muted-fg">
                  The client has not answered yet. You can still decide it.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {!needsNote && (
                  <Button size="sm" onClick={() => onSettle(null)} disabled={busy}>
                    Settle
                    <kbd className="font-mono text-label opacity-70">C</kbd>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={needsNote ? "default" : "outline"}
                  onClick={() => open({ kind: "note" })}
                  disabled={busy}
                >
                  Settle with note
                </Button>
                {!request && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => open({ kind: "request" }, finding.remedySuggested)}
                    disabled={busy}
                  >
                    Request change
                  </Button>
                )}
              </div>
            </div>
          )}
        </footer>
      )}
    </motion.div>
  );
}
