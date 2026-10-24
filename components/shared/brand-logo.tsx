import { cn } from "@/lib/utils";

// The Vidhata wordmark: the name, set in Apfel Grotezk, and nothing else.
// No symbol, no frame, no lockup. One colour (currentColor), so the
// caller's token drives it on white and on ink alike.
//
// The seal struck at sign-off (components/document/seal.tsx) is a
// separate thing and appears once per document.

const SIZES = {
  sm: "text-h3",
  md: "text-h2",
  lg: "text-h2",
  xl: "text-h1",
} as const;

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      className={cn(
        "inline-block font-wordmark font-normal leading-none tracking-[-0.02em]",
        SIZES[size],
        className,
      )}
    >
      Vidhata
    </span>
  );
}
