import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DealPrompt } from "./deal-prompt";

/**
 * The way in from the public site.
 *
 * With the preview workspace on, it is the deal prompt: describe the deal,
 * sign in, and the brief is waiting. With it off (the public site) there is no
 * sign-in to send anyone to, so the main button shows a sample document, the
 * best demonstration the site has, and a quieter link goes to the agreements
 * Vidhata drafts. Read at build time, the way the sign-in pages read it.
 */
const PREVIEW_MODE = process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1";

export function PublicEntry({ className }: { className?: string }) {
  if (PREVIEW_MODE) return <DealPrompt className={className} destination="/login" />;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <Button asChild size="lg">
        <Link href="/sample">See a sample document</Link>
      </Button>
      <Link
        href="/contracts"
        className="text-body text-muted-fg underline underline-offset-4 transition-colors hover:text-ink"
      >
        The agreements Vidhata drafts
      </Link>
    </div>
  );
}
