"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { BackButton } from "@/components/shared/back-button";
import { ErrorState } from "@/components/shared/error-state";
import { ExecutionChecklist } from "@/components/domain/execution-checklist";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  attachEvidence,
  getDocument,
  toggleExecutionStep,
} from "@/lib/api/documents";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { ContractDocument, ExecutionStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "error" | "loaded";
type Kind = ExecutionStep["kind"];

export default function ChecklistPage({
  params,
}: {
  params: { id: string };
}) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyKind, setBusyKind] = useState<Kind | null>(null);

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

  async function save(kind: Kind, action: () => Promise<ContractDocument>, failure: string) {
    setBusyKind(kind);
    try {
      setDoc(await action());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : failure);
    } finally {
      setBusyKind(null);
    }
  }

  function handleToggle(kind: Kind, complete: boolean) {
    if (!doc) return;
    // The preview authenticates one client identity, the organisation.
    save(
      kind,
      () => toggleExecutionStep(doc.id, kind, complete, MOCK_CLIENT_ORG.name),
      "Could not update the checklist.",
    );
  }

  function handleAttach(kind: Kind, fileName: string | null) {
    if (!doc) return;
    save(kind, () => attachEvidence(doc.id, kind, fileName), "Could not attach this file.");
  }

  if (state === "loading") {
    return (
      <div className="w-full">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-1/3" />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const isSettled = doc.status === "settled" || doc.status === "executed";
  const applicable = doc.executionSteps.filter((s) => s.applicable);
  const done = applicable.filter((s) => s.complete).length;
  const owners: Record<Kind, string> = {
    stamping: doc.clientName,
    registration: doc.clientName,
    esignature: "Both signatories",
  };

  return (
    <div className="w-full">
      {/* The page fills the screen: the title and way back on the left,
          the record the sheet rests on and how far it has got on the
          right. */}
      <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6 print:hidden">
        <div className="flex min-w-0 items-start gap-4">
          <BackButton fallbackHref={`/documents/${doc.id}`} label="Back" />
          <div className="min-w-0">
            <p className="truncate text-meta text-muted-fg">{doc.title}</p>
            <h1 className="mt-1 font-display text-h1 text-ink">Execution checklist</h1>
            <p className="mt-2 text-body text-muted-fg">
              What remains before the settled document takes effect.
            </p>
          </div>
        </div>

        {isSettled && (
          <div className="flex flex-col items-start gap-3 sm:items-end sm:text-right">
            {doc.advocate && (
              // The authority the sheet rests on, stated as a line of record.
              <p className="text-meta text-muted-fg">
                Signed off by <span className="text-ink">{doc.advocate.name}</span>
                <span className="mx-1.5 text-muted-fg/50">·</span>
                <span className="font-mono text-label">{doc.advocate.bar}</span>
                {doc.settledAt && (
                  <>
                    <span className="mx-1.5 text-muted-fg/50">·</span>
                    {format(new Date(doc.settledAt), "d MMM yyyy")}
                  </>
                )}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 sm:justify-end">
              <span className="flex items-center gap-3">
                <span aria-hidden className="flex gap-1">
                  {applicable.map((s) => (
                    <span
                      key={s.kind}
                      className={cn(
                        "h-1.5 w-8 rounded-full",
                        s.complete ? "bg-accent" : "bg-line",
                      )}
                    />
                  ))}
                </span>
                <span className="text-meta text-ink">
                  {done} of {applicable.length} complete
                </span>
              </span>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Icon name="print" size={18} />
                Print or save as PDF
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Print-only heading: the screen header above is hidden in print. */}
      <div className="hidden print:mb-6 print:block">
        <h1 className="font-display text-h1 text-ink">{doc.title}</h1>
        <p className="text-body text-muted-fg">
          {doc.clientName} and {doc.counterpartyName} · Execution checklist ·
          Generated {format(new Date(), "d MMM yyyy, HH:mm")}
        </p>
      </div>

      {!isSettled ? (
        <p className="mt-10 max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
          The execution checklist becomes available once this document is
          settled and signed off.
        </p>
      ) : (
        <div className="mt-10">
          <ExecutionChecklist
            steps={doc.executionSteps}
            owners={owners}
            onToggle={handleToggle}
            onAttach={handleAttach}
            busyKind={busyKind}
          />

          {doc.status === "executed" && (
            <p className="mt-6 inline-flex items-center gap-1.5 text-meta text-verified">
              <Icon name="check_circle" size={18} />
              Every step is complete. The document is recorded as executed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
