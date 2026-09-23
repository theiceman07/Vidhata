import { cn } from "@/lib/utils";

const NAME = "Vidhata";

/**
 * The wait, told as the product.
 *
 * The wordmark is drafted a letter at a time in muted ink, each letter
 * settles into full ink, and a rule is struck beneath the name: AI
 * drafts, an advocate decides. The motion is CSS (globals.css, loader-*),
 * so it runs from the server HTML before any script arrives, and under
 * reduced motion it is simply the name with its rule.
 */
export function BrandLoader({
  className,
  fullScreen = true,
}: {
  className?: string;
  /** Fill the viewport, for a portal that has not yet resolved who you are. */
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center bg-paper",
        fullScreen && "min-h-screen",
        className,
      )}
    >
      <span className="sr-only">Loading</span>
      <div aria-hidden className="flex flex-col items-center">
        <span className="font-wordmark text-[44px] leading-none tracking-[-0.02em] text-ink sm:text-[56px]">
          {NAME.split("").map((letter, i) => (
            <span
              key={i}
              className="loader-letter"
              style={{ "--i": i } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className="loader-rule mt-3 block h-[2px] w-full rounded-full bg-accent" />
        <span className="mt-4 text-label text-muted-fg">AI drafts. Advocates decide.</span>
      </div>
    </div>
  );
}
