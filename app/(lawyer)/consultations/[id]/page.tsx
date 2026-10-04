"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConsultationStatus } from "@/components/domain/consultation-status";
import { BackButton } from "@/components/shared/back-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_ANSWER_LENGTH,
  acceptConsultation,
  answerConsultation,
  declineConsultation,
  getAdvocateConsultation,
} from "@/lib/api/consultations";
import { CONSULTATION, PRICE_BASIS } from "@/lib/config/pricing";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { AdvocateConsultation } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * One request, with its question.
 *
 * The question is read here and nowhere else: not in the list, not in the tab
 * title, not in a tooltip. A request that is not this advocate's and one that
 * does not exist show the same thing, so a followed link tells nobody that it
 * exists.
 *
 * The advocate moves it by accepting (which sets the flat fee for the client to
 * pay) or declining (free, never chargeable), and answers once the client has
 * paid. They see whether it is paid and nothing of how.
 */
export default function ConsultationRequestPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<AdvocateConsultation | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [answer, setAnswer] = useState("");
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | "answer" | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setRequest(await getAdvocateConsultation(CURRENT_ADVOCATE.id, params.id));
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load this request.");
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // One move at a time. State alone cannot stop two presses in one instant; the
  // ref does, and the API makes the second a no-op as well.
  async function move(
    kind: "accept" | "decline" | "answer",
    run: () => Promise<AdvocateConsultation>,
    done: string,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(kind);
    setFailed(null);
    try {
      setRequest(await run());
      setConfirmingDecline(false);
      toast.success(done);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "That did not go through.");
    } finally {
      setBusy(null);
      inFlight.current = false;
    }
  }

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-10 h-56 w-full max-w-3xl rounded-card" />
      </div>
    );
  }

  if (state === "error") {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  if (!request) {
    return (
      <div className="w-full">
        <div className="flex items-start gap-4">
          <BackButton fallbackHref="/consultations" label="Consultations" />
          <h1 className="font-display text-h1 text-ink">Request not found</h1>
        </div>
        <div className="mt-8 max-w-xl">
          <EmptyState
            title="Request not found."
            description="It may have been removed, or the link may be wrong."
            action={
              <Button asChild variant="outline">
                <Link href="/consultations">All consultations</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const clientName = request.clientName;

  return (
    <div className="w-full">
      <div className="flex items-start gap-4">
        <BackButton fallbackHref="/consultations" label="Consultations" />
        <div className="min-w-0">
          <h1 className="font-display text-h1 text-ink">Consultation request</h1>
          <p className="mt-1 text-meta text-muted-fg">
            {request.documentTitle}
            <span className="mx-1.5 text-muted-fg/50">·</span>
            {clientName}
            <span className="mx-1.5 text-muted-fg/50">·</span>
            requested {format(new Date(request.requestedAt), "d MMM yyyy")}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-label font-medium text-muted-fg">The question</h2>
            <ConsultationStatus consultation={request} audience="advocate" />
          </div>
          <p className="mt-3 max-w-measure whitespace-pre-line text-body text-ink">
            {request.question}
          </p>

          {request.status === "answered" && request.answer && (
            <div className="mt-10">
              <h2 className="text-label font-medium text-muted-fg">Your answer</h2>
              <p className="mt-3 max-w-measure whitespace-pre-line text-body text-ink">
                {request.answer}
              </p>
              {request.answeredAt && (
                <p className="mt-2 text-label text-muted-fg">
                  Sent {format(new Date(request.answeredAt), "d MMM yyyy")}
                </p>
              )}
            </div>
          )}

          {request.status === "accepted" && request.paid && (
            <form
              className="mt-10 max-w-2xl"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                move(
                  "answer",
                  () => answerConsultation(CURRENT_ADVOCATE.id, request.id, answer),
                  "Answer sent",
                );
              }}
            >
              <Label htmlFor="consultation-answer">Your answer</Label>
              <Textarea
                id="consultation-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={9}
                maxLength={MAX_ANSWER_LENGTH}
                aria-describedby="consultation-answer-note"
              />
              <p id="consultation-answer-note" className="mt-1.5 text-label text-muted-fg">
                It goes to {clientName} and stays with the request. {answer.length} of{" "}
                {MAX_ANSWER_LENGTH} characters.
              </p>
              <Button
                type="submit"
                size="lg"
                className="mt-5"
                disabled={busy !== null || answer.trim() === ""}
              >
                {busy === "answer" ? "Sending" : "Send answer"}
              </Button>
            </form>
          )}

          {failed && (
            <p role="alert" className="mt-6 text-meta text-flagged">
              {failed}
            </p>
          )}
        </section>

        <aside className="min-w-0 self-start space-y-4">
          <div className="rounded-card bg-parchment p-6">
            <h2 className="text-label font-medium text-muted-fg">Where it stands</h2>

            {request.status === "requested" && (
              <div className="mt-4 space-y-4">
                <p className="text-meta text-ink">
                  Accepting sets the consultation fee: {CONSULTATION.price} {PRICE_BASIS}, flat,
                  for {clientName} to pay. Declining is free and never chargeable.
                </p>
                {confirmingDecline ? (
                  <div className="space-y-3">
                    <p className="text-meta text-ink">
                      Decline this request? It shows to {clientName} as declined, and they are not
                      charged.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() =>
                          move(
                            "decline",
                            () => declineConsultation(CURRENT_ADVOCATE.id, request.id),
                            "Request declined",
                          )
                        }
                      >
                        {busy === "decline" ? "Declining" : "Confirm decline"}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => setConfirmingDecline(false)}
                      >
                        Keep it
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy !== null}
                      onClick={() =>
                        move(
                          "accept",
                          () => acceptConsultation(CURRENT_ADVOCATE.id, request.id),
                          "Request accepted",
                        )
                      }
                    >
                      {busy === "accept" ? "Accepting" : "Accept"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => setConfirmingDecline(true)}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            )}

            {request.status === "accepted" && !request.paid && (
              <p className="mt-4 text-meta text-ink">
                Accepted. The fee is with {clientName} to pay. You can answer once it is paid.
              </p>
            )}

            {request.status === "accepted" && request.paid && (
              <p className="mt-4 text-meta text-ink">
                The fee is paid. Your answer goes to {clientName}.
              </p>
            )}

            {request.status === "declined" && (
              <p className="mt-4 text-meta text-ink">
                Declined
                {request.declinedAt
                  ? ` on ${format(new Date(request.declinedAt), "d MMM yyyy")}`
                  : ""}
                . Nothing was charged.
              </p>
            )}

            {request.status === "answered" && (
              <p className="mt-4 text-meta text-ink">Answered. There is nothing more to do.</p>
            )}
          </div>

          <p className="text-label text-muted-fg">
            This request is yours alone. It is not in the document&apos;s audit trail and not in
            any notification.
          </p>
        </aside>
      </div>
    </div>
  );
}
