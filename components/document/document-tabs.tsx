"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTab, documentTabs } from "@/lib/documentTabs";
import { cn } from "@/lib/utils";

/**
 * The way between a document's pages.
 *
 * One row of pills, the same on the document and on every page under it, so a
 * client always sees where they are and reaches any sibling in one click. The
 * current page is a filled pill and carries aria-current, so it is not marked
 * by colour alone. Which tabs exist is decided in lib/documentTabs.ts: none
 * of the pages that rest on the settled text appears before a sign-off.
 */
export function DocumentTabs({
  documentId,
  signedOff,
  checklist,
  className,
}: {
  documentId: string;
  signedOff: boolean;
  checklist?: { done: number; total: number } | null;
  className?: string;
}) {
  const pathname = usePathname();
  const tabs = documentTabs({ documentId, signedOff, checklist });
  const current = activeTab(tabs, pathname);

  return (
    <nav aria-label="This document" className={cn("print:hidden", className)}>
      <ul className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = current?.key === tab.key;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-4 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "bg-ink font-medium text-paper"
                    : "bg-parchment text-ink hover:bg-line",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
