import { PIPELINE_LAYERS, type PipelineLayer } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LayerBadge({ layer }: { layer: PipelineLayer }) {
  const info = PIPELINE_LAYERS[layer];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-6 items-center rounded-control border border-line bg-paper px-2 text-small font-medium text-muted-fg">
            L{layer}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-56 text-small">
            <span className="font-medium">{info.name}</span>
            <br />
            {info.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
