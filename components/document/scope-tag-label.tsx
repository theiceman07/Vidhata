import { cn } from "@/lib/utils";
import { scopeTagLabel, type ScopeTag } from "@/lib/reviewScope";

/**
 * What a finding is this round: new, carried over, resolved, or decided
 * before. Like AddedByLabel it is provenance, not a state, so it is quiet:
 * colour is for decisions.
 */
export function ScopeTagLabel({ tag, className }: { tag: ScopeTag; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-line px-2.5 py-0.5",
        "text-label font-medium text-muted-fg",
        className,
      )}
    >
      {scopeTagLabel(tag)}
    </span>
  );
}
