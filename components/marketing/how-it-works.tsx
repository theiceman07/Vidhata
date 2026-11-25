"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/shared/icon";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Reveal } from "./reveal";

/**
 * How it works: the explainer film beside the four steps, on the parchment band. The film
 * takes the wide column and stays in view (sticky) while the steps beside it are read; the
 * steps hang off one rail, which fills as the visitor reads down them. This is where the
 * page explains itself, so the hero does not have to.
 *
 * The film is five minutes with its captions burned in. It never autoplays: it waits on its
 * poster (its own first frame) and loads only its metadata until someone presses play.
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
    body: "An empanelled advocate takes on the document, settles each finding and signs off under their Bar enrolment. Nothing reaches you before that sign-off.",
  },
  {
    n: "4",
    title: "You execute it",
    body: "The settled document arrives with an execution checklist: stamp duty and registration, each confirmed by your advocate, and whether it can be signed electronically.",
  },
];

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

        <div className="mt-16 grid items-start gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <ExplainerFilm />

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

/**
 * The explainer film. At rest it is its own first frame with one quiet control, so it reads as
 * part of the page rather than a browser player dropped into it; the native controls appear only
 * once it plays. Nothing loads past the metadata until then, and it never autoplays.
 */
function ExplainerFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    setStarted(true);
    void video.current?.play();
  }

  return (
    <figure className="lg:sticky lg:top-24">
      <div className="relative overflow-hidden rounded-card bg-paper outline outline-1 -outline-offset-1 outline-black/10">
        <video
          ref={video}
          controls={started}
          playsInline
          preload="metadata"
          poster="/videos/how-it-works-poster.jpg"
          aria-label="Vidhataa explained: how a contract goes from a brief to a signed-off document"
          className="block aspect-video w-full"
          onPlay={() => setStarted(true)}
        >
          <source src="/videos/how-it-works.mp4" type="video/mp4" />
          <a href="/videos/how-it-works.mp4" className="link">
            Watch how Vidhataa works
          </a>
        </video>
        {!started && (
          <button
            type="button"
            onClick={play}
            className="group absolute inset-0 flex items-start justify-start p-4 focus-visible:outline-none md:p-6"
          >
            <span className="sr-only">Play the film, Vidhataa explained, 5 minutes</span>
            <span
              aria-hidden
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink pe-5 ps-4 text-body font-medium text-paper transition-[transform,background-color] duration-150 ease-out group-hover:bg-ink/85 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-active:scale-[0.96]"
            >
              <Icon name="play_arrow" size={20} filled />
              Watch the film
              <span className="tabular-nums text-paper/70">5 min</span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 text-meta text-muted-fg">
        Vidhataa, explained · from a brief to a signed-off document · captioned
      </figcaption>
    </figure>
  );
}
