"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

/**
 * A horizontal scroll area with an arrow at each edge, centred on its height.
 * Scrollbars are hidden across the product, so the arrows are what tells a
 * reader there is more to the side; each shows only while there is somewhere
 * to go in that direction.
 */
export function TimelineScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
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
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: reduced ? "auto" : "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper text-ink transition-colors hover:bg-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scroller}
        // A scrolling region the keyboard can reach, so it can be moved without a mouse.
        tabIndex={0}
        role="region"
        aria-label="Timeline"
        className="overflow-x-auto overscroll-x-contain pb-2 [scroll-snap-type:x_proximity]"
      >
        {children}
      </div>
      {canPrev && (
        <button
          type="button"
          onClick={() => page(-1)}
          aria-label="Show newer activity"
          className={cn(arrow, "left-0")}
        >
          <Icon name="chevron_left" size={20} />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => page(1)}
          aria-label="Show older activity"
          className={cn(arrow, "right-0")}
        >
          <Icon name="chevron_right" size={20} />
        </button>
      )}
    </div>
  );
}
