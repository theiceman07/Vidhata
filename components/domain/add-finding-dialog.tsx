"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CORPUS } from "@/lib/mock/corpus.mock";
import type { Clause, NewFinding, Severity } from "@/lib/types";

/**
 * A finding the first pass missed.
 *
 * It is raised against a clause of this document and enters the record
 * open, like any other finding: raising a concern and deciding it are two
 * different acts, and both are recorded.
 *
 * It needs the source it rests on, written as it is cited. The backend holds
 * a finding to one citation, and not an empty one. The corpus entries are
 * offered as suggestions to type from; whether a citation resolves is the
 * citation gate's work (layer 5), and nothing here says it has been checked.
 */
export function AddFindingDialog({
  clauses,
  open,
  onOpenChange,
  onAdd,
}: {
  clauses: Clause[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (finding: NewFinding) => Promise<void> | void;
}) {
  const [clauseId, setClauseId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [citation, setCitation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clause = clauses.find((c) => c.id === clauseId);
  const canSubmit =
    Boolean(clause) && description.trim().length > 0 && citation.trim().length > 0 && !submitting;

  // Start clean whenever the dialog closes, however it closes. The page
  // closes it after a save, which never calls onOpenChange, so resetting
  // there alone left the last finding's clause, concern and citation in the
  // form, and they could ride along onto the next finding.
  useEffect(() => {
    if (open) return;
    setClauseId("");
    setDescription("");
    setSeverity("medium");
    setCitation("");
    setSubmitting(false);
  }, [open]);

  async function submit() {
    if (!clause) return;

    setSubmitting(true);
    try {
      await onAdd({
        findingId: `manual-${Date.now()}`,
        source: "advocate",
        layer: 6,
        severity,
        clauseReference: `Clause ${clause.number}`,
        // The passage is the clause's opening paragraph: the advocate chose
        // the clause, not a span within it.
        clauseText: clause.body.split("\n\n")[0],
        description: description.trim(),
        ruleApplied: "MANUAL-ADVOCATE-ADDED",
        remedySuggested: "Advocate judgment · see the concern above.",
        citation: citation.trim(),
        disposition: "pending",
        overrideNote: null,
        resolvedAt: null,
        changeRequest: null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            It enters the record open, marked as added by you. Give the source
            it rests on, as it is cited.
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
                <SelectItem value="critical">Critical</SelectItem>
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

          <div>
            <Label htmlFor="finding-source">Source</Label>
            <Input
              id="finding-source"
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              list="finding-source-suggestions"
              placeholder="As it is cited, e.g. Indian Contract Act, 1872, s.27"
              autoComplete="off"
            />
            <datalist id="finding-source-suggestions">
              {CORPUS.map((entry) => (
                <option key={entry.ref} value={entry.label} />
              ))}
            </datalist>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!canSubmit} onClick={() => void submit()}>
            {submitting ? "Adding" : "Add finding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
