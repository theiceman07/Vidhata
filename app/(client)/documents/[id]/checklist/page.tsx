"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Execution checklist"
        description={doc.title}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast.info("PDF export isn't available in this preview.")
            }
          >
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Download as PDF
          </Button>
        }
      />

      {!isSettled ? (
        <div className="rounded-card border border-line bg-paper p-6 text-body text-muted-fg shadow-card">
          The execution checklist becomes available once this document is
          settled and signed off.
        </div>
      ) : (
        <>
          {doc.advocate && (
            <div className="mb-6 rounded-card border border-verified/30 bg-verified/10 p-4 text-body text-ink">
              Signed off by {doc.advocate.name} ({doc.advocate.bar})
              {doc.settledAt &&
                ` on ${format(new Date(doc.settledAt), "d MMM yyyy")}`}
              .
            </div>
          )}
          <ExecutionChecklist
            steps={doc.executionSteps}
            onToggle={handleToggle}
          />
        </>
      )}
    </div>
  );
}
