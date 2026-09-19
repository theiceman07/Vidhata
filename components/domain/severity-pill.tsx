import { AlertTriangle, AlertCircle, Circle } from "lucide-react";
import type { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; className: string; Icon: typeof AlertTriangle }
> = {
  high: {
    label: "High",
    className: "bg-flagged/15 text-flagged",
    Icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    className: "bg-caution/15 text-caution",
    Icon: AlertCircle,
  },
  low: {
    label: "Low",
    className: "bg-info/15 text-info",
    Icon: Circle,
  },
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const { label, className, Icon } = SEVERITY_CONFIG[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-small font-medium",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
