"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StateLabel } from "@/components/document/state-label";
import { getCitationSource } from "@/lib/api/citations";
import type { BlockedReason, CitationSource } from "@/lib/citations";
import type { WorkspaceCitation } from "@/lib/types";

/**
 * Where a source on a finding resolved to, for the advocate who clicks its
 * badge.
 *
 * A verified source shows the corpus entry it resolved to. A blocked one
 * shows that it is blocked and why, and no entry: there is none to show, and
 * nothing here stands in for one. The corpus holds citations by name, so no
 * provision text appears, and none is written in its place.
 */

const REASON: Record<BlockedReason, string> = {
  empty: "No source was written, so there is nothing to check against the corpus.",
  not_in_corpus:
    "The approved corpus has no entry that matches this source, so it cannot be verified.",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-label font-medium text-muted-fg">{label}</dt>
      <dd className="mt-0.5 text-meta text-ink">{children}</dd>
    </div>
  );
}

export function CitationSourceDialog({
  documentId,
  findingId,
  citation,
  children,
}: {
  documentId: string;
  findingId: string;
  citation: WorkspaceCitation;
  /** The badge. Clicking it is what opens the source. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"loading" | "error" | "loaded">("loading");
  const [error, setError] = useState("");
  const [source, setSource] = useState<CitationSource | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setSource(await getCitationSource({ documentId, findingId, citationId: citation.id }));
      setState("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this source.");
      setState("error");
    }
  }, [documentId, findingId, citation.id]);

  // Read each time it opens, so it says what the corpus holds now.
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Show where this source resolved: ${citation.text}`}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Source</DialogTitle>
          <DialogDescription>{citation.text}</DialogDescription>
        </DialogHeader>

        {state === "loading" && (
          <div className="space-y-3 rounded-card bg-parchment p-4" aria-busy="true">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {state === "error" && (
          <div role="alert" className="space-y-3 border-l-2 border-flagged pl-3">
            <p className="text-meta text-ink">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        )}

        {state === "loaded" && source && (
          <dl className="space-y-3 rounded-card bg-parchment p-4">
            <Row label="State">
              <span className="flex flex-wrap items-center gap-2">
                <StateLabel
                  state={source.status === "verified" ? "citation_verified" : "citation_blocked"}
                />
                {citation.withdrawn && <StateLabel state="citation_withdrawn" />}
              </span>
            </Row>
            {source.status === "verified" ? (
              <>
                <Row label="Corpus entry">{source.entry.label}</Row>
                <Row label="Corpus reference">
                  <span className="font-mono text-label text-muted-fg">{source.entry.ref}</span>
                </Row>
                <p className="text-label text-muted-fg">
                  The corpus holds this entry by name. The text of the provision is not held here.
                </p>
              </>
            ) : (
              <>
                <Row label="Reason">{REASON[source.reason]}</Row>
                <Row label="Corpus entry">None. This source resolved to no entry.</Row>
              </>
            )}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
