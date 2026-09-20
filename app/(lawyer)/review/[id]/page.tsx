"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/domain/status-badge";
import { SeverityPill } from "@/components/domain/severity-pill";
import { LayerBadge } from "@/components/domain/layer-badge";
import { FindingCard } from "@/components/domain/finding-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import type { ContractDocument, Finding, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "error" | "loaded";

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export default function ReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const result = await getDocument(params.id);
      if (!result) throw new Error("Document not found.");
      setDoc(result);
      setSelectedId(result.findings[0]?.findingId ?? null);
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

  const sortedFindings = useMemo(() => {
    if (!doc) return [];
    return [...doc.findings].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
  }, [doc]);

  const adjudicatedCount = doc
    ? doc.findings.filter((f) => f.disposition !== "pending").length
    : 0;
  const totalCount = doc?.findings.length ?? 0;
  const pendingCount = totalCount - adjudicatedCount;

  const selectedFinding = sortedFindings.find(
    (f) => f.findingId === selectedId,
  );

  const selectIndex = useCallback(
    (delta: number) => {
      if (sortedFindings.length === 0) return;
      const currentIndex = sortedFindings.findIndex(
        (f) => f.findingId === selectedId,
      );
      const nextIndex =
        (currentIndex + delta + sortedFindings.length) % sortedFindings.length;
      setSelectedId(sortedFindings[nextIndex].findingId);
    },
    [sortedFindings, selectedId],
  );

  const handleConfirm = useCallback(
    async (findingId: string, opts?: { announceUndo?: boolean }) => {
      if (!doc) return;
      const updated = await updateFinding(doc.id, findingId, {
        disposition: "confirmed",
        overrideNote: null,
      });
      setDoc(updated);
      // QA 4.3 / 5.2: the C shortcut confirms a finding in a single
      // keystroke with no confirmation dialog. A dialog would slow down
      // legitimate rapid-fire confirmation, so instead every confirm — not
      // just the keyboard one — is undoable from the toast.
      if (opts?.announceUndo) {
        const clauseRef =
          sortedFindings.find((f) => f.findingId === findingId)
            ?.clauseReference ?? "Finding";
        toast.success(`${clauseRef} confirmed`, {
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
      }
    },
    [doc, sortedFindings],
  );

  const handleOverride = useCallback(
    async (findingId: string, note: string) => {
      if (!doc) return;
      const updated = await updateFinding(doc.id, findingId, {
        disposition: "overridden",
        overrideNote: note,
      });
      setDoc(updated);
    },
    [doc],
  );

  useEffect(() => {
    // QA 4.3: the guard used to check tagName === INPUT/TEXTAREA only, so
    // typing "c" inside an open Select, a contenteditable node, or a Radix
    // popover/dialog would silently confirm a finding. Also ignore any
    // modified keystroke (browser/OS shortcuts).
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
      if (target.isContentEditable) return true;
      return !!target.closest(
        '[role="dialog"], [role="listbox"], [data-radix-popper-content-wrapper]',
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "j" || e.key === "J") selectIndex(1);
      if (e.key === "k" || e.key === "K") selectIndex(-1);
      if ((e.key === "c" || e.key === "C") && selectedFinding) {
        handleConfirm(selectedFinding.findingId, { announceUndo: true });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectIndex, selectedFinding, handleConfirm]);

  if (state === "loading") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  return (
    <div>
      {/* QA 10.7: no consistent back navigation on secondary screens. */}
      <Link
        href="/queue"
        className="mb-3 inline-flex items-center gap-1 text-small text-muted-fg hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Queue
      </Link>

      {/* QA 4.3 / 5.2: J/K/C shortcuts were invisible and undocumented. */}
      <p className="mb-3 text-small text-muted-fg">
        <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-sans text-small">
          J
        </kbd>{" "}
        /{" "}
        <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-sans text-small">
          K
        </kbd>{" "}
        to move between findings ·{" "}
        <kbd className="rounded border border-line bg-canvas px-1.5 py-0.5 font-sans text-small">
          C
        </kbd>{" "}
        to confirm
      </p>
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper p-4 shadow-card">
        <div>
          <p className="font-display text-h3 text-ink">{doc.title}</p>
          <p className="text-small text-muted-fg">
            {doc.clientName} vs {doc.counterpartyName} ·{" "}
            <span className="uppercase">{doc.tier}</span> tier
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={doc.status} />
          <span className="text-small font-medium text-muted-fg">
            {adjudicatedCount} of {totalCount} adjudicated
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    disabled={pendingCount > 0}
                    onClick={() => router.push(`/review/${doc.id}/sign-off`)}
                  >
                    Sign off
                  </Button>
                </span>
              </TooltipTrigger>
              {pendingCount > 0 && (
                <TooltipContent>
                  <p className="text-small">
                    {pendingCount} finding{pendingCount === 1 ? "" : "s"} still
                    pending
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-small font-medium text-muted-fg">
              Findings ({sortedFindings.length})
            </p>
            <AddFindingDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onAdd={async (finding) => {
                const updated = await addFinding(doc.id, finding);
                setDoc(updated);
                setSelectedId(finding.findingId);
                setDialogOpen(false);
              }}
            />
          </div>

          <Select
            value={selectedId ?? undefined}
            onValueChange={(v) => setSelectedId(v)}
          >
            <SelectTrigger className="mb-2 lg:hidden" aria-label="Select finding">
              <SelectValue placeholder="Choose a finding" />
            </SelectTrigger>
            <SelectContent>
              {sortedFindings.map((f) => (
                <SelectItem key={f.findingId} value={f.findingId}>
                  {f.clauseReference} — {f.severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden space-y-2 lg:block">
            {sortedFindings.map((f) => (
              <button
                key={f.findingId}
                type="button"
                onClick={() => setSelectedId(f.findingId)}
                aria-label={`Select finding ${f.clauseReference}`}
                className={cn(
                  "w-full rounded-card border border-line bg-paper p-3 text-left transition-colors",
                  f.findingId === selectedId
                    ? "border-brand ring-1 ring-brand"
                    : "hover:bg-canvas/60",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <LayerBadge layer={f.layer} />
                  <SeverityPill severity={f.severity} />
                </div>
                <p className="line-clamp-2 text-small text-ink">
                  {f.description}
                </p>
                <span
                  className={cn(
                    "mt-1 inline-block h-2 w-2 rounded-full",
                    f.disposition === "pending" && "bg-line",
                    f.disposition === "confirmed" && "bg-verified",
                    f.disposition === "overridden" && "bg-caution",
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          {selectedFinding ? (
            <FindingCard
              key={selectedFinding.findingId}
              finding={selectedFinding}
              mode="adjudicable"
              onConfirm={(id) => handleConfirm(id, { announceUndo: true })}
              onOverride={handleOverride}
            />
          ) : (
            <p className="text-body text-muted-fg">No findings to review.</p>
          )}
        </div>
      </div>
    </div>
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
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Add finding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a finding the pipeline missed</DialogTitle>
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
              placeholder="What did the pipeline miss?"
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
                remedySuggested: "Advocate judgment — see description.",
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
