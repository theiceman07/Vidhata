"use client";

import { GLOSSARY, type GlossTerm } from "@/lib/config/glossary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A term with its plain meaning on hover and on keyboard focus. The dotted
 * underline marks it as explainable and is not a link. The meaning is also
 * the element's accessible description, so it is not hover-only.
 */
export function Gloss({ term, children }: { term: GlossTerm; children?: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-dotted decoration-muted underline-offset-4 focus-visible:rounded-sm"
        >
          {children ?? term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{GLOSSARY[term]}</TooltipContent>
    </Tooltip>
  );
}
