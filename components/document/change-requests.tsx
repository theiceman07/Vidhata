"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { Textarea } from "@/components/ui/textarea";
import type { ClientDocument } from "@/lib/types";
import { clauseNumberFromReference } from "@/lib/types";

/**
 * What the advocate asked for, and the client's answers.
 *
 * "Changes requested" used to be a state label with nothing behind it.
 * Here it is the list of requests itself: each one on the clause it
 * concerns, in the advocate's words, with a place to answer. The answers
 * go back as one submission, which is what makes the next draft a draft.
 *
 * The client sees the passage in question and the request, never the
 * rule machinery or the first pass's own wording of the concern, and never
 * who asked: before sign-off they are told "your advocate". Each request is
 * named by the number the client reads its finding by, and the answers go back
 * keyed by it.
 *
 * Every request addressed to the client stays listed until they answer it. It
 * does not leave the list when the advocate settles its finding, because that
 * would tell the client a decision had been made, and the wording says only
 * that the advocate asked.
 *
 * Each request is a parchment sheet: the passage and the request on one
 * side, the answer beside it where the screen allows. Sheets are divided
 * by space, not rules.
 */
export function ChangeRequests({
  doc,
  onSubmit,
  submitting,
}: {
  doc: Pick<ClientDocument, "clauses" | "findingList" | "version">;
  /** The answers, keyed by the number the client reads each finding by. */
  onSubmit: (responses: Record<string, string>) => void;
  submitting: boolean;
}) {
  const requested = doc.findingList.filter((f) => f.request !== null);
  const open = requested.filter((f) => !f.request?.response);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const ready = open.every((f) => (answers[f.number] ?? "").trim().length > 0);

  // The one submit control. With a single open request it sits under that
  // request's answer field, so read, answer and send are one motion; with
  // several, answers go back together, so it follows the last sheet.
  const button = (
    <Button
      size="lg"
      className="bg-brand text-white hover:bg-brand-deep disabled:bg-line disabled:text-muted disabled:opacity-100 max-md:w-full"
      onClick={() => onSubmit(answers)}
      disabled={!ready || submitting}
    >
      {submitting
        ? "Sending"
        : open.length === 1
          ? "Send response to the advocate"
          : `Send ${open.length} responses to the advocate`}
      <Icon name="send" size={18} />
    </Button>
  );
  const status = (
    <p className="max-w-md text-small text-muted">
      {ready
        ? `Your answers go back together. The advocate then settles each finding, and the document becomes Draft ${doc.version + 1}.`
        : open.length === 1
          ? "Write your answer to enable sending."
          : "Answer every request to send them back together."}
    </p>
  );
  const submit = (
    <div className="flex flex-col items-start gap-3 max-md:w-full">
      {button}
      {status}
    </div>
  );
  const submitInCard = open.length === 1;

  return (
    <div>
      <ol className="space-y-5">
        {requested.map((finding, i) => {
          const request = finding.request;
          if (!request) return null;
          const number = clauseNumberFromReference(finding.clauseReference);
          const clause = doc.clauses.find((c) => c.number === number);
          const fieldId = `response-${finding.number}`;

          return (
            <li key={finding.number} className="overflow-hidden rounded-card bg-surface">
              <div className="px-6 pb-6 pt-5 md:px-8">
                <p className="text-meta text-muted">
                  Request {i + 1} of {requested.length}
                  <span aria-hidden className="mx-1.5">·</span>
                  Clause {number}
                </p>
                <h2 className="mt-1 font-display text-h2 text-ink">
                  {clause?.heading ?? finding.clauseReference}
                </h2>

                <p className="mt-4 text-meta font-medium text-ink">Current clause wording</p>
                <blockquote className="mt-2 rounded-card bg-paper px-5 py-3 font-clause text-h3 leading-[1.45] text-ink">
                  {finding.clauseText}
                </blockquote>

                {/* The advocate's words: marigold, because it is the client's move. */}
                <div className="mt-3 flex gap-4 rounded-card bg-move-tint px-5 py-3.5">
                  <Icon name="rate_review" size={24} className="mt-0.5 text-ink" />
                  <div className="min-w-0">
                    <p className="text-body leading-[1.6] text-ink">{request.request}</p>
                    <p className="mt-2 text-small text-ink">
                      Your advocate asked for your answer ·{" "}
                      {format(new Date(request.requestedAt), "d MMM yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              {request.response ? (
                <div className="bg-sand p-6 md:px-8">
                  <p className="text-meta font-medium text-ink">Your response</p>
                  <p className="mt-1 text-body text-ink">{request.response}</p>
                </div>
              ) : (
                <div className="bg-sand px-6 py-4 md:px-8">
                  <label htmlFor={fieldId} className="block font-display text-h3 text-ink">
                    Your response
                  </label>
                  <Textarea
                    id={fieldId}
                    className="mt-2 min-h-[4.5rem] rounded-card border-2 border-line bg-surface px-5 py-4 text-body text-ink focus-visible:border-brand focus-visible:ring-0 [field-sizing:content]"
                    rows={4}
                    value={answers[finding.number] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [finding.number]: e.target.value,
                      }))
                    }
                    placeholder="Confirm, decline, or tell the advocate what you need instead."
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <div className="min-w-0 flex-1 basis-[14rem] space-y-0.5">
                      <p className="text-small text-muted">
                        Goes to your advocate only, and stays on this document&apos;s record.
                      </p>
                      {submitInCard && status}
                    </div>
                    {submitInCard && <div className="max-md:w-full">{button}</div>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {open.length > 1 && <div className="mt-6">{submit}</div>}
    </div>
  );
}
