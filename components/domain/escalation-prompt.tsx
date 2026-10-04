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
      <div className="max-w-[80%] rounded-card border border-caution/30 bg-caution/10 p-4">
        <p className="mb-2 text-label font-medium text-caution-fg">
          This needs legal judgment
        </p>
        <p className="text-body text-ink">
          That question asks what you should do, not what this document says.
          I can only explain the settled document. I can&apos;t advise on
          your situation.
        </p>
        <Button asChild size="sm" className="mt-3">
          <Link href={href}>Request a consultation with {advocateName}</Link>
        </Button>
        <p className="mt-2 text-label text-muted-fg">
          {CONSULTATION.label} · {CONSULTATION.price} {PRICE_BASIS}
          {PRICING_IS_INDICATIVE && " (indicative)"}
        </p>
        <p className="mt-1 text-label text-muted-fg">
          A request is free. The fee is payable only if the advocate accepts, and it is
          separate from the platform&apos;s fixed document fee.
        </p>
      </div>
    </div>
  );
}
