import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONSULTATION, PRICE_BASIS, PRICING_IS_INDICATIVE } from "@/lib/config/pricing";

interface EscalationPromptProps {
  advocateName: string;
  /** The consultation page for this document. */
  href: string;
}

export function EscalationPrompt({ advocateName, href }: EscalationPromptProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-card border border-progress/30 bg-progress-tint p-4 sm:max-w-[80%]">
        <p className="mb-2 text-label font-medium text-progress">
          This needs legal judgment
        </p>
        <p className="text-body text-ink">
          That question asks what you should do, not what this document says.
          I can only explain the settled document. I can&apos;t advise on
          your situation.
        </p>
        {/* The button's label is long and its base style does not wrap: on a phone it must wrap inside the card, and be tall enough to tap. */}
        <Button asChild size="sm" className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2 text-center sm:w-auto">
          <Link href={href}>Request a consultation with {advocateName}</Link>
        </Button>
        <p className="mt-2 text-meta text-muted-fg">
          {CONSULTATION.label} · {CONSULTATION.price} {PRICE_BASIS}
          {PRICING_IS_INDICATIVE && " (indicative)"}
        </p>
        <p className="mt-1 text-meta text-muted-fg">
          A request is free. The fee is payable only if the advocate accepts, and it is
          separate from the platform&apos;s fixed document fee.
        </p>
      </div>
    </div>
  );
}
