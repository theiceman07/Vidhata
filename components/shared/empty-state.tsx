import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /**
   * Optional, and usually omitted. An icon here communicates nothing the
   * heading does not already say, and the board is explicit that icons
   * carry function rather than fill empty space.
   */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * An empty state is a quiet legal workbench, not an illustration with
 * marketing copy. It states the fact, then offers the one action that
 * makes sense from here.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="border-l-2 border-line py-6 pl-6">
      {Icon && <Icon className="mb-3 h-5 w-5 text-muted-fg" aria-hidden />}
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
