"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConsultationStatus } from "@/components/domain/consultation-status";
import {
  MAX_QUESTION_LENGTH,
  listClientConsultations,
  payClientConsultation,
  requestClientConsultation,
} from "@/lib/api/client/consultations";
import { getClientDocument } from "@/lib/api/client/documents";
import {
  CONSULTATION,
  PRICE_BASIS,
  TIER_PRICING,
  rupees,
} from "@/lib/config/pricing";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ClientConsultation, ClientDocument } from "@/lib/types";
import { cn } from "@/lib/utils";
import { documentIdentity } from "@/lib/documentTitle";
import { StateLabel } from "@/components/document/state-label";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentTabs } from "@/components/document/document-tabs";

const ORG = MOCK_CLIENT_ORG.id;

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
  const [doc, setDoc] = useState<ClientDocument | null>(null);
  const [requests, setRequests] = useState<ClientConsultation[]>([]);
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
        getClientDocument(ORG, params.id),
        listClientConsultations(ORG, params.id),
      ]);
      if (!found) throw new Error("Document not found.");
      setDoc(found);
      setRequests(list);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this page.",
      );
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
      const made = await requestClientConsultation(ORG, doc.id, question);
      setRequests((current) =>
        current.some((c) => c.id === made.id) ? current : [made, ...current],
      );
      setQuestion("");
      toast.success(`Request made to ${made.advocateName}`);
    } catch (err) {
      setFailed(
        err instanceof Error ? err.message : "Could not send your request.",
      );
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

  // The advocate to ask is the one on the recorded sign-off, and until there is one there is no one to ask.
  const signOff = doc.signOff;
  if (!signOff) {
    return (
      <div className="w-full">
        <PageHeader
          back={{ fallbackHref: `/documents/${doc.id}`, label: "Document" }}
          title="Request a consultation"
        />
        <div className="max-w-measure">
          <EmptyState
            title="Not available yet"
            description="A consultation is with the advocate who settled the document, so it opens once the document is signed off."
          />
        </div>
      </div>
    );
  }

  const advocate = signOff.advocate;

  return (
    <div className="w-full">
      <PageHeader
        stacked
        status={<StateLabel state={doc.status} />}
        back={{ fallbackHref: `/documents/${doc.id}`, label: "Document" }}
        title={documentIdentity(doc.title).name}
        meta={[documentIdentity(doc.title).with]}
        tabs={<DocumentTabs documentId={doc.id} signedOff={true} />}
      />

      {/* The ask on the left, filling the width it is given; the requests quietly under it; the fee
          that is due, with the paid one set small, on the right. */}
      <div className="grid gap-x-6 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col">
          <section
            aria-labelledby="ask-title"
            className="flex min-w-0 flex-1 flex-col rounded-card bg-surface p-6 md:min-h-[32rem]"
          >
            <h2 id="ask-title" className="font-display text-h3 text-ink">
              Ask {advocate}
            </h2>
            <p className="mt-1 text-meta text-muted-fg">
              Settled this document · Bar enrolment{" "}
              <span className="font-mono">{signOff.enrolment}</span>
            </p>
            <form
              onSubmit={send}
              noValidate
              className="mt-4 flex min-h-0 flex-1 flex-col"
            >
              <Label htmlFor="consultation-question" className="text-body font-medium text-ink">
                What would you like to ask {advocate}?
              </Label>
              <p className="mt-1 text-meta text-muted-fg">
                Name the clause or term you mean and what you want explained.
              </p>
              <Textarea
                id="consultation-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                placeholder="For example: what does the confidentiality clause cover when we share information in a meeting?"
                maxLength={MAX_QUESTION_LENGTH}
                aria-describedby="consultation-question-note"
                // The field's edge has to be seen: the shared line colour is 1.3:1 on the page.
                className="mt-2 min-h-0 flex-1 resize-none border-muted-fg/60 bg-surface text-body md:text-body"
              />
              <div className="mt-1.5 flex items-center justify-between gap-4">
                <p
                  id="consultation-question-note"
                  className="text-meta text-muted-fg"
                >
                  {question.length} of {MAX_QUESTION_LENGTH} characters
                </p>
                <span className="text-meta text-muted-fg">
                  Requesting is free.
                </span>
              </div>

              {failed && (
                <p role="alert" className="mt-4 text-meta text-ink">
                  {failed}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={sending || question.trim() === ""}
                >
                  {sending ? "Sending" : "Request consultation"}
                </Button>
                {question.trim() === "" && (
                  <span className="text-meta text-muted-fg">
                    Write your question to send it.
                  </span>
                )}
              </div>
            </form>
          </section>
        </div>

        <div className="min-w-0 self-start">
          <section aria-labelledby="fees-title" className="min-w-0">
            <h2 id="fees-title" className="font-display text-h3 text-ink">
              Fees and payment
            </h2>
            <div className="mt-4 rounded-card bg-parchment p-6">
              <p className="text-label font-medium text-muted-fg">
                Consultation fee · the advocate
              </p>
              <p className="mt-2 font-display text-h1 text-ink">
                {CONSULTATION.price}
              </p>
              <p className="text-meta text-muted-fg">{PRICE_BASIS}</p>
              <p className="mt-3 text-meta text-ink">
                Payable only if {advocate} accepts.
              </p>
            </div>
            <div className="mt-3 rounded-card bg-parchment p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-body font-medium text-ink">
                  Document fee
                  <span className="text-meta font-normal text-muted-fg"> · the platform</span>
                </span>
                <span className="text-body text-ink">
                  {doc.paidAt && doc.tier
                    ? `${rupees(TIER_PRICING[doc.tier].amount)} ${PRICE_BASIS} · Paid`
                    : "Fixed fee"}
                </span>
              </div>
              <p className="mt-1 text-meta text-muted-fg">
                One fixed fee for the document and its review. It does not
                include a consultation.
              </p>
            </div>
          </section>
          <section aria-labelledby="requests-title" className="mt-6">
            <RequestStack
              requests={requests}
              onChanged={(next) =>
                setRequests((current) =>
                  current.map((c) => (c.id === next.id ? next : c)),
                )
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * The client's requests, newest first, as a stack of cards.
 *
 * One card is in front; the others show as edges behind it. Pressing the front
 * card, or Next, brings the next forward; Previous goes back. It stops at either
 * end. The controls sit on the heading's line. The motion only explains that
 * change, and reduced motion makes it instant.
 */
function RequestStack({
  requests,
  onChanged,
}: {
  requests: ClientConsultation[];
  onChanged: (next: ClientConsultation) => void;
}) {
  const [front, setFront] = useState(0);
  const count = requests.length;
  // A list that shrinks cannot leave the index past its end.
  const index = Math.min(front, Math.max(count - 1, 0));
  const current = requests[index];
  const next = () => setFront(Math.min(index + 1, count - 1));
  const prev = () => setFront(Math.max(index - 1, 0));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 id="requests-title" className="font-display text-h3 text-ink">
          Your consultation requests
        </h2>
        {count > 1 && (
          <div className="flex items-center gap-3 text-meta">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prev}
              disabled={index === 0}
            >
              <Icon name="arrow_back" size={18} />
              Previous
            </Button>
            <span aria-live="polite" className="text-muted-fg">
              Request {index + 1} of {count}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={next}
              disabled={index === count - 1}
            >
              Next
              <Icon name="arrow_forward" size={18} />
            </Button>
          </div>
        )}
      </div>

      {count === 0 ? (
        <p className="mt-2 text-meta text-muted-fg">
          No requests yet. A request you make appears here, with the advocate it
          went to.
        </p>
      ) : (
        <div
          onClick={(e) => {
            if (
              index < count - 1 &&
              !(e.target as HTMLElement).closest("button, a, textarea, input")
            )
              next();
          }}
          className={cn("mt-4", index < count - 1 && "cursor-pointer")}
        >
          <ul
            key={current.id}
            className="animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none"
          >
            <RequestItem request={current} onChanged={onChanged} />
          </ul>
          {count > 1 && (
            <div
              aria-hidden="true"
              className={cn("relative h-5", index === count - 1 && "invisible")}
            >
              <span className="absolute inset-x-3 top-0 h-3 rounded-b-card bg-parchment/80" />
              {index < count - 2 && (
                <span className="absolute inset-x-6 top-2 h-3 rounded-b-card bg-parchment/60" />
              )}
            </div>
          )}
        </div>
      )}
    </>
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
  request: ClientConsultation;
  onChanged: (next: ClientConsultation) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [showFull, setShowFull] = useState(false);
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
      onChanged(await payClientConsultation(ORG, r.id));
      toast.success("Consultation fee paid");
    } catch (err) {
      setFailed(
        err instanceof Error
          ? err.message
          : "The payment did not go through. Try again.",
      );
    } finally {
      setPaying(false);
      inFlight.current = false;
    }
  }

  return (
    <li className="rounded-card bg-parchment p-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-fg">
        <span>
          <span className="text-body font-medium text-ink">{r.advocateName}</span>
          {" · "}
          {format(new Date(r.requestedAt), "d MMM yyyy")}
        </span>
        <ConsultationStatus
          consultation={{ status: r.status, paid }}
          audience="client"
        />
      </p>
      <p
        id={`question-${r.id}`}
        className={cn(
          "mt-2 max-w-measure whitespace-pre-line break-words text-body text-ink",
          !showFull && "line-clamp-3",
        )}
      >
        {r.question}
      </p>
      {(r.question.length > 140 || r.question.split("\n").length > 3) && (
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          aria-expanded={showFull}
          aria-controls={`question-${r.id}`}
          className="link mt-1 inline-flex min-h-6 items-center rounded-control text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {showFull ? "Show less" : "View full request"}
        </button>
      )}

      {r.status === "requested" && (
        <p className="mt-2 text-meta text-muted-fg">
          Fee payable if the advocate accepts, {PRICE_BASIS}.
        </p>
      )}

      {r.status === "declined" && (
        <p className="mt-2 text-meta text-muted-fg">
          The advocate declined this request. You were not charged.
        </p>
      )}

      {r.status === "accepted" && !paid && r.fee !== null && (
        <div className="mt-4 max-w-md rounded-card bg-paper p-5">
          <p className="text-label font-medium text-muted-fg">
            Consultation fee · the advocate
          </p>
          <p className="mt-2 font-display text-h2 text-ink">{rupees(r.fee)}</p>
          <p className="text-meta text-muted-fg">{PRICE_BASIS}</p>
          <p className="mt-3 text-meta text-ink">
            {r.advocateName} accepted. Nothing is charged until you pay. This is
            separate from the document fee.
          </p>
          <p className="mt-1 text-meta text-muted-fg">
            GST is added at the rate in force.
          </p>

          {failed && (
            <p role="alert" className="mt-4 text-meta text-ink">
              {failed}
            </p>
          )}

          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={pay}
            disabled={paying}
          >
            {paying ? "Paying" : failed ? "Try again" : "Pay (preview)"}
          </Button>
          <p className="mt-3 text-meta text-muted-fg">
            Preview. No payment is taken.
          </p>
        </div>
      )}

      {r.status === "accepted" && paid && (
        <p className="mt-2 text-meta text-muted-fg">
          Paid. {r.advocateName} will answer here.
        </p>
      )}

      {r.status === "answered" && r.answer && (
        <div className="mt-4 border-l-2 border-line pl-4">
          <p className="text-label font-medium text-muted-fg">
            Answer from {r.advocateName}
          </p>
          <p className="mt-1.5 max-w-measure whitespace-pre-line text-meta text-ink">
            {r.answer}
          </p>
          {r.answeredAt && (
            <p className="mt-1.5 text-meta text-muted-fg">
              {format(new Date(r.answeredAt), "d MMM yyyy")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
