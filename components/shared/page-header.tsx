import { Children, isValidElement, type ReactNode } from "react";
import { BackButton } from "@/components/shared/back-button";
import { cn } from "@/lib/utils";

/**
 * The one way a portal page says what it is.
 *
 * Every page in both portals starts here, so the title sits at one left edge
 * (the shell's padding), one height, one size, and the description under it is
 * one size and one measure. The way back, when there is one, is always the
 * same pill on the same line above the title, with the page's actions at the
 * right of that line, and the line is kept even when there is neither, so a
 * title does not move as a person clicks between pages.
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
   * between them are drawn here, so a separator never starts or ends a line.
   */
  meta?: ReactNode;
  /** Buttons on the right of the title. */
  actions?: ReactNode;
  /** A row of tabs under the header, the same on every page of a set (a document's pages). */
  tabs?: ReactNode;
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
  tabs,
  back,
  className,
}: PageHeaderProps) {
  const facts = Children.toArray(meta).filter(
    (child) => isValidElement(child) || (typeof child === "string" && child.trim() !== ""),
  );

  return (
    <header className={cn("mb-8", className)}>
      {/* One line above the title: the way back and the page's actions. Kept at
          one height whether or not either is there, and the actions sit here, on
          the right, so a long row of them never squeezes the title. */}
      <div className="mb-1 flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          {back && <BackButton fallbackHref={back.fallbackHref} label={back.label} />}
          {eyebrow && <p className="min-w-0 truncate text-meta text-muted-fg">{eyebrow}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <h1 className="font-display text-h1 text-ink">{title}</h1>
      {description && <p className="mt-2 max-w-measure text-body text-muted-fg">{description}</p>}
      {facts.length > 0 && (
        // Every fact carries a dot at its left, and the row is pulled left by the
        // width of one and clipped, so the dot of the first fact on any line (the
        // first line, or one that wrapped) falls outside and is never seen. A dot
        // can then never start or end a line.
        <div className="mt-2 overflow-hidden pb-px">
          <p className="-ml-5 flex flex-wrap gap-y-1 text-meta text-muted-fg">
            {facts.map((fact, i) => (
              <span
                key={i}
                className="relative pl-5 before:absolute before:left-2 before:content-['·']"
              >
                {fact}
              </span>
            ))}
          </p>
        </div>
      )}
      {tabs && <div className="mt-4">{tabs}</div>}
    </header>
  );
}
