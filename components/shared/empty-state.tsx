import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line px-6 py-16 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-fg" aria-hidden />
      <p className="text-body font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-small text-muted-fg">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
