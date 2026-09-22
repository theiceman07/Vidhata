import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="mb-2 flex items-center gap-2 text-caution">
          <Scale className="h-4 w-4" aria-hidden />
          <p className="text-small font-medium">This needs legal judgment</p>
        </div>
        <p className="text-body text-ink">
          That question asks what you should do, not what this document says.
          I can only explain the settled document. I can&apos;t advise on
          your situation.
        </p>
        <Button size="sm" className="mt-3" onClick={onRequestConsultation}>
          Request a consultation with {advocateName}
        </Button>
      </div>
    </div>
  );
}
