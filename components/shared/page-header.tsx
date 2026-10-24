import { Children, isValidElement, type ReactNode } from "react";
import { BackButton } from "@/components/shared/back-button";
import { cn } from "@/lib/utils";

/**
 * The one way a portal page says what it is.
 *
 * Every page in both portals starts here, so the title sits at one left edge
 * (the shell's padding), one height, one size, and the description under it is
 * one size and one measure. The way back, when there is one, is always the
 * same pill on the same line above the title, and that line is kept even when
 * there is no way back, so a title does not move as a person clicks between
 * pages.
 *
 * Slots: back, eyebrow, title, description, meta, actions. No hairline rule
 * under it: sections are divided by space and tint (CLAUDE.md).
 *
 * Not for: the marketing and public pages (their hero is their own), the auth
 * screens, the error pages, and the document workspace's full-bleed header,
 * which sits inside its own panes. lib/typeScale.test.ts holds the h1s to this.
 */
export interface PageHeaderProps {
  title: ReactNode;
  /** One line above the title: the document's name, a section, who you are. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /**
   * Short facts under the description (client, counterparty, draft, tier).
   * Pass an array or fragment of nodes: empties are dropped and the dots
   * between them are drawn here, so a separator never dangles at a line end.
   */
  meta?: ReactNode;
  /** Buttons on the right of the title. */
  actions?: ReactNode;
  /**
   * The way back. `fallbackHref` is where it goes when there is nothing to go
   * back to; `label` names that place for assistive technology.
   */
  back?: { fallbackHref: string; label?: string };
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  actions,
  back,
  className,
}: PageHeaderProps) {
  const facts = Children.toArray(meta).filter(
    (child) => isValidElement(child) || (typeof child === "string" && child.trim() !== ""),
  );

  return (
    <header className={cn("mb-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-4", className)}>
      <div className="min-w-0 flex-1">
        {/* Kept at one height whether or not there is a way back. */}
        <div className="mb-1 flex min-h-8 items-center gap-3">
          {back && <BackButton fallbackHref={back.fallbackHref} label={back.label} />}
          {eyebrow && <p className="min-w-0 truncate text-meta text-muted-fg">{eyebrow}</p>}
        </div>
        <h1 className="font-display text-h1 text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-measure text-body text-muted-fg">{description}</p>}
        {facts.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-fg [&>*+*]:before:mr-2 [&>*+*]:before:content-['·']">
            {facts.map((fact, i) => (
              <span key={i}>{fact}</span>
            ))}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">{actions}</div>}
    </header>
  );
}
