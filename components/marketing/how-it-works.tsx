"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Icon } from "@/components/shared/icon";
import { Reveal } from "./reveal";

/**
 * How it works: the workflow video beside the four steps, on a pale
 * accent band. The steps hang off one rail, which fills as the visitor reads down
 * them. This is where the page explains itself, so the hero does not have to.
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
    body: "The settled document arrives with an execution checklist: stamp duty and registration, each confirmed by your advocate, and whether it can be signed electronically.",
  },
];

/** Where the workflow video goes. Nothing plays yet, so it is not a control. */
function VideoPlaceholder() {
  return (
    <div className="rounded-modal border border-line bg-paper p-2.5 sm:p-4">
      <div
        role="img"
        aria-label="Workflow video, coming soon"
        className="relative flex bg-night aspect-video items-center justify-center overflow-hidden rounded-card"
      >
        <span className="flex h-14 w-14 items-center sm:h-20 sm:w-20 justify-center rounded-full bg-paper text-ink">
          <Icon name="play_arrow" size={24} filled className="scale-150" />
        </span>
        <p className="absolute left-5 top-4 text-meta font-medium text-paper sm:left-7 sm:top-6">
          Workflow video
          <span aria-hidden className="mx-2">·</span>
          Coming soon
        </p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const reduced = useReducedMotion();
  const steps = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: steps, offset: ["start 75%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <section id="how" className="tile-grain w-full scroll-mt-16 bg-parchment text-ink">
      <div className="site-wrap py-24 md:py-32">
        {/* The same columns as the stage and steps below, so the lead starts
            on the steps' edge and sits on the headline's last baseline. */}
        <div className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:[align-items:last_baseline]">
          <h2 className="font-display text-display">How it works</h2>
          <p className="max-w-xl text-lead text-muted-fg">
            Four steps from a description of the deal to a document you can
            sign, with a named advocate accountable in the middle.
          </p>
        </div>

        <div className="mt-16 grid gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <Reveal className="lg:sticky lg:top-24">
            <VideoPlaceholder />
          </Reveal>

          <ol ref={steps} className="relative space-y-12">
            {/* The rail the steps hang off, and its fill. */}
            <span aria-hidden className="absolute bottom-0 left-5 top-0 w-px -translate-x-1/2 bg-ink/15" />
            <motion.span
              aria-hidden
              style={{ scaleY: reduced ? 1 : fill }}
              className="absolute bottom-0 left-5 top-0 w-0.5 origin-top -translate-x-1/2 bg-ink"
            />
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.n} delay={i * 0.06} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-body font-medium tabular-nums text-paper">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-display text-h2">{step.title}</h3>
                  <p className="mt-3 max-w-xl text-body text-muted-fg">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
