"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SeverityPill } from "@/components/domain/severity-pill";
import { getDocument, signOffDocument } from "@/lib/api/documents";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

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

export default function SignOffPage({ params }: { params: { id: string } }) {
  const router = useRouter();
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
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/2 rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const pendingCount = doc.findings.filter(
    (f) => f.disposition === "pending",
  ).length;
  const allChecked = CONFIRMATIONS.every((c) => checked[c.id]);
  const canApprove = allChecked && pendingCount === 0 && !submitting;

  async function handleApprove() {
    if (!doc) return;
    setSubmitting(true);
    try {
      const settled = await signOffDocument(doc.id);
      // QA 3.1: this used to router.push to /documents/[id]/checklist — a
      // client-portal route. The (client) layout guard immediately bounced
      // the advocate to /login. Sign-off now stays on an advocate-owned
      // URL and shows its own success state.
      setDoc(settled);
      setSignedOffDoc(settled);
      toast.success(
        "Sign-off recorded. The client can now view the settled document.",
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not complete sign-off.",
      );
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (signedOffDoc) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-verified/15">
          <ClipboardCheck className="h-7 w-7 text-verified" aria-hidden />
        </div>
        <h1 className="font-display text-h1 text-ink">Sign-off recorded</h1>
        <p className="mt-2 text-body text-muted-fg">
          {signedOffDoc.title} was settled
          {signedOffDoc.settledAt &&
            ` on ${format(new Date(signedOffDoc.settledAt), "d MMM yyyy, HH:mm")}`}
          , signed by {CURRENT_ADVOCATE.name} ({CURRENT_ADVOCATE.bar}).
        </p>
        <p className="mt-1 text-small text-muted-fg">
          {signedOffDoc.findings.length} finding
          {signedOffDoc.findings.length === 1 ? "" : "s"} adjudicated · the
          client can now view the settled document and execution checklist.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push("/queue")}>Back to queue</Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/review/${signedOffDoc.id}`)}
          >
            View reviewed document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Sign off"
        description={doc.title}
        breadcrumb={`${doc.clientName} vs ${doc.counterpartyName}`}
        backHref={`/review/${doc.id}`}
        backLabel="Review"
      />

      {pendingCount > 0 && (
        <div className="mb-4 rounded-card border border-caution/30 bg-caution/10 p-4 text-body text-ink">
          {pendingCount} finding{pendingCount === 1 ? "" : "s"} still pending.
          Every finding must reach a disposition before sign-off.
        </div>
      )}

      <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
        <h2 className="mb-3 font-display text-h3 text-ink">
          Adjudication summary
        </h2>
        <ul className="space-y-2">
          {doc.findings.map((f) => (
            <li
              key={f.findingId}
              className="flex items-center justify-between gap-3 text-body"
            >
              <span className="flex items-center gap-2">
                <SeverityPill severity={f.severity} />
                <span className="text-ink">{f.clauseReference}</span>
              </span>
              <span className="text-small font-medium capitalize text-muted-fg">
                {f.disposition}
              </span>
            </li>
          ))}
          {doc.findings.length === 0 && (
            <li className="text-small text-muted-fg">No findings recorded.</li>
          )}
        </ul>
      </section>

      <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
        <h2 className="mb-3 font-display text-h3 text-ink">Confirmations</h2>
        <div className="space-y-3">
          {CONFIRMATIONS.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Checkbox
                id={c.id}
                checked={!!checked[c.id]}
                onCheckedChange={(v) =>
                  setChecked((prev) => ({ ...prev, [c.id]: v === true }))
                }
              />
              <Label htmlFor={c.id} className="text-body font-normal text-ink">
                {c.label}
              </Label>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
        <h2 className="mb-3 font-display text-h3 text-ink">Audit trail</h2>
        <ul className="space-y-2 text-small text-muted-fg">
          <li>
            {format(new Date(doc.createdAt), "d MMM yyyy, HH:mm")} — Document
            created for {doc.clientName}.
          </li>
          {doc.advocate && (
            <li>Claimed by {doc.advocate.name} ({doc.advocate.bar}).</li>
          )}
          {doc.findings.map((f) => (
            <li key={f.findingId}>
              {f.clauseReference}: {f.disposition}
              {f.overrideNote ? ` — "${f.overrideNote}"` : ""}
            </li>
          ))}
        </ul>
      </section>

      <Button
        size="lg"
        className="w-full"
        disabled={!canApprove}
        onClick={handleApprove}
      >
        <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
        {submitting ? "Signing off…" : "Approve and sign off"}
      </Button>
      <p className="mt-2 text-center text-small text-muted-fg">
        Signing as {CURRENT_ADVOCATE.name} ({CURRENT_ADVOCATE.bar})
      </p>
    </div>
  );
}
