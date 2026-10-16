"use client";

import { useMemo, useState } from "react";
import { DocumentWorkspace } from "@/components/document/workspace";
import { PaletteProvider } from "@/components/shared/command-palette";
import { linkFindingsToClauses, mapReviewFindings } from "@/lib/api/findings";
import { buildAuditTrail } from "@/lib/audit";
import { findingNumbers } from "@/lib/findings";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import { R1_FINDINGS } from "@/lib/mock/r1-findings.fixtures";
import type { ContractDocument } from "@/lib/types";

/**
 * Development-only: the review workspace, drawn from findings in the R1 shape.
 *
 * The findings come from lib/mock/r1-findings.fixtures.ts, go through the same R1 mapper the
 * real data will (lib/api/findings.ts), and are laid over the Master Services Agreement's own
 * clauses. One finding per status (pending, confirmed, overridden, added), a verified and a
 * blocked source, two sources on one finding, and one that carries only what R1 requires.
 * The portal is chosen on the page, so the screen can be switched in place.
 */
export default function FindingsFromR1Page() {
  const [role, setRole] = useState<"advocate" | "client">("advocate");

  const doc = useMemo<ContractDocument | null>(() => {
    const base = getMockDocumentById("doc-msa-pending");
    if (!base) return null;
    const findings = mapReviewFindings(R1_FINDINGS);
    return { ...base, findings, clauses: linkFindingsToClauses(base.clauses, findings) };
  }, []);

  if (!doc) return <p className="p-8">Fixture missing.</p>;

  return (
    <div className="flex h-[100dvh] flex-col bg-paper">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2 text-meta text-muted-fg">
        <span>Development only. Findings in the R1 shape, through lib/api/findings.ts.</span>
        <span className="ml-auto flex gap-2" role="group" aria-label="Portal">
          {(["advocate", "client"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className="rounded-control border border-line px-3 py-1 text-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {r === "advocate" ? "Advocate's review" : "Client's reader"}
            </button>
          ))}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <PaletteProvider>
          <DocumentWorkspace
            key={role}
            doc={doc}
            role={role}
            numbering={findingNumbers(doc)}
            trail={buildAuditTrail(doc)}
            back={{ href: "/dev/components", label: "Gallery" }}
          />
        </PaletteProvider>
      </div>
    </div>
  );
}
