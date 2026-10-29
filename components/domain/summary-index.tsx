"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "On this page" for a summary: a quiet reading guide, not a second column of
 * content. A thin track runs down its left edge and the section being read has
 * a green mark on it and stronger text, so the mark is never the only sign
 * (the current row also carries aria-current). It sticks while the page scrolls.
 */
export function SummaryIndex({
  sections,
}: {
  sections: { key: string; title: string }[];
}) {
  const [active, setActive] = useState(sections[0]?.key ?? "");

  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(`summary-${s.key}`))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;
    // The section whose heading was last passed, a little below the top of the screen.
    const update = () => {
      let current = sections[0]?.key ?? "";
      for (const el of headings) {
        if (el.getBoundingClientRect().top <= 160)
          current = el.id.replace("summary-", "");
      }
      setActive(current);
    };
    update();
    const scroller = headings[0].closest("main") ?? window;
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
    };
  }, [sections]);

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-24">
        <p className="mb-3 text-label text-muted-fg">On this page</p>
        <ul className="border-l border-line">
          {sections.map((section) => {
            const current = section.key === active;
            return (
              <li key={section.key}>
                <a
                  href={`#summary-${section.key}`}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1.5 pl-4 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none",
                    current
                      ? "border-brand font-medium text-ink"
                      : "border-transparent text-muted-fg hover:text-ink",
                  )}
                >
                  {section.title}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
