"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ContractDocument } from "@/lib/types";
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
 * rule machinery or the first pass's own wording of the concern.
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
  doc: ContractDocument;
  onSubmit: (responses: Record<string, string>) => void;
  submitting: boolean;
}) {
  const requested = doc.findings.filter(
    (f) => f.disposition === "pending" && f.changeRequest,
  );
  const open = requested.filter((f) => !f.changeRequest?.response);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const ready = open.every((f) => (answers[f.findingId] ?? "").trim().length > 0);

  return (
    <div>
      <ol className="space-y-4">
        {requested.map((finding, i) => {
          const request = finding.changeRequest;
          if (!request) return null;
          const number = clauseNumberFromReference(finding.clauseReference);
          const clause = doc.clauses.find((c) => c.number === number);
          const fieldId = `response-${finding.findingId}`;

          return (
            <li
              key={finding.findingId}
              className="grid gap-x-10 gap-y-6 rounded-card bg-parchment p-6 md:p-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <p className="text-label text-muted-fg">
                  Request {i + 1} of {requested.length}
                  <span className="mx-1.5 text-muted-fg/50">·</span>
                  <span className="font-mono">Clause {number}</span>
                </p>
                <h3 className="mt-0.5 font-display text-h3 text-ink">
                  {clause?.heading ?? finding.clauseReference}
                </h3>

                <blockquote className="mt-4 rounded-control bg-paper px-5 py-4 font-clause text-body text-ink">
                  {finding.clauseText}
                </blockquote>

                {/* The one mark kept: caution, in the margin, on the
                    advocate's words. It is a status, not a divider. */}
                <div className="mt-5 border-l-2 border-caution pl-4">
                  <p className="text-body text-ink">{request.request}</p>
                  <p className="mt-1 text-label text-muted-fg">
                    {request.requestedBy}, advocate ·{" "}
                    {format(new Date(request.requestedAt), "d MMM yyyy")}
                  </p>
                </div>
              </div>

              {request.response ? (
                <div className="min-w-0 xl:pt-7">
                  <p className="text-label font-medium text-muted-fg">Your response</p>
                  <p className="mt-1 text-meta text-ink">{request.response}</p>
                </div>
              ) : (
                <div className="flex min-w-0 flex-col xl:pt-7">
                  <label
                    htmlFor={fieldId}
                    className="block text-label font-medium text-muted-fg"
                  >
                    Your response
                  </label>
                  <Textarea
                    id={fieldId}
                    className="mt-1.5 flex-1 xl:min-h-[10rem]"
                    rows={4}
                    value={answers[finding.findingId] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [finding.findingId]: e.target.value,
                      }))
                    }
                    placeholder="Confirm, decline, or tell the advocate what you need instead."
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {open.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button onClick={() => onSubmit(answers)} disabled={!ready || submitting}>
            {submitting
              ? "Sending"
              : open.length === 1
                ? "Send response to the advocate"
                : `Send ${open.length} responses to the advocate`}
          </Button>
          <p className="max-w-md text-meta text-muted-fg">
            {ready
              ? `Your answers go back together. The advocate then settles each finding, and the document becomes Draft ${doc.version + 1}.`
              : "Answer every request to send them back together."}
          </p>
        </div>
      )}
    </div>
  );
}
