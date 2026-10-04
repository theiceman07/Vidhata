"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { declaredConflictWith } from "@/lib/conflicts";
import type { ContractDocument } from "@/lib/types";

/**
 * What an advocate affirms before they claim a document: no conflict of
 * interest with either party. Claiming assigns the document to them alone,
 * so it is asked once, here, wherever Claim is pressed.
 *
 * The verb stays "Claim". A name on the advocate's own declared-conflicts
 * list that matches a party stops the claim: they cannot declare themselves
 * clear of a conflict they have already declared. The rule is enforced in
 * lib/api/documents.ts; this only says it before the request is made.
 */
export function ClaimDialog({
  doc,
  declaredConflicts,
  open,
  onOpenChange,
  onConfirm,
  claiming,
}: {
  doc: Pick<ContractDocument, "title" | "clientName" | "counterpartyName"> | null;
  declaredConflicts: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  claiming: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  // Each time it opens the declaration is made afresh.
  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  if (!doc) return null;

  const match = declaredConflictWith([doc.clientName, doc.counterpartyName], declaredConflicts);

  return (
    <Dialog open={open} onOpenChange={(next) => !claiming && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Claim this document</DialogTitle>
          <DialogDescription>
            Claiming assigns {doc.title} to you alone. Before you do, confirm you have no conflict
            of interest with either party.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-card bg-parchment p-4 text-meta">
          <div>
            <dt className="text-label font-medium text-muted-fg">Client</dt>
            <dd className="mt-0.5 text-ink">{doc.clientName}</dd>
          </div>
          <div>
            <dt className="text-label font-medium text-muted-fg">Counterparty</dt>
            <dd className="mt-0.5 text-ink">{doc.counterpartyName}</dd>
          </div>
        </dl>

        {match ? (
          <div role="alert" className="space-y-2 border-l-2 border-flagged pl-3 text-meta">
            <p className="text-ink">
              Your profile lists {match.declared} as a declared conflict, and it matches{" "}
              {match.party}. You cannot claim this document.
            </p>
            <p className="text-muted-fg">
              If the entry is a mistake, correct it in your{" "}
              <Link href="/profile" className="text-ink underline underline-offset-2">
                declared conflicts
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="claim-no-conflict"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                disabled={claiming}
                className="mt-1"
              />
              <label htmlFor="claim-no-conflict" className="text-body text-ink">
                I confirm I have no conflict of interest with {doc.clientName} or{" "}
                {doc.counterpartyName}.
              </label>
            </div>
            <p className="pl-7 text-label text-muted-fg">
              Your declaration is recorded with the claim.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={claiming}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm()} disabled={claiming || !confirmed || Boolean(match)}>
            {claiming ? "Claiming" : "Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
