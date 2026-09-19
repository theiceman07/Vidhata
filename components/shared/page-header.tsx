import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-6">
      <div>
        {breadcrumb && (
          <div className="mb-1 text-small text-muted-fg">{breadcrumb}</div>
        )}
        <h1 className="font-display text-h1 text-ink">{title}</h1>
        {description && (
          <p className="mt-1 text-body text-muted-fg">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
