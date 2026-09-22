import { cn } from "@/lib/utils";

interface ClauseViewerProps {
  clauseReference: string;
  clauseText: string;
  highlighted?: boolean;
  className?: string;
}

export function ClauseViewer({
  clauseReference,
  clauseText,
  highlighted = true,
  className,
}: ClauseViewerProps) {
  return (
    <blockquote
      className={cn(
        "rounded-card border border-line bg-canvas/60 p-4",
        highlighted && "border-l-4 border-l-accent",
        className,
      )}
    >
      <p className="mb-1.5 text-small font-medium text-muted-fg">
        {clauseReference}
      </p>
      <p className="font-mono text-small leading-relaxed text-ink">
        {clauseText}
      </p>
    </blockquote>
  );
}
