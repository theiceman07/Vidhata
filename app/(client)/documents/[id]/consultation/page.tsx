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
import {
  MAX_QUESTION_LENGTH,
  listConsultations,
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
      toast.success(`Request sent to ${made.advocateName}`);
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
              <li key={r.id} className="rounded-card bg-parchment p-5">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted-fg">
                  <span>
                    {r.advocateName} · {format(new Date(r.requestedAt), "d MMM yyyy")}
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-medium text-ink">
                    Requested
                  </span>
                </p>
                <p className="mt-2 line-clamp-3 max-w-measure whitespace-pre-line text-meta text-ink">
                  {r.question}
                </p>
                <p className="mt-2 text-label text-muted-fg">
                  Fee payable if the advocate accepts, {PRICE_BASIS}.
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
