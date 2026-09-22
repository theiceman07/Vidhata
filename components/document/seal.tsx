"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE, duration } from "@/lib/motion";

/**
 * The seal.
 *
 * A framed serif initial, engraved-plate style, borrowed from the stamp
 * at the bottom of a signed instrument — because that is the moment
 * Vidhata sells.
 *
 * It appears exactly once per document, at sign-off, and nowhere else
 * inside the product. That restraint is the whole of its weight: a mark
 * used on every screen would say nothing when it finally mattered.
 *
 * It draws itself once. Under prefers-reduced-motion it is simply
 * already drawn.
 */
export function Seal({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <svg
      viewBox="0 0 120 120"
      width="96"
      height="96"
      role="img"
      aria-label="Vidhata seal"
      className={cn("text-accent", className)}
    >
      <motion.circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: duration(DURATION.sealDraw, reduced),
          ease: EASE.standard,
        }}
        // Start the stroke at twelve o'clock, the way a stamp is struck.
        style={{ rotate: -90, transformOrigin: "60px 60px" }}
      />

      <motion.text
        x="60"
        y="66"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-display"
        fontSize="40"
        fontWeight="500"
        fill="currentColor"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: duration(DURATION.sealDraw / 2, reduced),
          delay: duration(DURATION.sealDraw * 0.7, reduced),
        }}
      >
        V
      </motion.text>

      <motion.text
        x="60"
        y="94"
        textAnchor="middle"
        className="font-mono uppercase"
        fontSize="8"
        letterSpacing="1.6"
        fill="currentColor"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: duration(DURATION.sealDraw / 2, reduced),
          delay: duration(DURATION.sealDraw * 0.85, reduced),
        }}
      >
        Settled
      </motion.text>
    </svg>
  );
}
