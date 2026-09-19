"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";
import { LayerBadge } from "@/components/domain/layer-badge";
import { SeverityPill } from "@/components/domain/severity-pill";
import { ClauseViewer } from "@/components/domain/clause-viewer";
import { CitationBadge } from "@/components/domain/citation-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FindingCardProps {
  finding: Finding;
  mode: "read-only" | "adjudicable";
  onConfirm?: (findingId: string) => void;
  onOverride?: (findingId: string, note: string) => void;
}

const DISPOSITION_BORDER: Record<Finding["disposition"], string> = {
  pending: "border-l-line",
  confirmed: "border-l-verified",
  overridden: "border-l-caution",
};

export function FindingCard({
  finding,
  mode,
  onConfirm,
  onOverride,
}: FindingCardProps) {
  const [showOverride, setShowOverride] = useState(
    finding.disposition === "overridden",
  );
  const [note, setNote] = useState(finding.overrideNote ?? "");

  const canSaveOverride = note.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-card border border-line border-l-4 bg-paper p-5 shadow-card",
        DISPOSITION_BORDER[finding.disposition],
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayerBadge layer={finding.layer} />
          <SeverityPill severity={finding.severity} />
        </div>
        <span className="text-small font-medium text-muted-fg">
          {finding.clauseReference}
        </span>
      </div>

      <p className="mb-3 text-body text-ink">{finding.description}</p>

      <ClauseViewer
        clauseReference={finding.clauseReference}
        clauseText={finding.clauseText}
        className="mb-3"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {finding.citations.map((citation) => (
          <CitationBadge key={citation.id} citation={citation} />
        ))}
      </div>

      <div className="rounded-card bg-canvas/70 p-3">
        <p className="mb-1 text-small font-medium text-muted-fg">
          Suggested remedy
        </p>
        <p className="text-body text-ink">{finding.remedySuggested}</p>
      </div>

      {mode === "adjudicable" && (
        <div className="mt-4 border-t border-line pt-4">
          {showOverride ? (
            <div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain why this finding is being overridden (required)"
                className="mb-3"
                aria-label={`Override note for finding ${finding.clauseReference}`}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!canSaveOverride}
                  onClick={() => onOverride?.(finding.findingId, note)}
                  aria-label={`Save override for finding ${finding.clauseReference}`}
                >
                  Save override
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOverride(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onConfirm?.(finding.findingId)}
                aria-label={`Confirm finding ${finding.clauseReference}`}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOverride(true)}
                aria-label={`Override finding ${finding.clauseReference}`}
              >
                Override
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
