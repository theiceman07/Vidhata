import { Button } from "@/components/ui/button";
import { CONSULTATION, PRICING_IS_INDICATIVE } from "@/lib/config/pricing";

interface EscalationPromptProps {
  advocateName: string;
  onRequestConsultation?: () => void;
}

export function EscalationPrompt({
  advocateName,
  onRequestConsultation,
}: EscalationPromptProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-card border border-caution/30 bg-caution/10 p-4">
        <p className="mb-2 font-mono text-notation uppercase tracking-notation text-caution-fg">
          This needs legal judgment
        </p>
        <p className="text-body text-ink">
          That question asks what you should do, not what this document says.
          I can only explain the settled document. I can&apos;t advise on
          your situation.
        </p>
        <Button size="sm" className="mt-3" onClick={onRequestConsultation}>
          Request a consultation with {advocateName}
        </Button>
        <p className="mt-2 text-label text-muted-fg">
          {CONSULTATION.label} · {CONSULTATION.price}
          {PRICING_IS_INDICATIVE && " (indicative)"}
        </p>
      </div>
    </div>
  );
}
