"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { StateLabel } from "@/components/document/state-label";
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
import { checkCitation } from "@/lib/api/citations";
import type { CitationLookup } from "@/lib/citations";
import { CORPUS } from "@/lib/mock/corpus.mock";
import type { Citation, Clause, NewFinding, Severity } from "@/lib/types";

const NO_SOURCE = "__none";

/**
 * A finding the first pass missed.
 *
 * It is raised against a clause of this document and enters the record
 * open, like any other finding: raising a concern and deciding it are two
 * different acts, and both are recorded.
 *
 * A source is optional, and there are two ways to give one. Pick it from
 * the corpus, and it is verified, because the corpus is where verified
 * means. Or type it, and the corpus checks it: an exact match verifies,
 * and anything else is blocked, however close it looks. A blocked source
 * can still be saved with the finding, and then it holds the finding open
 * and holds sign-off until it is withdrawn with a note. A citation is
 * verified or blocked, never "probably fine".
 */
export function AddFindingDialog({
  documentId,
  advocateId,
  clauses,
  open,
  onOpenChange,
  onAdd,
}: {
  documentId: string;
  advocateId: string;
  clauses: Clause[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (finding: NewFinding) => Promise<void> | void;
}) {
  const [clauseId, setClauseId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [pickedRef, setPickedRef] = useState(NO_SOURCE);
  const [typed, setTyped] = useState("");
  // What the corpus said about the typed text, and which text that was, so a
  // result is never shown against words that have since been edited.
  const [checked, setChecked] = useState<{ for: string; result: CitationLookup } | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const clause = clauses.find((c) => c.id === clauseId);
  const canSubmit = Boolean(clause) && description.trim().length > 0 && !submitting && !checking;
  const result = checked && checked.for === typed ? checked.result : null;

  const reset = useCallback(() => {
    setClauseId("");
    setDescription("");
    setSeverity("medium");
    setPickedRef(NO_SOURCE);
    setTyped("");
    setChecked(null);
    setChecking(false);
    setSubmitting(false);
    setError("");
  }, []);

  // Start clean whenever the dialog closes, however it closes. The page
  // closes it after a save, which never calls onOpenChange, so resetting
  // there alone left the last finding's clause, concern and citation in the
  // form, and a blocked source could ride along onto the next finding.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  function pick(ref: string) {
    setPickedRef(ref);
    // One source: choosing from the corpus replaces anything typed.
    setTyped("");
    setChecked(null);
    setError("");
  }

  function type(text: string) {
    setTyped(text);
    // And typing replaces the pick.
    setPickedRef(NO_SOURCE);
    setError("");
  }

  async function check(): Promise<CitationLookup | null> {
    setChecking(true);
    setError("");
    try {
      const lookup = await checkCitation({ documentId, advocateId, input: typed });
      setChecked({ for: typed, result: lookup });
      return lookup;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check this source.");
      return null;
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    if (!clause) return;

    const citations: Citation[] = [];
    if (pickedRef !== NO_SOURCE) {
      const entry = CORPUS.find((e) => e.ref === pickedRef);
      if (entry) {
        citations.push({
          id: `cite-${Date.now()}`,
          text: entry.label,
          status: "verified",
          corpusRef: entry.ref,
          withdrawn: null,
        });
      }
    } else if (typed.trim() !== "") {
      // Saved against what the corpus says, whether or not "Check" was
      // pressed: an unchecked typed source is never saved as it stands.
      const lookup = result ?? (await check());
      if (!lookup) return;
      citations.push({
        id: `cite-${Date.now()}`,
        text: lookup.text,
        status: lookup.status,
        corpusRef: lookup.corpusRef,
        withdrawn: null,
      });
    }

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
        citations,
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
            It enters the record open, marked as added by you. A source is
            optional. Without a verified one, settling it will need your note.
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

          <fieldset className="space-y-3 rounded-control bg-parchment p-4">
            <legend className="px-1 text-label font-medium text-muted-fg">Source (optional)</legend>
            <div>
              <Label htmlFor="finding-source-pick">Pick one from the corpus</Label>
              <Select value={pickedRef} onValueChange={pick}>
                <SelectTrigger id="finding-source-pick">
                  <SelectValue placeholder="No source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SOURCE}>No source</SelectItem>
                  {CORPUS.map((entry) => (
                    <SelectItem key={entry.ref} value={entry.ref}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pickedRef !== NO_SOURCE && (
                <p className="mt-2 flex items-center gap-2 text-meta text-muted-fg">
                  <StateLabel state="citation_verified" />
                  In the corpus.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="finding-source-type">Or type one, and the corpus checks it</Label>
              <div className="flex gap-2">
                <Input
                  id="finding-source-type"
                  value={typed}
                  onChange={(e) => type(e.target.value)}
                  placeholder="As it is cited"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void check()}
                  disabled={typed.trim() === "" || checking}
                >
                  {checking ? "Checking" : "Check"}
                </Button>
              </div>
              {result && (
                <div className="mt-2 text-meta text-muted-fg" role="status">
                  {result.status === "verified" ? (
                    <p className="flex flex-wrap items-center gap-2">
                      <StateLabel state="citation_verified" />
                      <span className="text-ink">{result.text}</span>
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <StateLabel state="citation_blocked" />
                      <p>
                        The corpus holds no exact match. You can still add the
                        finding, but this source will stay blocked, and the
                        finding cannot be settled or signed off until it is
                        withdrawn with a note.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-small text-flagged">
              {error}
            </p>
          )}
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
