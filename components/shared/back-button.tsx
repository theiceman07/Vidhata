"use client";

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

  return (
    <Link
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
