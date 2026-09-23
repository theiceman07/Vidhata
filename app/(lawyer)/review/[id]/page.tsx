"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { ErrorState } from "@/components/shared/error-state";
import { DocumentWorkspace } from "@/components/document/workspace";
import { ReviewAgent } from "@/components/document/review-agent";
import type { PaletteCommand } from "@/components/shared/command-palette";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addFinding,
  claimDocument,
  getDocument,
  requestChange,
  updateFinding,
  withdrawCitation,
} from "@/lib/api/documents";
import { getAdvocateProfile } from "@/lib/api/advocate";
import { addNote, deleteNote, listNotes, updateNote } from "@/lib/api/notes";
import { findingNumbers, signOffBlockers } from "@/lib/findings";
import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import type {
  AdvocateNote,
  Clause,
  ContractDocument,
  Finding,
  MarginNotes,
  Severity,
} from "@/lib/types";

type LoadState = "loading" | "error" | "loaded";

export default function ReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const initialFindingId = useSearchParams().get("finding");
  const [doc, setDoc] = useState<ContractDocument | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [available, setAvailable] = useState(true);
  const [notes, setNotes] = useState<AdvocateNote[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [result, profile, ownNotes] = await Promise.all([
        getDocument(params.id),
        getAdvocateProfile(),
        listNotes(params.id, CURRENT_ADVOCATE.id),
      ]);
      if (!result) throw new Error("Document not found.");
      setDoc(result);
      setAvailable(profile.available);
      setNotes(ownNotes);
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load this document.");
      setState("error");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // The advocate's own margin notes. Working paper: no busy state, no
  // record, and nothing here reaches the client.
  const marginNotes = useMemo<MarginNotes>(
    () => ({
      items: notes,
      onAdd: async (clauseId, text) => {
        try {
          const note = await addNote({
            documentId: params.id,
            clauseId,
            advocateId: CURRENT_ADVOCATE.id,
            text,
          });
          setNotes((prev) => [...prev, note]);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not keep this note.");
        }
      },
      onUpdate: async (noteId, text) => {
        try {
          const note = await updateNote(noteId, CURRENT_ADVOCATE.id, text);
          setNotes((prev) => prev.map((n) => (n.id === noteId ? note : n)));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save this note.");
        }
      },
      onDelete: async (noteId) => {
        const removed = notes.find((n) => n.id === noteId);
        await deleteNote(noteId, CURRENT_ADVOCATE.id);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (removed) {
          toast("Note removed", {
            action: {
              label: "Undo",
              onClick: async () => {
                const restored = await addNote({
                  documentId: removed.documentId,
                  clauseId: removed.clauseId,
                  advocateId: removed.advocateId,
                  text: removed.text,
                });
                setNotes((prev) => [...prev, restored]);
              },
            },
          });
        }
      },
    }),
    [notes, params.id],
  );

  /** Every mutation goes through here: busy while it runs, errors stated. */
  const run = useCallback(
    async (action: () => Promise<ContractDocument>, failure: string) => {
      setBusy(true);
      try {
        const updated = await action();
        setDoc(updated);
        return updated;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : failure);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /**
   * Settling is a decision on the record, so it is always undoable from
   * the toast, including the single-keystroke C path, where a
   * confirmation dialog would only slow down legitimate adjudication.
   */
  const handleSettle = useCallback(
    async (findingId: string, note: string | null) => {
      if (!doc) return;
      const updated = await run(
        () =>
          updateFinding(doc.id, findingId, {
            disposition: note ? "overridden" : "confirmed",
            overrideNote: note,
          }),
        "Could not settle this finding.",
      );
      if (!updated) return;
      const n = findingNumbers(updated)[findingId];
      toast.success(`Finding ${n} settled`, {
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
    },
    [doc, run],
  );

  const handleReopen = useCallback(
    async (findingId: string) => {
      if (!doc) return;
      await run(
        () => updateFinding(doc.id, findingId, { disposition: "pending", overrideNote: null }),
        "Could not reopen this finding.",
      );
    },
    [doc, run],
  );

  const handleRequestChange = useCallback(
    async (findingId: string, request: string) => {
      if (!doc) return;
      const updated = await run(
        () => requestChange(doc.id, findingId, request, CURRENT_ADVOCATE.name),
        "Could not send this request.",
      );
      if (updated) toast.success("Request sent to the client");
    },
    [doc, run],
  );

  const handleWithdraw = useCallback(
    async (findingId: string, citationId: string, note: string) => {
      if (!doc) return;
      const updated = await run(
        () => withdrawCitation(doc.id, findingId, citationId, note, CURRENT_ADVOCATE.name),
        "Could not withdraw this source.",
      );
      if (updated) toast.success("Source withdrawn. The finding now rests on your note.");
    },
    [doc, run],
  );

  const handleClaim = useCallback(async () => {
    if (!doc) return;
    setClaiming(true);
    try {
      const updated = await claimDocument(doc.id, CURRENT_ADVOCATE);
      setDoc(updated);
      toast.success("Claimed. The document is yours to review.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not claim this document.");
    } finally {
      setClaiming(false);
    }
  }, [doc]);

  const blockers = useMemo(
    () => (doc ? signOffBlockers(doc, CURRENT_ADVOCATE.id) : []),
    [doc],
  );

  const commands = useMemo<PaletteCommand[]>(() => {
    if (!doc) return [];
    const list: PaletteCommand[] = [];
    const mine = doc.advocate?.id === CURRENT_ADVOCATE.id;
    if (!doc.advocate && available) {
      list.push({
        id: "claim",
        group: "Document",
        label: "Claim this document",
        icon: "person",
        onSelect: handleClaim,
      });
    }
    if (mine && blockers.length === 0 && doc.status !== "settled" && doc.status !== "executed") {
      list.push({
        id: "sign-off",
        group: "Document",
        label: "Sign off",
        icon: "check_circle",
        onSelect: () => router.push(`/review/${doc.id}/sign-off`),
      });
    }
    return list;
  }, [doc, available, blockers.length, handleClaim, router]);

  if (state === "loading") {
    return (
      <div className="flex h-full flex-col">
        <div className="space-y-2 border-b border-line px-5 py-3">
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-3 w-96" />
        </div>
        <div className="grid flex-1 gap-px lg:grid-cols-[240px_1fr]">
          <Skeleton className="hidden h-full rounded-none lg:block" />
          <div className="space-y-3 p-10">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "error" || !doc) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const settled = doc.status === "settled" || doc.status === "executed";
  const mine = doc.advocate?.id === CURRENT_ADVOCATE.id;
  const canAdjudicate = mine && !settled;
  const unclaimed = !doc.advocate;
  const owner = unclaimed
    ? "Unclaimed"
    : mine
      ? "Claimed by you"
      : `Held by ${doc.advocate?.name}`;

  return (
    <DocumentWorkspace
      doc={doc}
      role="advocate"
      back={{ href: "/queue", label: "Queue" }}
      owner={owner}
      canAdjudicate={canAdjudicate}
      claim={
        unclaimed
          ? {
              onClaim: handleClaim,
              claiming,
              disabledReason: available
                ? null
                : "You are marked unavailable for new claims. Change this in your profile.",
            }
          : undefined
      }
      blockers={settled ? undefined : blockers}
      aside={
        settled && doc.settledAt ? (
          <span className="inline-flex items-center gap-1 text-label text-verified">
            <Icon name="check_circle" size={16} />
            Signed off by {doc.advocate?.name}
          </span>
        ) : undefined
      }
      commands={commands}
      initialFindingId={initialFindingId}
      notes={marginNotes}
      companion={({ goToClause, openFinding }) => (
        <ReviewAgent
          doc={doc}
          advocateId={CURRENT_ADVOCATE.id}
          onCite={goToClause}
          onOpenFinding={openFinding}
        />
      )}
      actions={
        unclaimed ? (
          <Button size="sm" onClick={handleClaim} disabled={claiming || !available}>
            {claiming ? "Claiming" : "Claim document"}
          </Button>
        ) : canAdjudicate ? (
          <>
            <AddFindingDialog
              clauses={doc.clauses}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onAdd={async (finding) => {
                const updated = await run(
                  () => addFinding(doc.id, finding),
                  "Could not add this finding.",
                );
                if (updated) setDialogOpen(false);
              }}
            />
            <Button
              size="sm"
              disabled={blockers.length > 0}
              onClick={() => router.push(`/review/${doc.id}/sign-off`)}
              title={
                blockers.length > 0
                  ? "Resolve the items in the status strip first"
                  : undefined
              }
            >
              Sign off
            </Button>
          </>
        ) : null
      }
      onSettle={handleSettle}
      onReopen={handleReopen}
      onRequestChange={handleRequestChange}
      onWithdrawSource={handleWithdraw}
      busy={busy}
    />
  );
}

/**
 * A finding the first pass missed. It is raised against a clause of this
 * document and enters the record open, like any other finding: raising a
 * concern and deciding it are two different acts, and both are recorded.
 */
function AddFindingDialog({
  clauses,
  open,
  onOpenChange,
  onAdd,
}: {
  clauses: Clause[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (finding: Finding) => void;
}) {
  const [clauseId, setClauseId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");

  const clause = clauses.find((c) => c.id === clauseId);
  const canSubmit = Boolean(clause) && description.trim().length > 0;

  function reset() {
    setClauseId("");
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
          <DialogDescription>
            It enters the record open. It has no statutory source, so settling
            it will need your note.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="finding-clause">Clause</Label>
            <Select value={clauseId} onValueChange={setClauseId}>
              <SelectTrigger id="finding-clause">
                <SelectValue placeholder="Choose a clause" />
              </SelectTrigger>
              <SelectContent>
                {clauses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.number} · {c.heading}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
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
            <Label htmlFor="finding-description">The concern</Label>
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
            onClick={() => {
              if (!clause) return;
              onAdd({
                findingId: `manual-${Date.now()}`,
                layer: 6,
                severity,
                clauseReference: `Clause ${clause.number}`,
                // The passage is the clause's opening paragraph: the
                // advocate chose the clause, not a span within it.
                clauseText: clause.body.split("\n\n")[0],
                description: description.trim(),
                ruleApplied: "MANUAL-ADVOCATE-ADDED",
                remedySuggested: "Advocate judgment · see the concern above.",
                citations: [],
                disposition: "pending",
                overrideNote: null,
                resolvedAt: null,
                changeRequest: null,
              });
            }}
          >
            Add finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
