"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { ErrorState } from "@/components/shared/error-state";
import { Seal } from "@/components/document/seal";
import { AuditTrail } from "@/components/document/audit-trail";
import { StateLabel } from "@/components/document/state-label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getDocument, signOffDocument } from "@/lib/api/documents";
import { signOffBlockers } from "@/lib/findings";
import { buildAuditTrail } from "@/lib/audit";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * Sign-off.
 *
 * The product promise is not that the first pass is clever. It is that a
 * named advocate stood behind the result. So this screen states exactly
 * what is being signed: how many findings, how they were decided, which
 * sources the document rests on, what the client was asked. Anything
 * still in the way is listed with a link to where it is resolved.
 */
const CONFIRMATIONS = [
  {
    id: "reviewed",
    label:
      "I have personally reviewed every finding and the underlying clause text in this document.",
  },
  {
    id: "overrides",
    label:
      "Every finding settled against the first pass is supported by a reason recorded on the finding.",
  },
  {
    id: "rule-37",
    label: "This sign-off complies with Bar Council of India Rule 37.",
  },
  {
    id: "audit",
    label:
      "I understand this sign-off creates a permanent audit record attributable to my Bar enrolment.",
  },
] as const;

/** Sign-off time is a legal fact, so it is always stated in IST. */
function ist(iso: string): string {
  const stamp = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return `${stamp} IST`;
}

/** What the signature covers, counted from the document itself. */
function recordOf(doc: ContractDocument) {
  const citations = doc.findings.flatMap((f) => f.citations);
  const requests = doc.findings.filter((f) => f.changeRequest);
  return {
    findings: doc.findings.length,
    settled: doc.findings.filter((f) => f.disposition !== "pending").length,
    withNote: doc.findings.filter((f) => f.overrideNote).length,
    sources: citations.length,
    verified: citations.filter((c) => c.status === "verified").length,
    withdrawn: citations.filter((c) => c.withdrawn).length,
    requests: requests.length,
    answered: requests.filter((f) => f.changeRequest?.response).length,
  };
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function RecordList({ doc }: { doc: ContractDocument }) {
  const r = recordOf(doc);
  const rows: [string, string][] = [
    ["Draft", `Draft ${doc.version}`],
    [
      "Findings",
      r.findings === 0
        ? "The first pass raised none"
        : `${r.settled} of ${plural(r.findings, "finding", "findings")} settled${r.withNote > 0 ? ` · ${r.withNote} with a recorded note` : ""}`,
    ],
    [
      "Sources",
      r.sources === 0
        ? "None cited"
        : `${r.verified} of ${r.sources} verified against the approved corpus${r.withdrawn > 0 ? ` · ${r.withdrawn} blocked and withdrawn` : ""}`,
    ],
    [
      "Client",
      r.requests === 0
        ? "No changes requested"
        : `${plural(r.requests, "request", "requests")} · ${r.answered} answered`,
    ],
  ];

  return (
    <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-meta">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-fg">{term}</dt>
          <dd className="text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SignOffPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await getDocument(params.id);
      if (!result) throw new Error("Document not found.");
      setDoc(result);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load this document.",
      );
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <Skeleton className="mt-10 h-40 w-full rounded-card" />
        <Skeleton className="mt-6 h-56 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  // Signed off, whether just now or before: the record, with the seal.
  // This is the one place the mark appears inside the product.
  if ((doc.status === "settled" || doc.status === "executed") && doc.advocate && doc.settledAt) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/queue"
          className="inline-flex items-center gap-0.5 text-meta text-muted-fg transition-colors hover:text-ink"
        >
          <Icon name="chevron_left" size={18} />
          Queue
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StateLabel state={doc.status} tone="solid" />
        </div>
        <h1 className="mt-2 font-display text-h1 text-ink">{doc.title}</h1>
        <p className="mt-1 text-meta text-muted-fg">
          {doc.clientName}
          <span className="mx-1.5 text-line">·</span>
          {doc.counterpartyName}
        </p>

        <section className="mt-8 grid items-start gap-6 rounded-card border border-line bg-paper p-5 sm:grid-cols-[minmax(0,1fr)_auto] md:p-6">
          <div className="min-w-0">
            <p className="text-label font-medium text-muted-fg">Reviewed and signed by</p>
            <p className="mt-1 font-display text-h2 text-ink">{doc.advocate.name}</p>
            <p className="mt-1 text-meta text-muted-fg">
              Enrolment <span className="font-mono text-label text-ink">{doc.advocate.bar}</span>
              <span className="mx-1.5 text-line">·</span>
              Empanelled advocate
            </p>
            <p className="mt-1 font-mono text-label text-ink">{ist(doc.settledAt)}</p>

            <div className="mt-5 border-t border-line pt-4">
              <RecordList doc={doc} />
            </div>
          </div>
          <Seal className="h-16 w-16 sm:h-20 sm:w-20" />
        </section>

        <section className="mt-8">
          <AuditTrail entries={buildAuditTrail(doc)} title="Activity" />
        </section>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/queue">Back to the queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/review/${doc.id}`}>Read the settled document</Link>
          </Button>
        </div>
      </div>
    );
  }

  const blockers = signOffBlockers(doc, CURRENT_ADVOCATE.id);
  const allChecked = CONFIRMATIONS.every((c) => checked[c.id]);
  const canSignOff = blockers.length === 0 && allChecked && !submitting;

  async function submit() {
    if (!doc) return;
    setSubmitting(true);
    try {
      setDoc(await signOffDocument(doc.id));
      toast.success("Signed off. The client can now read the settled document.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not sign off this document.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href={`/review/${doc.id}`}
        className="inline-flex items-center gap-0.5 text-meta text-muted-fg transition-colors hover:text-ink"
      >
        <Icon name="chevron_left" size={18} />
        Back to the document
      </Link>

      <p className="mt-4 text-label font-medium text-muted-fg">Sign-off</p>
      {/* The one display moment on this screen. */}
      <h1 className="mt-1 font-display text-h1 text-ink">{doc.title}</h1>
      <p className="mt-1 text-meta text-muted-fg">
        {doc.clientName}
        <span className="mx-1.5 text-line">·</span>
        {doc.counterpartyName}
      </p>

      <section className="mt-8 rounded-card border border-line bg-paper p-5">
        <h2 className="mb-3 text-label font-medium text-muted-fg">What you are signing</h2>
        <RecordList doc={doc} />
      </section>

      {blockers.length > 0 && (
        // State the fact, then where it is resolved. No document reaches a
        // client without a recorded sign-off, and none is signed off over
        // an undecided finding or an unevidenced source.
        <section className="mt-6">
          <h2 className="text-label font-medium text-flagged">
            {plural(blockers.length, "item stands", "items stand")} between this document and sign-off
          </h2>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {blockers.map((b) => (
              <li key={b.label}>
                <Link
                  href={
                    b.findingId
                      ? `/review/${doc.id}?finding=${encodeURIComponent(b.findingId)}`
                      : `/review/${doc.id}`
                  }
                  className="flex items-center justify-between gap-3 py-2.5 text-meta text-ink transition-colors hover:bg-parchment/60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon name="error" size={16} className="text-flagged" />
                    {b.label}
                  </span>
                  <Icon name="arrow_forward" size={18} className="text-muted-fg" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-label font-medium text-muted-fg">Confirmations</h2>
        <ul className="mt-2 border-t border-line">
          {CONFIRMATIONS.map((confirmation) => (
            <li
              key={confirmation.id}
              className="flex items-start gap-3 border-b border-line py-3"
            >
              <Checkbox
                id={confirmation.id}
                className="mt-0.5"
                checked={!!checked[confirmation.id]}
                disabled={blockers.length > 0}
                onCheckedChange={(value) =>
                  setChecked((prev) => ({
                    ...prev,
                    [confirmation.id]: value === true,
                  }))
                }
              />
              <Label
                htmlFor={confirmation.id}
                className="text-meta font-normal leading-relaxed text-ink"
              >
                {confirmation.label}
              </Label>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button disabled={!canSignOff} onClick={submit}>
          {submitting ? "Signing off" : "Sign off as advocate"}
        </Button>
        <p className="text-meta text-muted-fg">
          {blockers.length > 0
            ? "Resolve the items above first."
            : !allChecked
              ? "Confirm each statement to sign off."
              : `Signed as ${CURRENT_ADVOCATE.name} · enrolment ${CURRENT_ADVOCATE.bar}`}
        </p>
      </div>
    </div>
  );
}
