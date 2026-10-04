import { cn } from "@/lib/utils";

/**
 * Says a finding was raised by the advocate in review, not by the first
 * pass. It is provenance, not a state, so it sits beside the state labels
 * rather than among them, and it is quiet: colour is for decisions.
 */
export function AddedByLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-line px-2.5 py-0.5",
        "text-label font-medium text-muted-fg",
        className,
      )}
    >
      Added by advocate
    </span>
  );
}
