import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ContractDocument, DocumentStatus } from "@/lib/types";

/**
 * Where the document has been, and who is answerable for it.
 *
 * Four stages, set as notation on one line. The advocate's name hangs
 * under the stage where a person took responsibility, because that is
 * the whole claim the product makes: the machine did the first pass, a
 * named advocate decided.
 *
 * This replaces the numbered-circle stepper. Circles in a row are a
 * progress widget; this is a chain of custody.
 */
const STAGES = ["Drafted", "Screened", "Reviewed", "Settled"] as const;

const REACHED: Record<DocumentStatus, number> = {
  draft: 0,
  analysing: 1,
  pending_review: 1,
  under_review: 2,
  revision: 2,
  settled: 3,
  executed: 3,
};

export function Provenance({
  doc,
  className,
}: {
  doc: ContractDocument;
  className?: string;
}) {
  const reached = REACHED[doc.status];

  return (
    <ol className={cn("flex flex-wrap items-start gap-x-2", className)}>
      {STAGES.map((stage, i) => {
        const done = i <= reached;
        const isReviewStage = i === 2;

        return (
          <li key={stage} className="flex items-start gap-2">
            {i > 0 && (
              <span aria-hidden className="mt-0.5 text-line">
                &rarr;
              </span>
            )}
            <span>
              <span
                className={cn(
                  "block font-mono text-notation uppercase tracking-notation",
                  done ? "text-ink" : "text-muted-fg",
                  // The last stage is the only one that earns the accent,
                  // and only once it has actually happened.
                  i === STAGES.length - 1 && done && "text-accent",
                )}
              >
                {stage}
              </span>
              {isReviewStage && doc.advocate && reached >= 2 && (
                <span className="block text-small text-muted-fg">
                  {doc.advocate.name}
                </span>
              )}
              {i === STAGES.length - 1 && doc.settledAt && (
                <span className="block text-small text-muted-fg">
                  {format(new Date(doc.settledAt), "d MMM yyyy")}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
