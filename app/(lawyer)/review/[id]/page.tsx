"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { DocumentWorkspace } from "@/components/document/workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDocument, updateFinding, addFinding } from "@/lib/api/documents";
import { openFindingCount, hasBlockedCitation } from "@/lib/findings";
import type { ContractDocument, Finding, Severity } from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  /**
   * Settling is a decision on the record, so it is always undoable from
   * the toast (QA 4.3 / 5.2) — including the single-keystroke C path,
   * where a confirmation dialog would only slow down legitimate
   * rapid-fire adjudication.
   */
  const handleSettle = useCallback(
    async (findingId: string, note: string | null) => {
      if (!doc) return;
      setBusy(true);
      try {
        const updated = await updateFinding(doc.id, findingId, {
          disposition: note ? "overridden" : "confirmed",
          overrideNote: note,
        });
        setDoc(updated);

        const clauseRef =
          doc.findings.find((f) => f.findingId === findingId)
            ?.clauseReference ?? "Finding";
        toast.success(`${clauseRef} settled`, {
          action: {
            label: "Undo",
            onClick: async () => {
              const reverted = await updateFinding(doc.id, findingId, {
                disposition: "pending",
                overrideNote: null,
              });
              setDoc(reverted);
            },
          },
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not settle this finding.",
        );
      } finally {
        setBusy(false);
      }
    },
    [doc],
  );

  const handleReopen = useCallback(
    async (findingId: string) => {
      if (!doc) return;
      setBusy(true);
      try {
        const updated = await updateFinding(doc.id, findingId, {
          disposition: "pending",
          overrideNote: null,
        });
        setDoc(updated);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not reopen this finding.",
        );
      } finally {
        setBusy(false);
      }
    },
    [doc],
  );

  if (state === "loading") {
    return (
      <div className="grid min-h-[60vh] gap-px lg:grid-cols-[240px_1fr_360px]">
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="h-full rounded-none" />
        <Skeleton className="hidden h-full rounded-none lg:block" />
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const openCount = openFindingCount(doc);
  const blocked = hasBlockedCitation(doc);
  const canSignOff = openCount === 0 && !blocked;

  // State the fact, then the owner. The reason sign-off is unavailable is
  // stated in text beside the control, never hidden in a tooltip.
  const notice = canSignOff
    ? null
    : blocked
      ? "Sign-off is unavailable while a citation is blocked. Resolve the source against the corpus first."
      : `Sign-off is unavailable while ${openCount} ${openCount === 1 ? "finding is" : "findings are"} open.`;

  return (
    <DocumentWorkspace
      doc={doc}
      role="advocate"
      back={{ href: "/queue", label: "Queue" }}
      notice={notice}
      actions={
        <>
          <AddFindingDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onAdd={async (finding) => {
              const updated = await addFinding(doc.id, finding);
              setDoc(updated);
              setDialogOpen(false);
            }}
          />
          <Button
            size="sm"
            disabled={!canSignOff}
            onClick={() => router.push(`/review/${doc.id}/sign-off`)}
          >
            Sign off
          </Button>
        </>
      }
      onSettle={handleSettle}
      onReopen={handleReopen}
      busy={busy}
    />
  );
}

function AddFindingDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (finding: Finding) => void;
}) {
  const [clauseReference, setClauseReference] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");

  const canSubmit = clauseReference.trim() && description.trim();

  function reset() {
    setClauseReference("");
    setDescription("");
    setSeverity("medium");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Icon name="add" size={18} />
          Add finding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a finding the first pass missed</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="clause-reference">Clause reference</Label>
            <Input
              id="clause-reference"
              value={clauseReference}
              onChange={(e) => setClauseReference(e.target.value)}
              placeholder="Clause 9.1"
            />
          </div>
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as Severity)}
            >
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="finding-description">Description</Label>
            <Textarea
              id="finding-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did the first pass miss?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onAdd({
                findingId: `manual-${Date.now()}`,
                layer: 6,
                severity,
                clauseReference,
                clauseText: description,
                description,
                ruleApplied: "MANUAL-ADVOCATE-ADDED",
                remedySuggested: "Advocate judgment · see description.",
                citations: [],
                disposition: "confirmed",
                overrideNote: null,
              })
            }
          >
            Add finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
