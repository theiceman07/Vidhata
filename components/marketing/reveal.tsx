"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";

/**
 * A block that settles into place the first time it is scrolled into view.
 * Marketing only: inside the product nothing reveals on scroll. Reduced
 * motion renders it in place.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Seconds. Use small steps (0.06) to stagger a group. */
  delay?: number;
  as?: "div" | "li";
}) {
  const reduced = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;

  return (
    <Tag
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: reduced ? 0 : 0.4, ease: EASE.standard, delay: reduced ? 0 : delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}
