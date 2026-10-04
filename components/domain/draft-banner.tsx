import { cn } from "@/lib/utils";

/**
 * Said plainly above a document that has not been signed off: what the
 * client holds is a draft for an advocate to settle, not a finished
 * contract.
 */
export function DraftBanner({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn("rounded-control bg-parchment px-4 py-3 text-meta text-ink", className)}
    >
      <span className="font-medium">Draft for advocate settlement.</span> Not final until
      signed off.
    </p>
  );
}
