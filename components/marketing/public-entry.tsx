import Link from "next/link";
import { backendDataEnabled } from "@/lib/api/source";
import { cn } from "@/lib/utils";
import { DealPrompt } from "./deal-prompt";

/**
 * The way in from the public site: the deal prompt, always (owner's call,
 * 10 Nov 2026). Describe the deal, sign in, and the brief is waiting.
 *
 * Where sign-in is closed (no preview workspace and no backend) the prompt
 * still shows, but it says so before anyone types, and the sample document
 * and the agreements stay one step away underneath, since they are then the
 * only things a visitor can actually open. Read at build time, by the same
 * rule the sign-in pages use.
 */
const SIGN_IN_OPEN =
  process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1" || backendDataEnabled();

const QUIET_LINK =
  "text-body text-muted-fg underline underline-offset-4 transition-colors hover:text-ink";

/** Briefs to start from, one for each agreement that can be drafted now. */
const EXAMPLES = [
  "Mutual NDA with a vendor in Pune",
  "MSA with a software client",
  "Supplier agreement, paid in 45 days",
] as const;

export function PublicEntry({ className }: { className?: string }) {
  if (SIGN_IN_OPEN) {
    return (
      <DealPrompt className={cn("max-w-3xl", className)} destination="/login" examples={EXAMPLES} />
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      <DealPrompt className="max-w-3xl" destination="/login" examples={EXAMPLES} />
      {/* Said outside the box, so it does not sit beside "Draft a document"
          contradicting it. */}
      <p className="text-meta text-muted-fg">Vidhata is in preview. Accounts aren&apos;t open yet.</p>
      <p className="-mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Link href="/sample" className={QUIET_LINK}>
          See a sample document
        </Link>
        <Link href="/contracts" className={QUIET_LINK}>
          The agreements Vidhata drafts
        </Link>
      </p>
    </div>
  );
}
