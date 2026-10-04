"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { BackButton } from "@/components/shared/back-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConsultationStatus } from "@/components/domain/consultation-status";
import {
  MAX_QUESTION_LENGTH,
  listConsultations,
  payConsultation,
  requestConsultation,
} from "@/lib/api/consultations";
import { getDocument } from "@/lib/api/documents";
import { CONSULTATION, PRICE_BASIS, rupees } from "@/lib/config/pricing";
import type { Consultation, ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * Asking the advocate who settled the document.
 *
 * It names that advocate and no other: there is no list, search or choice,
 * because the advocate already settled this document and that is who the
 * conversation is with. Requesting is free. The fee is the advocate's, payable
 * only if they accept, and it is kept apart from the platform's fixed document
 * fee on the screen, in label and in line, so neither reads as part of the
 * other.
 */
export default function ConsultationPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [requests, setRequests] = useState<Consultation[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [found, list] = await Promise.all([
        getDocument(params.id),
        listConsultations(params.id),
      ]);
      if (!found) throw new Error("Document not found.");
      setDoc(found);
      setRequests(list);
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load this page.");
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    // State alone cannot stop two presses in one instant; the ref does.
    if (inFlight.current || !doc) return;
    inFlight.current = true;
    setSending(true);
    setFailed(null);
    try {
      const made = await requestConsultation(doc.id, question);
      setRequests((current) =>
        current.some((c) => c.id === made.id) ? current : [made, ...current],
      );
      setQuestion("");
      toast.success(`Request made to ${made.advocateName}`);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setSending(false);
      inFlight.current = false;
    }
  }

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-10 w-72" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Skeleton className="h-72 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const settled = (doc.status === "settled" || doc.status === "executed") && doc.advocate;
  if (!settled) {
    return (
      <div className="w-full">
        <div className="flex items-start gap-4">
          <BackButton fallbackHref={`/documents/${doc.id}`} label="Document" />
          <h1 className="font-display text-h1 text-ink">Request a consultation</h1>
        </div>
        <div className="mt-8 max-w-measure">
          <EmptyState
            title="Not available yet"
            description="A consultation is with the advocate who settled the document, so it opens once the document is signed off."
          />
        </div>
      </div>
    );
  }

  const advocate = doc.advocate!.name;

  return (
    <div className="w-full">
      <div className="flex items-start gap-4">
        <BackButton fallbackHref={`/documents/${doc.id}`} label="Document" />
        <div className="min-w-0">
          <h1 className="font-display text-h1 text-ink">Request a consultation</h1>
          <p className="mt-1 text-meta text-muted-fg">{doc.title}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0">
          <p className="max-w-measure text-body text-ink">
            A conversation with {advocate} ({doc.advocate!.bar}), who settled this document. It is
            with the advocate, and it is not part of the platform&apos;s fixed document fee.
          </p>

          <form onSubmit={send} className="mt-6 max-w-2xl" noValidate>
            <Label htmlFor="consultation-question">What would you like to ask?</Label>
            <Textarea
              id="consultation-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={7}
              maxLength={MAX_QUESTION_LENGTH}
              aria-describedby="consultation-question-note"
            />
            <p id="consultation-question-note" className="mt-1.5 text-label text-muted-fg">
              Your question goes to {advocate}. {question.length} of {MAX_QUESTION_LENGTH}{" "}
              characters.
            </p>

            {failed && (
              <p role="alert" className="mt-4 text-meta text-flagged">
                {failed}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Button type="submit" size="lg" disabled={sending || question.trim() === ""}>
                {sending ? "Sending" : "Request consultation"}
              </Button>
              <span className="text-meta text-muted-fg">
                Free to request. The fee is payable only if {advocate} accepts.
              </span>
            </div>
          </form>
        </section>

        <aside className="min-w-0 self-start space-y-4">
          <div className="rounded-card bg-parchment p-6">
            <h2 className="text-label font-medium text-muted-fg">The two fees</h2>
            <dl className="mt-4 space-y-5">
              <div>
                <dt className="text-label font-medium text-ink">Document fee · the platform</dt>
                <dd className="mt-1 text-meta text-muted-fg">
                  {doc.payment ? `${rupees(doc.payment.amount)} ${PRICE_BASIS}, paid. ` : ""}
                  One fixed fee for the document and its review. It does not include a
                  consultation.
                </dd>
              </div>
              <div>
                <dt className="text-label font-medium text-ink">Consultation fee · the advocate</dt>
                <dd className="mt-1 text-meta text-muted-fg">
                  {CONSULTATION.price} {PRICE_BASIS}. Fee payable if the advocate accepts.
                  Requesting is free.
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <section aria-labelledby="requests-title" className="mt-14 max-w-3xl">
        <h2 id="requests-title" className="text-label font-medium text-muted-fg">
          Your consultation requests
        </h2>
        {requests.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No requests yet"
              description="A request you make appears here, with the advocate it went to."
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <RequestItem
                key={r.id}
                request={r}
                onChanged={(next) =>
                  setRequests((current) => current.map((c) => (c.id === next.id ? next : c)))
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * One request in the client's list, in the state it is in.
 *
 * The fee appears only once the advocate has accepted, and money moves only
 * when it is paid here. A declined request says plainly that nothing was
 * charged. The advocate's answer is shown once the fee is paid, and the API
 * does not hand it over before that.
 */
function RequestItem({
  request: r,
  onChanged,
}: {
  request: Consultation;
  onChanged: (next: Consultation) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // State alone cannot stop two presses in one instant; the ref does.
  const inFlight = useRef(false);

  const paid = r.paidAt !== null;

  async function pay() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPaying(true);
    setFailed(null);
    try {
      onChanged(await payConsultation(r.id));
      toast.success("Consultation fee paid");
    } catch (err) {
      setFailed(
        err instanceof Error ? err.message : "The payment did not go through. Try again.",
      );
    } finally {
      setPaying(false);
      inFlight.current = false;
    }
  }

  return (
    <li className="rounded-card bg-parchment p-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted-fg">
        <span>
          {r.advocateName} · {format(new Date(r.requestedAt), "d MMM yyyy")}
        </span>
        <ConsultationStatus consultation={{ status: r.status, paid }} audience="client" />
      </p>
      <p className="mt-2 line-clamp-3 max-w-measure whitespace-pre-line text-meta text-ink">
        {r.question}
      </p>

      {r.status === "requested" && (
        <p className="mt-2 text-label text-muted-fg">
          Fee payable if the advocate accepts, {PRICE_BASIS}.
        </p>
      )}

      {r.status === "declined" && (
        <p className="mt-2 text-label text-muted-fg">
          The advocate declined this request. You were not charged.
        </p>
      )}

      {r.status === "accepted" && !paid && r.fee !== null && (
        <div className="mt-4 max-w-md rounded-card bg-paper p-5">
          <p className="text-label font-medium text-muted-fg">Consultation fee · the advocate</p>
          <p className="mt-2 font-display text-h2 text-ink">{rupees(r.fee)}</p>
          <p className="text-meta text-muted-fg">{PRICE_BASIS}</p>
          <p className="mt-3 text-meta text-ink">
            {r.advocateName} accepted. Nothing is charged until you pay. This is separate from the
            document fee.
          </p>
          <p className="mt-1 text-label text-muted-fg">GST is added at the rate in force.</p>

          {failed && (
            <p role="alert" className="mt-4 text-meta text-flagged">
              {failed}
            </p>
          )}

          <Button className="mt-4 w-full" size="lg" onClick={pay} disabled={paying}>
            {paying ? "Paying" : failed ? "Try again" : "Pay (preview)"}
          </Button>
          <p className="mt-3 text-label text-muted-fg">Preview. No payment is taken.</p>
        </div>
      )}

      {r.status === "accepted" && paid && (
        <p className="mt-2 text-label text-muted-fg">
          Paid. {r.advocateName} will answer here.
        </p>
      )}

      {r.status === "answered" && r.answer && (
        <div className="mt-4 border-l-2 border-line pl-4">
          <p className="text-label font-medium text-muted-fg">Answer from {r.advocateName}</p>
          <p className="mt-1.5 max-w-measure whitespace-pre-line text-meta text-ink">{r.answer}</p>
          {r.answeredAt && (
            <p className="mt-1.5 text-label text-muted-fg">
              {format(new Date(r.answeredAt), "d MMM yyyy")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
