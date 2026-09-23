"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";

/**
 * How it works, told one step at a time as the visitor scrolls. This is
 * where the page explains itself, so the hero does not have to.
 */
const STEPS = [
  {
    n: "1",
    title: "Describe the deal",
    body: "The parties, the value, where it will be signed and the terms that matter. That is the whole brief.",
  },
  {
    n: "2",
    title: "The first pass drafts and screens it",
    body: "Clauses come from a curated corpus. A seven-layer screen then checks the draft against Indian statute and raises every concern as a finding, with its source.",
  },
  {
    n: "3",
    title: "An advocate decides",
    body: "An empanelled advocate claims the document, settles each finding and signs off under their Bar enrolment. Nothing reaches you before that sign-off.",
  },
  {
    n: "4",
    title: "You execute it",
    body: "The settled document arrives with an execution checklist: stamp duty for your state, whether it must be registered, and whether it can be signed electronically.",
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section id="how" className="tile-grain w-full scroll-mt-20 bg-parchment">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="max-w-2xl">
        <h2 className="font-display text-display text-ink">How it works</h2>
        <p className="mt-6 text-lead text-muted-fg">
          Four steps from a description of the deal to a document you can
          sign, with a named advocate accountable in the middle.
        </p>
      </div>

      <ol className="mt-16 grid gap-5 md:grid-cols-2">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.n}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduced ? 0 : DURATION.findingOpen * 2,
              ease: EASE.standard,
              delay: reduced ? 0 : (i % 2) * 0.08,
            }}
            className="flex flex-col rounded-card bg-paper p-8 md:p-10"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-body font-medium tabular-nums text-paper">
              {step.n}
            </span>
            <h3 className="mt-8 font-display text-h2 text-ink">{step.title}</h3>
            <p className="mt-3 text-body text-muted-fg">{step.body}</p>
          </motion.li>
        ))}
      </ol>
      </div>
    </section>
  );
}
