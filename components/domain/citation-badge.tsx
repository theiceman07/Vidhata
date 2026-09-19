import { Check, X } from "lucide-react";
import type { Citation } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CitationBadge({ citation }: { citation: Citation }) {
  if (citation.status === "verified") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-verified/30 bg-verified/10 px-2.5 py-0.5 text-small font-medium text-verified",
              )}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Verified
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-64 text-small">{citation.text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <span
      role="alert"
      className="inline-flex items-center gap-1.5 rounded-full bg-flagged px-2.5 py-1 text-small font-semibold text-white shadow-card"
    >
      <X className="h-3.5 w-3.5" aria-hidden />
      Citation could not be verified and was blocked
    </span>
  );
}
