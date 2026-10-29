"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTab, documentTabs } from "@/lib/documentTabs";
import { cn } from "@/lib/utils";

/**
 * The way between a document's pages.
 *
 * One quiet row, the same on the document and on every page under it, so a
 * client always sees where they are and reaches any sibling in one click. The
 * current page is ink with a rule under it and carries aria-current, so it is
 * not marked by colour alone; the others are muted until pointed at. Which tabs exist is decided in lib/documentTabs.ts: none
 * of the pages that rest on the settled text appears before a sign-off.
 */
export function DocumentTabs({
  documentId,
  signedOff,
  checklist,
  documentTitle,
  className,
}: {
  documentId: string;
  signedOff: boolean;
  /** Names the document at the left of the row, from xl up, where the row stays in view as the page scrolls. */
  documentTitle?: string;
  checklist?: { done: number; total: number } | null;
  className?: string;
}) {
  const pathname = usePathname();
  const tabs = documentTabs({ documentId, signedOff, checklist });
  const current = activeTab(tabs, pathname);

  return (
    <nav
      aria-label="This document"
      className={cn("flex items-center gap-x-8 print:hidden", className)}
    >
      {documentTitle && (
        <p className="hidden max-w-[20rem] shrink-0 truncate text-meta font-medium text-ink xl:block" title={documentTitle}>
          {documentTitle}
        </p>
      )}
      <ul className={cn("flex flex-wrap items-center gap-x-1 gap-y-0", documentTitle ? "-ml-3 xl:ml-0" : "-ml-3")}>
        {tabs.map((tab) => {
          const active = current?.key === tab.key;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 items-center rounded-control px-3 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "font-medium text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-ink"
                    : "text-muted-fg hover:text-ink",
                )}
              >
                {tab.label}
                {tab.badge && (
                  <span
                    className="ml-2 rounded-full bg-parchment px-2 text-label tabular-nums text-muted-fg"
                    aria-label={`${tab.badge.replace("/", " of ")} steps done`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
