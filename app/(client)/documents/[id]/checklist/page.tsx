"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { ErrorState } from "@/components/shared/error-state";
import { ExecutionChecklist } from "@/components/domain/execution-checklist";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument, toggleExecutionStep } from "@/lib/api/documents";
import type { ContractDocument } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function ChecklistPage({
  params,
}: {
  params: { id: string };
}) {
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

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

  async function handleToggle(
    kind: ContractDocument["executionSteps"][number]["kind"],
    complete: boolean,
  ) {
    if (!doc) return;
    const updated = await toggleExecutionStep(doc.id, kind, complete);
    setDoc(updated);
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="mb-4 h-10 w-2/3 rounded-card" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const isSettled = doc.status === "settled" || doc.status === "executed";

  return (
    <div className="mx-auto max-w-4xl print:max-w-none">
      <div className="print:hidden">
        <Link
          href={`/documents/${doc.id}`}
          className="inline-flex items-center gap-1 font-mono text-notation uppercase tracking-notation text-muted-fg transition-colors hover:text-ink"
        >
          <Icon name="chevron_left" size={16} />
          {doc.title}
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <h1 className="font-display text-h1 text-ink">
              Execution checklist
            </h1>
            <p className="mt-2 max-w-xl text-body text-muted-fg">
              What remains before the settled document takes effect.
            </p>
          </div>
          {isSettled && (
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Icon name="print" size={18} />
              Print or save as PDF
            </Button>
          )}
        </div>
      </div>

      {/* Print-only heading — screen readers and the screen layout use the
          PageHeader above; this is what actually ends up in the PDF/print
          output (QA 2.4: the "downloadable PDF" used to not exist at all). */}
      <div className="hidden print:block print:mb-6">
        <h1 className="font-display text-h1 text-ink">{doc.title}</h1>
        <p className="text-body text-muted-fg">
          {doc.clientName} vs {doc.counterpartyName} · Execution checklist ·
          Generated {format(new Date(), "d MMM yyyy, HH:mm")}
        </p>
      </div>

      {!isSettled ? (
        <p className="mt-8 border-l-2 border-line pl-5 text-body text-ink">
          The execution checklist becomes available once this document is
          settled and signed off.
        </p>
      ) : (
        <div className="mt-10">
          {doc.advocate && (
            // The authority the sheet rests on, stated as a line of
            // record rather than a tinted panel.
            <p className="mb-8 font-mono text-notation uppercase tracking-notation text-muted-fg">
              Signed off by {doc.advocate.name}
              <span className="mx-2 text-line">·</span>
              {doc.advocate.bar}
              {doc.settledAt && (
                <>
                  <span className="mx-2 text-line">·</span>
                  {format(new Date(doc.settledAt), "d MMM yyyy")}
                </>
              )}
            </p>
          )}
          <ExecutionChecklist
            steps={doc.executionSteps}
            onToggle={handleToggle}
          />
        </div>
      )}
    </div>
  );
}
