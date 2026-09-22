import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * An empty state is a quiet legal workbench, not an illustration with
 * marketing copy. It states the fact, then offers the one action that
 * makes sense from here.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border-l-2 border-line py-6 pl-6">
      <p className="font-display text-h3 text-ink">{title}</p>
      {description && (
        <p className="mt-2 max-w-prose text-meta text-muted-fg">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
