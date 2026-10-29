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
 * screens and the error pages. The document workspace uses the `compact` form,
 * which keeps the same slots on fewer lines and sets the title one step down
 * (h2) because the workspace is height-bound. lib/typeScale.test.ts holds the
 * h1s to this file.
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
  /** Beside the title, so a state sits next to what it describes. */
  status?: ReactNode;
  /** At the right of the title's own line, level with the title. */
  titleActions?: ReactNode;
  /** A full-width strip under the title and above the tabs. */
  strip?: ReactNode;
  /** A row of tabs under the header, the same on every page of a set (a document's pages). */
  tabs?: ReactNode;
  /**
   * Keep the tabs in view as the page scrolls (from md up, where the page
   * scrolls inside the shell). The large title scrolls away; the way between
   * the document's pages does not.
   */
  stickyTabs?: boolean;
  /**
   * The way back. `fallbackHref` is where it goes when there is nothing to go
   * back to; `label` names that place for assistive technology.
   */
  back?: { fallbackHref: string; label?: string };
  /**
   * The document workspace's header: the way back, the title and the facts on
   * one line, the actions at the right, and nothing else (no description, no
   * eyebrow, no space below). The workspace is height-bound, so every pixel
   * here is a pixel off the reading column.
   */
  compact?: boolean;
  /**
   * The workspace's stacked header: the way back on a slim line, the title and
   * state beneath it, the facts under that, and the actions at the right,
   * level with the bottom of the block. No space is spent below.
   */
  stacked?: boolean;
  /** In the compact header, the title at the size every other page's title has. */
  largeTitle?: boolean;
  /** In the stacked header, the title one step down (h2), so a long title leaves room for the actions on its line. */
  dense?: boolean;
  className?: string;
}

/** The facts that are there: empties (null, false, blank text) are dropped. */
function toFacts(meta: ReactNode) {
  return Children.toArray(meta).filter(
    (child) => isValidElement(child) || (typeof child === "string" && child.trim() !== ""),
  );
}

/**
 * Short facts, each with a dot at its left. The row is pulled left by the width
 * of one dot and clipped, so the dot of the first fact on any line (the first
 * line, or one that wrapped) falls outside and is never seen. A dot can then
 * never start or end a line.
 */
export function PageFacts({
  facts: given,
  className,
  dense,
}: {
  facts: ReactNode;
  className?: string;
  /** Closer dots, for the workspace header where every pixel of width counts. */
  dense?: boolean;
}) {
  const facts = toFacts(given);
  if (facts.length === 0) return null;
  return (
    <div className={cn("overflow-hidden pb-px", className)}>
      <p className={cn("flex flex-wrap gap-y-1 text-meta text-muted-fg", dense ? "-ml-4" : "-ml-5")}>
        {facts.map((fact, i) => (
          <span
            key={i}
            className={cn(
              "relative before:absolute before:content-['·']",
              dense ? "pl-4 before:left-1.5" : "pl-5 before:left-2",
            )}
          >
            {fact}
          </span>
        ))}
      </p>
    </div>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  actions,
  status,
  titleActions,
  strip,
  tabs,
  stickyTabs,
  back,
  compact,
  stacked,
  largeTitle,
  dense,
  className,
}: PageHeaderProps) {
  const facts = toFacts(meta);

  if (stacked) {
    return (
      <header className={cn("pb-1", tabs && "mb-6", className)}>
        {back && <BackButton fallbackHref={back.fallbackHref} label={back.label} />}
        <div className="mt-2 flex items-center justify-between gap-x-6 gap-y-2 max-md:flex-wrap">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
            <h1 className={cn("font-display text-ink", dense ? "text-h2" : "text-h1")}>{title}</h1>
            {status}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        <PageFacts facts={facts} className="mt-2" />
        {tabs && <div className="-mx-4 mt-3 border-b border-line px-4 md:-mx-8 md:px-8">{tabs}</div>}
      </header>
    );
  }

  if (compact) {
    return (
      <header className={className}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            {back && <BackButton fallbackHref={back.fallbackHref} label={back.label} />}
            <h1 className={cn("font-display text-ink", largeTitle ? "text-h1" : "text-h2")}>{title}</h1>
            {status}
            <PageFacts facts={facts} dense />
          </div>
          {actions && (
            // A large serif title's visual middle sits a little below its box's, so the actions follow it.
            <div className={cn("flex flex-wrap items-center gap-2", largeTitle && "translate-y-0.5")}>{actions}</div>
          )}
        </div>
      </header>
    );
  }

  const barApart = Boolean(stickyTabs && tabs);

  return (
    <>
    <header className={cn(barApart ? "mb-2" : "mb-6", className)}>
      {/* The way back (and an eyebrow) on a slim line; the page's actions sit
          at the right of the title's own line, so the header spends no row on them. */}
      {(back || eyebrow) && (
        <div className="flex items-center gap-3">
          {back && <BackButton fallbackHref={back.fallbackHref} label={back.label} />}
          {eyebrow && <p className="min-w-0 truncate text-meta text-muted-fg">{eyebrow}</p>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-display text-h1 text-ink">{title}</h1>
          {status}
        </div>
        {(actions || titleActions) && (
          <div className="flex flex-wrap items-center gap-2">
            {titleActions}
            {actions}
          </div>
        )}
      </div>
      {description && <p className="mt-2 max-w-2xl text-meta text-muted-fg">{description}</p>}
      <PageFacts facts={facts} className="mt-2" />
      {strip && <div className="mt-3">{strip}</div>}
      {tabs && !barApart && (
        <div className="-mx-4 mt-5 border-b border-line px-4 md:-mx-8 md:px-8">{tabs}</div>
      )}
    </header>
    {barApart && (
      // A sibling of the header, not inside it: a sticky box stays only within
      // its parent, and the header ends where the title does. The shell pads its
      // scroll area by 2rem (py-8) and a sticky box sticks inside that padding,
      // so the offset is -2rem to sit flush at the top rather than 2rem down.
      <div className="-mx-4 mb-6 bg-paper px-4 md:sticky md:-top-8 md:z-20 md:-mx-8 md:px-8">{tabs}</div>
    )}
    </>
  );
}
