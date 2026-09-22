import { cn } from "@/lib/utils";

// The Vidhata mark: a framed serif V in the engraved-plate manner, one
// weight, one colour, no variants by portal. Client and advocate are told
// apart by the identity beside the mark, never by a colour change.
//
// The V is drawn as a path rather than set as text, so the mark has the
// same optical weight on every screen and in the favicon (app/icon.svg,
// which reuses these exact coordinates) whether or not a web font has
// loaded. currentColor throughout, so the caller's token drives it.
//
// The seal struck at sign-off is components/document/seal.tsx and appears
// once per document; the two are deliberately separate so the sign-off
// moment keeps its weight.
export const MARK_FRAME = { x: 0.75, y: 0.75, size: 30.5, stroke: 1.5 };
export const MARK_V_PATH =
  "M6.5 7H13.5V8H12.3L17.1 20.4L22.6 8H20.6V7H25.8V8H24.4L16.7 25.2H15.5L8.4 8H6.5Z";

export function BrandMark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect
        x={MARK_FRAME.x}
        y={MARK_FRAME.y}
        width={MARK_FRAME.size}
        height={MARK_FRAME.size}
        stroke="currentColor"
        strokeWidth={MARK_FRAME.stroke}
      />
      <path d={MARK_V_PATH} fill="currentColor" />
    </svg>
  );
}

const SIZES = {
  sm: { icon: 20, text: "text-body" },
  md: { icon: 26, text: "text-h3" },
  lg: { icon: 30, text: "text-h2" },
} as const;

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  const { icon, text } = SIZES[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={icon} />
      <span className={cn("font-display font-medium leading-none", text)}>
        Vidhata
      </span>
    </span>
  );
}
