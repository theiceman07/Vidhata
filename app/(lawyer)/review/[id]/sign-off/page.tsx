"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { format } from "date-fns";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Seal } from "@/components/document/seal";
import { AuditTrail } from "@/components/document/audit-trail";
import { StateLabel } from "@/components/document/state-label";
import { Dateline } from "@/components/document/dateline";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getDocument, signOffDocument } from "@/lib/api/documents";
import { openFindingCount, hasBlockedCitation } from "@/lib/findings";
import { buildAuditTrail } from "@/lib/audit";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

/**
 * Sign-off.
 *
 * The most visually authoritative moment in the interface, because the
 * product promise is not that the first pass is clever. It is that a
 * named advocate stood behind the result.
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
      "Every override on this document is supported by a documented reason recorded on the finding.",
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

function Checkline({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-3 border-b border-line py-3 last:border-b-0">
      <Icon name="check" size={18} className="text-verified" />
      <span className="text-meta text-ink">{children}</span>
    </li>
  );
}

export default function SignOffPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [signedOffDoc, setSignedOffDoc] = useState<ContractDocument | null>(
    null,
  );

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
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="mt-decision h-64 w-full" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  // The settled document, with the seal. This is the endpoint the whole
  // arc has been travelling towards.
  if (signedOffDoc) {
    const settled = signedOffDoc;
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Dateline segments={["Document ready"]} />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="font-display text-h1 text-ink">{settled.title}</h1>
          <StateLabel state="settled" tone="solid" />
        </div>

        <div className="mt-decision flex flex-wrap items-center justify-between gap-8 border-y border-line py-decision">
          <div>
            <Dateline segments={["Advocate"]} />
            <p className="mt-2 font-display text-h2 text-ink">
              {settled.advocate?.name}
            </p>
            <Dateline
              segments={[
                `Bar council no. ${settled.advocate?.bar}`,
                "Empanelled",
              ]}
              className="mt-2"
            />
            <Dateline
              segments={[
                settled.settledAt
                  ? `Signed off · ${format(new Date(settled.settledAt), "d MMM yyyy · HH:mm")} IST`
                  : null,
              ]}
              className="mt-1"
            />
          </div>

          <Seal />
        </div>

        <div className="mt-decision">
          <AuditTrail entries={buildAuditTrail(settled)} />
        </div>

        <div className="mt-decision flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/queue">Back to the queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/review/${settled.id}`}>Read the document</Link>
          </Button>
        </div>
      </div>
    );
  }

  const openCount = openFindingCount(doc);
  const blocked = hasBlockedCitation(doc);
  const citationCount = doc.findings.reduce((n, f) => n + f.citations.length, 0);
  const settledCount = doc.findings.length - openCount;
  const allChecked = CONFIRMATIONS.every((c) => checked[c.id]);
  const canSignOff = allChecked && openCount === 0 && !blocked && !submitting;

  async function submit() {
    if (!doc) return;
    setSubmitting(true);
    try {
      const result = await signOffDocument(doc.id);
      setSignedOffDoc(result);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not sign off this document.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/review/${doc.id}`}
        className="inline-flex items-center gap-1 text-meta text-muted-fg hover:text-ink"
      >
        <Icon name="chevron_left" size={16} />
        Back to the document
      </Link>

      <Dateline segments={["Document ready"]} className="mt-6" />
      <h1 className="mt-3 font-display text-h1 text-ink">{doc.title}</h1>

      {/* Counts come from the document, never hardcoded. A document the
          first pass raised nothing against states that, rather than
          reporting a row of zeroes as though they were achievements. */}
      <ul className="mt-decision border-y border-line">
        <Checkline>First pass completed</Checkline>
        {citationCount > 0 && (
          <Checkline>
            {citationCount} {citationCount === 1 ? "citation" : "citations"}{" "}
            checked against source
          </Checkline>
        )}
        <Checkline>
          {doc.findings.length === 0
            ? "The first pass raised no findings"
            : openCount === 0
              ? `${settledCount} ${settledCount === 1 ? "finding" : "findings"} settled, none left open`
              : `${settledCount} settled, ${openCount} still open`}
        </Checkline>
      </ul>

      {(openCount > 0 || blocked) && (
        // State the fact, then the owner. No document reaches a client
        // without a recorded advocate sign-off, and none is signed off
        // over an unevidenced concern.
        <p className="mt-6 border-l-2 border-flagged pl-4 text-meta text-flagged">
          {blocked
            ? "A citation on this document is blocked. Resolve the source against the corpus before signing off."
            : `${openCount} ${openCount === 1 ? "finding is" : "findings are"} still open. Settle them before signing off.`}
        </p>
      )}

      <section className="mt-decision">
        <h2 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
          Confirmations
        </h2>
        <ul className="mt-4 border-t border-line">
          {CONFIRMATIONS.map((confirmation) => (
            <li
              key={confirmation.id}
              className="flex items-start gap-3 border-b border-line py-4"
            >
              <Checkbox
                id={confirmation.id}
                checked={!!checked[confirmation.id]}
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

      <div className="mt-decision">
        <Button disabled={!canSignOff} onClick={submit}>
          {submitting ? "Signing off" : "Sign off as advocate"}
        </Button>
        {!allChecked && openCount === 0 && !blocked && (
          <p className="mt-3 text-meta text-muted-fg">
            Confirm each statement above to sign off.
          </p>
        )}
      </div>
    </div>
  );
}
