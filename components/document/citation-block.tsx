import { format } from "date-fns";
import type { Citation } from "@/lib/types";
import { StateLabel } from "./state-label";

/**
 * A finding without a citation is an opinion.
 *
 * The source is shown at the same moment as the concern, never behind a
 * disclosure, a tooltip or a modal. It is a definition list on hairlines
 * rather than a card, because it is evidence attached to a claim.
 *
 * Provenance is stated, not implied: what the source was checked against
 * and what came back. A blocked source says why it is blocked and, for
 * an advocate, what can be done about it.
 */

/**
 * Citation text arrives as one reference string, e.g.
 * "Indian Contract Act, 1872, s.27". Split on the last comma to separate
 * the instrument from the provision. If there is no comma, the whole
 * string is the statute and no provision is shown: a provision is never
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-1.5 last:border-b-0">
      <dt className="w-24 shrink-0 text-label text-muted-fg">{label}</dt>
      <dd className="min-w-0 flex-1 text-meta text-ink">{children}</dd>
    </div>
  );
}

export function CitationBlock({
  citations,
  showWithdrawalNote,
  blockedActions,
}: {
  citations: Citation[];
  /** The advocate's reasoning is advocate-facing, like the override note. */
  showWithdrawalNote: boolean;
  /** Resolution controls for a blocked source, when the viewer can act. */
  blockedActions?: (citation: Citation) => React.ReactNode;
}) {
  if (citations.length === 0) {
    return (
      <div className="border-l-2 border-line pl-3">
        <p className="text-meta text-ink">
          No statutory source. This finding rests on advocate judgment, and
          settling it requires a recorded note.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {citations.map((citation) => {
        const { statute, provision } = splitReference(citation.text);
        const blocked = citation.status === "blocked";
        const withdrawn = citation.withdrawn;

        return (
          <div
            key={citation.id}
            className={blocked && !withdrawn ? "border-l-2 border-flagged pl-3" : undefined}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StateLabel state={blocked ? "citation_blocked" : "citation_verified"} />
              {withdrawn && <StateLabel state="citation_withdrawn" />}
            </div>

            <dl className="mt-2">
              <Row label="Source">
                <span className={withdrawn ? "text-muted-fg line-through" : undefined}>
                  {statute}
                </span>
              </Row>
              {provision && <Row label="Provision">{provision}</Row>}
              <Row label="Checked">
                {blocked ? (
                  <span className="text-flagged">
                    No match in the approved corpus
                  </span>
                ) : (
                  <>
                    Approved corpus{" "}
                    <span className="font-mono text-label text-muted-fg">
                      {citation.corpusRef}
                    </span>
                  </>
                )}
              </Row>
            </dl>

            {blocked && !withdrawn && (
              <>
                <p className="mt-2 text-meta text-ink">
                  The pipeline could not verify this source. The finding
                  cannot be settled while it relies on it.
                </p>
                {blockedActions?.(citation)}
              </>
            )}

            {withdrawn && (
              <p className="mt-2 text-meta text-muted-fg">
                Withdrawn by {withdrawn.by} ·{" "}
                {format(new Date(withdrawn.at), "d MMM yyyy")}. The finding no
                longer relies on this source.
                {showWithdrawalNote && (
                  <span className="mt-1 block border-l-2 border-accent pl-3 text-ink">
                    {withdrawn.note}
                  </span>
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
