import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-line text-ink" },
  analysing: { label: "Analysing", className: "bg-info/15 text-info" },
  pending_review: {
    label: "Pending review",
    className: "bg-caution/15 text-caution",
  },
  under_review: {
    label: "Under review",
    className: "bg-info/15 text-info",
  },
  revision: { label: "Revision", className: "bg-caution/15 text-caution" },
  settled: { label: "Settled", className: "bg-verified/15 text-verified" },
  executed: { label: "Executed", className: "bg-verified/15 text-verified" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-small font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
