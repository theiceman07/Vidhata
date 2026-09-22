import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  action?: ReactNode;
  // QA 10.7: secondary screens had no consistent route back to their
  // parent, leaving dead-end screens dependent on browser history. This is
  // always a semantic parent link, never router.back().
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  backHref,
  backLabel = "Back",
}: PageHeaderProps) {
  return (
    <div className="mb-6 border-b border-line pb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-small text-muted-fg hover:text-ink"
        >
          <Icon name="chevron_left" size={16} />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
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
    </div>
  );
}
