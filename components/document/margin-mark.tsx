import { cn } from "@/lib/utils";

/**
 * A mark in the gutter.
 *
 * "machine" — the first pass raised a concern against this passage.
 * "human"   — an advocate has touched it.
 *
 * The distinction is the whole product, so it is worth six pixels of ink
 * in the margin. It is aria-hidden on purpose: the mark is a wayfinding
 * cue for the eye scanning down a page, and the meaning is always stated
 * in words beside it. Nothing here is the only carrier of information.
 */
export function MarginMark({
  kind,
  className,
}: {
  kind: "machine" | "human";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 6 8"
      width="6"
      height="8"
      aria-hidden
      focusable="false"
      className={cn(
        "shrink-0",
        kind === "human" ? "text-accent" : "text-caution",
        className,
      )}
    >
      <path d="M0 0 L6 4 L0 8 Z" fill="currentColor" />
    </svg>
  );
}
