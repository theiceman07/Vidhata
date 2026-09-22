"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE, duration } from "@/lib/motion";
import { findingState } from "@/lib/findings";
import type { Finding, Severity } from "@/lib/types";

const SEVERITY_RULE: Record<Severity, string> = {
  high: "bg-flagged",
  medium: "bg-caution",
  low: "bg-info",
};

/**
 * The finding bar: a machine-raised concern, attached to its clause.
 *
 * This is the rule itself, and it owns the settle. When a finding
 * settles, verified ink wipes down over the severity colour rather than
 * the colour simply swapping — the reader should see the decision take
 * effect, not find that it already has.
 *
 * Under prefers-reduced-motion the wipe has zero duration, so the state
 * change still happens, at once.
 */
export function FindingRule({
  finding,
  className,
}: {
  finding: Finding;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const settled = findingState(finding) === "settled";

  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-y-0 left-0 w-0.5 overflow-hidden",
        SEVERITY_RULE[finding.severity],
        className,
      )}
    >
      <motion.span
        className="block h-full w-full origin-top bg-verified"
        initial={false}
        animate={{ scaleY: settled ? 1 : 0 }}
        transition={{
          duration: duration(DURATION.settle, reduced),
          ease: EASE.standard,
        }}
      />
    </span>
  );
}
