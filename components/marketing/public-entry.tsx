import Link from "next/link";
import { reviewedFrom } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import { DealPrompt } from "./deal-prompt";

/**
 * The way in from the public site: the deal prompt (owner's call, 10 Nov 2026). Accounts are
 * opened by invitation in the preview, so the prompt asks for access rather than promising a
 * draft (review, 25 Nov 2026): the brief is carried into /request-access and shown back there,
 * and survives a sign-in for anyone who already has an account.
 *
 * Under it, the price it starts at and the strongest thing a visitor can open now, the settled
 * sample.
 */
const QUIET_LINK =
  "text-body text-muted-fg underline underline-offset-4 transition-colors hover:text-ink";

/** Briefs to start from, one for each agreement that can be drafted now. */
const EXAMPLES = [
  "Mutual NDA with a vendor in Pune",
  "Supplier agreement, paid in 45 days",
] as const;

export function PublicEntry({ className }: { className?: string }) {
  const from = reviewedFrom();
  return (
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      <DealPrompt
        className="max-w-3xl"
        destination="/request-access"
        actionLabel="Request access"
        examples={EXAMPLES}
      />
      <p className="text-meta text-muted-fg">
        In preview, by invitation. Advocate-reviewed contracts from {from.price}.
      </p>
      <p className="-mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Link href="/sample" className={QUIET_LINK}>
          See a settled document
        </Link>
        <Link href="/pricing" className={QUIET_LINK}>
          Plans and pricing
        </Link>
      </p>
    </div>
  );
}
