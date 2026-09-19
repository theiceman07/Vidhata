import { Check } from "lucide-react";
import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TRAIL_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "analysing", label: "Analysing" },
  { key: "review", label: "Review" },
  { key: "settled", label: "Settled" },
  { key: "executed", label: "Executed" },
] as const;

const STATUS_TO_STEP: Record<DocumentStatus, number> = {
  draft: 0,
  analysing: 1,
  pending_review: 2,
  under_review: 2,
  revision: 2,
  settled: 3,
  executed: 4,
};

export function DocumentStatusTrail({ status }: { status: DocumentStatus }) {
  const currentIndex = STATUS_TO_STEP[status];
  const isRevision = status === "revision";

  return (
    <ol className="flex items-center">
      {TRAIL_STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-small font-medium",
                  isComplete && "bg-verified text-white",
                  isCurrent &&
                    (isRevision
                      ? "bg-caution text-white"
                      : "bg-brand text-brand-fg"),
                  !isComplete && !isCurrent && "bg-line text-muted-fg",
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-small",
                  isCurrent ? "font-medium text-ink" : "text-muted-fg",
                )}
              >
                {isCurrent && isRevision ? "Revision requested" : step.label}
              </span>
            </div>
            {i < TRAIL_STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-2 h-px flex-1",
                  isComplete ? "bg-verified" : "bg-line",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
