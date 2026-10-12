"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

/**
 * Back means where you came from.
 *
 * A page reached from the documents list goes back to the list, not up
 * to whatever the URL happens to nest under. Only when there is nothing
 * to go back to (a link opened in a fresh tab) does it fall back to the
 * page's parent.
 */
export function BackButton({
  fallbackHref,
  label,
  className,
}: {
  fallbackHref: string;
  /** Read by assistive technology and shown as a tooltip. */
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);

  // Sits level with the first line of the page's title. Headers differ in what
  // comes above the h1 (a state label, the document's name, nothing), so the
  // offset is measured from the h1 beside it rather than assumed per page.
  useLayoutEffect(() => {
    const button = ref.current;
    const row = button?.parentElement;
    const heading = row?.querySelector("h1");
    if (!button || !heading) return;

    const align = () => {
      const lineHeight = parseFloat(getComputedStyle(heading).lineHeight);
      const line = Number.isFinite(lineHeight) ? lineHeight : heading.getBoundingClientRect().height;
      const current = parseFloat(button.style.marginTop) || 0;
      const naturalTop = button.getBoundingClientRect().top - current;
      const headingMid = heading.getBoundingClientRect().top + line / 2;
      const offset = Math.max(0, headingMid - naturalTop - button.offsetHeight / 2);
      button.style.marginTop = `${offset}px`;
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(heading);
    if (row) observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={fallbackHref}
      aria-label={label}
      title={label}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-parchment",
        className,
      )}
    >
      <Icon name="arrow_back" size={20} />
    </Link>
  );
}
