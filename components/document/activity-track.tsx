"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";
import type { TrailEntry } from "@/components/document/audit-trail";

/**
 * The record as one horizontal track, newest first.
 *
 * About four entries show at once on a wide screen, two on a tablet and one
 * and a bit on a phone. The scroller is a region the keyboard can reach, it
 * snaps to whole entries, and the arrows page it by exactly what is in view.
 * The range line ("1 to 4 of 9") is computed from the scroll position, so it
 * names the entries a reader can actually see, and an arrow is disabled when
 * there is nowhere further to go. The page never scrolls sideways.
 */
export function ActivityTrack({
  entries,
  onSelectFinding,
}: {
  entries: TrailEntry[];
  onSelectFinding?: (finding: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ first: 1, last: Math.min(entries.length, 1) });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    const items = el?.querySelectorAll<HTMLElement>("[data-entry]");
    if (!el || !items || items.length === 0) return;
    const origin = el.getBoundingClientRect().left;
    let first = 0;
    let last = 0;
    items.forEach((item, i) => {
      const box = item.getBoundingClientRect();
      // An entry counts as in view when most of it is.
      const visible = Math.min(box.right, origin + el.clientWidth) - Math.max(box.left, origin);
      if (visible >= box.width * 0.6) {
        if (!first) first = i + 1;
        last = i + 1;
      }
    });
    setRange({ first: first || 1, last: last || 1 });
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, entries.length]);

  function page(direction: 1 | -1) {
    const el = scroller.current;
    const item = el?.querySelector<HTMLElement>("[data-entry]");
    if (!el || !item) return;
    const step = item.offsetWidth + 24;
    const inView = Math.max(1, Math.floor((el.clientWidth + 24) / step));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * step * inView, behavior: reduced ? "auto" : "smooth" });
  }

  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:text-muted-fg/50 disabled:hover:bg-transparent";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-meta text-muted-fg" aria-live="polite">
          Showing {range.first === range.last ? range.first : `${range.first} to ${range.last}`} of{" "}
          {entries.length}, newest first
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => page(-1)} disabled={!canPrev} aria-label="Show newer activity" className={arrow}>
            <Icon name="chevron_left" size={20} />
          </button>
          <button type="button" onClick={() => page(1)} disabled={!canNext} aria-label="Show older activity" className={arrow}>
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Activity timeline"
        className="overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [scroll-snap-type:x_mandatory]"
      >
        <ol className="flex w-full gap-6">
          {entries.map((entry, i) => {
            const findingKey = entry.findingId ?? entry.findingNumber ?? null;
            const linkable = onSelectFinding && findingKey;
            const decision = entry.kind === "decision";
            const [headline, ...rest] = entry.action.split(" · ");
            const detail = rest.join(" · ");
            const content = (
              <>
                <span className="block font-display text-h3 text-ink">{headline}</span>
                {(detail || entry.ref) && (
                  <span className="mt-1 block text-meta text-ink">
                    {detail}
                    {entry.ref && <span className="ml-1.5 text-label text-muted-fg">{entry.ref}</span>}
                  </span>
                )}
                <span className="mt-1.5 block text-meta text-muted-fg">{entry.actor}</span>
              </>
            );
            return (
              <li
                key={`${entry.at}-${i}`}
                data-entry
                className="relative min-w-0 shrink-0 basis-[82%] [scroll-snap-align:start] sm:basis-[calc((100%-1.5rem)/2)] lg:basis-[calc((100%-4.5rem)/4)]"
              >
                <time dateTime={entry.at} className="block h-5 text-meta tabular-nums text-muted-fg">
                  {format(new Date(entry.at), "d MMM yyyy · HH:mm")}
                  {decision && <span className="sr-only">. Decision by the advocate</span>}
                </time>
                {/* The connector runs from this marker to the next entry's. */}
                <div className="relative mt-2 flex h-3 items-center">
                  {i < entries.length - 1 && (
                    <span aria-hidden className="absolute left-3 right-[-1.5rem] top-1/2 h-px bg-line" />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "relative block rounded-full border",
                      decision ? "h-3 w-3 border-accent bg-accent" : "h-2.5 w-2.5 border-muted-fg bg-paper",
                    )}
                  />
                </div>
                <div className="mt-3 pr-2">
                  {linkable ? (
                    <button
                      type="button"
                      onClick={() => onSelectFinding(findingKey as string)}
                      className="-m-2 block w-[calc(100%+1rem)] rounded-control p-2 text-left transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
