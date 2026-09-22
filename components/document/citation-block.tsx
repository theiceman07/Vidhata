import type { Citation } from "@/lib/types";
import { StateLabel } from "./state-label";

/**
 * A finding without a citation is an opinion.
 *
 * The source is shown at the same moment as the concern, never behind a
 * disclosure, a tooltip or a modal. This is a definition list on
 * hairlines rather than a card, because it is evidence attached to a
 * claim, not a separate object.
 */

/**
 * Citation text arrives as one reference string, e.g.
 * "Indian Contract Act, 1872, s.27". Split on the last comma to separate
 * the instrument from the provision. If there is no comma, the whole
 * string is the statute and no provision is shown — a provision is never
 * synthesised out of a reference that does not carry one.
 */
function splitReference(text: string): {
  statute: string;
  provision: string | null;
} {
  const at = text.lastIndexOf(",");
  if (at === -1) return { statute: text, provision: null };
  return {
    statute: text.slice(0, at).trim(),
    provision: text.slice(at + 1).trim() || null,
  };
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="w-28 shrink-0 font-mono text-notation uppercase tracking-notation text-muted-fg">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-meta text-ink">{children}</dd>
    </div>
  );
}

export function CitationBlock({
  citations,
  raisedBy,
  resolvedBy,
}: {
  citations: Citation[];
  /** "AI first pass · 22 Sep 2026" */
  raisedBy: string;
  /** "R. Kapoor, advocate" or null while the finding is still open. */
  resolvedBy: string | null;
}) {
  if (citations.length === 0) {
    return (
      <div className="border-l-2 border-flagged pl-4">
        <StateLabel state="citation_blocked" />
        <p className="mt-2 text-meta text-ink">
          No source was recorded for this finding. It cannot be settled
          until one is.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {citations.map((citation) => {
        const { statute, provision } = splitReference(citation.text);
        const blocked = citation.status === "blocked";

        return (
          <div key={citation.id}>
            <StateLabel
              state={blocked ? "citation_blocked" : "citation_verified"}
            />

            <dl className="mt-3">
              <Row label="Statute">
                <span className={blocked ? "text-flagged" : undefined}>
                  {statute}
                </span>
              </Row>
              {provision && <Row label="Provision">{provision}</Row>}
              <Row label="Raised by">{raisedBy}</Row>
              <Row label="Resolved by">
                {resolvedBy ?? <span className="text-muted-fg">Pending</span>}
              </Row>
            </dl>

            {blocked && (
              // State the fact, then the owner. Never soften a blocked
              // source into a probability.
              <p className="mt-3 border-l-2 border-flagged pl-3 text-meta text-flagged">
                This source could not be verified against the corpus. The
                finding cannot be settled until it is.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
