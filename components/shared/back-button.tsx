"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

/**
 * Back means where you came from, and it is the only way back in the product.
 *
 * A page reached from the documents list goes back to the list, not up
 * to whatever the URL happens to nest under. Only when there is nothing
 * to go back to (a link opened in a fresh tab) does it fall back to the
 * page's parent.
 *
 * The control always reads "Back". `label` names the place it falls back to,
 * for assistive technology ("Back to Billing"). PageHeader renders it on one
 * line above the title, so it does not sit at a different height on each page.
 */
export function BackButton({
  fallbackHref,
  label,
  className,
}: {
  fallbackHref: string;
  /** The parent place, for the accessible name. Omit it when "Back" says enough. */
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const place = label && label !== "Back" ? label : null;

  return (
    <Link
      href={fallbackHref}
      aria-label={place ? `Back to ${place}` : "Back"}
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className={cn(
        "-ml-2 inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full pl-2 pr-3 text-meta text-muted-fg transition-colors hover:bg-parchment hover:text-ink",
        className,
      )}
    >
      <Icon name="chevron_left" size={18} />
      Back
    </Link>
  );
}
