"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { Dateline } from "@/components/document/dateline";
import { DURATION, EASE } from "@/lib/motion";
import { Highlight } from "./highlight";
import { getMockDocumentById } from "@/lib/mock/documents.mock";

/**
 * The living document.
 *
 * The four-stage arc every document travels, played out on real clause
 * text as the reader scrolls: as drafted, a concern raised, an advocate
 * revising the wording, settled.
 *
 * It is set the way the section's own headline says a finding should be:
 * the clause on the page, and the concern in the margin beside it, with
 * its source. The margin fills as the arc advances, so the width the
 * clause does not need is the width the review happens in.
 *
 * Scroll is read twice. A spring-smoothed copy of it fills the rail beside
 * the stage index continuously, so the reader always sees the scroll doing
 * something; the stage itself changes at four thresholds, and each change
 * is carried by a short fade or a highlighter wipe rather than a swap.
 *
 * Scroll picks the stage; the stage is plain state, so what renders at
 * each step is identical whether the reader scrolled there or, under
 * prefers-reduced-motion, chose it from the index. Reduced motion gets no
 * pinning and no scroll hijack: the index becomes four tabs.
 */

/** The advocate who signs off in the settled fixture. */
const ADVOCATE = getMockDocumentById("doc-nda-settled")?.advocate;

const STAGES = [
  { n: "01", label: "Document", caption: "As drafted" },
  { n: "02", label: "AI interpretation", caption: "Finding raised" },
  { n: "03", label: "Human review", caption: "Advocate revises" },
  { n: "04", label: "Trusted release", caption: "Settled" },
] as const;

// The MSA fixture's payment-terms finding, verbatim, with its cited source.
// Nothing on this page is
// drafted for the page: an unsourced concern in a marketing section would
// be exactly the "probably fine" the product refuses to produce.
const MSA = getMockDocumentById("doc-msa-pending");
const FINDING = MSA?.findings.find((f) => f.clauseReference === "Clause 4.1");
const CLAUSE_AT = MSA?.clauses.findIndex((c) => c.number === "4.1") ?? -1;
const CLAUSE = MSA?.clauses[CLAUSE_AT];
const CITATION = FINDING?.citation;
// The clauses either side, from the same contract, so the passage reads
// as a page of a document rather than a quotation on a card.
const BEFORE = CLAUSE_AT > 0 ? MSA?.clauses[CLAUSE_AT - 1] : undefined;
const AFTER = CLAUSE_AT >= 0 ? MSA?.clauses[CLAUSE_AT + 1] : undefined;

function Neighbour({
  clause,
  className,
}: {
  clause: { number: string; heading: string; body: string };
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("max-w-measure select-none opacity-75", className)}>
      <p className="font-display text-meta text-ink">
        <span className="mr-2 font-mono text-label text-ink">{clause.number}</span>
        {clause.heading}
      </p>
      <p className="mt-1 line-clamp-2 font-clause text-meta text-ink">{clause.body}</p>
    </div>
  );
}

/** A margin note arriving is a state change, so it is the one thing that moves. */
function Note({
  children,
  reduced,
}: {
  children: React.ReactNode;
  reduced: boolean;
}) {
  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: reduced ? 0 : DURATION.findingOpen, ease: EASE.standard }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The document at one stage of its arc: the clause on the left, the
 * margin on the right, a record line along the foot.
 */
function Sheet({ stage, reduced }: { stage: number; reduced: boolean }) {
  const flagged = stage >= 1;
  const revising = stage === 2;
  const settled = stage >= 3;

  if (!FINDING || !CLAUSE || !CITATION) return null;

  // New wording fades in over the old rather than replacing it in one frame.
  const swap = {
    initial: reduced ? false : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: reduced ? 0 : DURATION.settle, ease: EASE.standard },
  } as const;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-paper">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-2.5 sm:px-8">
        <Dateline segments={[MSA?.title ?? "Master services agreement", "Draft 1"]} />
        <span
          className={cn(
            "font-mono text-label transition-colors duration-300",
            settled ? "text-accent" : flagged ? "text-ink" : "text-muted-fg",
          )}
        >
          {STAGES[stage].caption}
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        {/* The clause, at a reading measure. */}
        <div className="px-5 py-8 sm:px-8 lg:py-10">
          {BEFORE && <Neighbour clause={BEFORE} className="mb-7 border-b border-line pb-7" />}

          <h3 className="flex items-baseline gap-3 font-display text-h2 text-ink">
            <span className="font-mono text-label text-muted-fg">{CLAUSE.number}</span>
            {CLAUSE.heading}
          </h3>
          <p className="mt-3 max-w-measure font-clause text-h3 font-normal leading-relaxed tracking-normal text-ink">
            The Service Provider shall invoice the Client monthly in arrears.
            Payment shall be made within{" "}
            {revising ? (
              // The advocate's edit, shown as a redline while it is a
              // proposal, and as clean text once it is settled.
              <motion.span key="revising" {...swap}>
                <del className="text-muted-fg decoration-flagged/60">sixty (60) days</del>{" "}
                <ins className="border-b border-accent bg-accent/[0.08] no-underline">
                  forty-five (45) days
                </ins>
              </motion.span>
            ) : settled ? (
              <motion.span key="settled" {...swap} className="border-b border-accent">
                forty-five (45) days
              </motion.span>
            ) : (
              // The highlighter is drawn across the words, left to right.
              <span
                className={cn(
                  "border-b bg-gradient-to-r from-caution/15 to-caution/15 bg-no-repeat transition-[background-size,border-color] duration-500 ease-out",
                  flagged
                    ? "border-caution bg-[length:100%_100%]"
                    : "border-transparent bg-[length:0%_100%]",
                )}
              >
                sixty (60) days
              </span>
            )}{" "}
            of receipt of a valid invoice.
          </p>

          {AFTER && <Neighbour clause={AFTER} className="mt-7 border-t border-line pt-7" />}
        </div>

        {/* The margin. */}
        <aside
          aria-label="Margin"
          className="space-y-5 border-t border-line bg-canvas px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-6 lg:py-10"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {!flagged && (
              <Note key="empty" reduced={reduced}>
                <p className="text-meta text-muted-fg">
                  No notes yet. The first pass is reading the clause.
                </p>
              </Note>
            )}

            {/* The concern, attached to its clause, with its source named
                at the same moment. Never behind a disclosure. */}
            {flagged && (
              <Note key="finding" reduced={reduced}>
                <div
                  className={cn(
                    "border-l-2 pl-3 transition-colors",
                    settled ? "border-verified" : "border-caution",
                  )}
                >
                  <p className="text-label text-muted-fg">
                    <span className="font-mono">Finding 02</span>
                    <span aria-hidden className="mx-1.5 text-muted-fg">·</span>
                    {settled ? "Settled" : "Open"}
                  </p>
                  <p className="mt-1 text-meta text-ink">{FINDING.description}</p>
                  <p className="mt-2 text-label text-muted-fg">
                    <span className="font-mono text-ink">{CITATION}</span>
                  </p>
                </div>
              </Note>
            )}

            {stage >= 2 && (
              <Note key="note" reduced={reduced}>
                <div className="border-l-2 border-accent pl-3">
                  <p className="text-label text-muted-fg">
                    Advocate note
                    <span aria-hidden className="mx-1.5 text-muted-fg">·</span>
                    {ADVOCATE?.name ?? "Advocate"}
                  </p>
                  <p className="mt-1 text-meta text-ink">{FINDING.remedySuggested}</p>
                </div>
              </Note>
            )}
          </AnimatePresence>
        </aside>
      </div>

      {/* The record line. Settled and attributable; the seal itself
          belongs to the sign-off section, where it is struck once. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-5 py-3 sm:px-8">
        <p className="text-label text-muted-fg">
          {settled ? (
            <>
              Signed off by{" "}
              <span className="font-display text-meta text-ink">
                {ADVOCATE?.name ?? "Advocate"}
              </span>
            </>
          ) : stage === 2 ? (
            "With the advocate"
          ) : flagged ? (
            "Awaiting an advocate"
          ) : (
            "First pass running"
          )}
        </p>
        <p
          className={cn(
            "font-mono text-label",
            settled ? "text-accent" : "text-muted-fg",
          )}
        >
          {settled ? "0 open findings" : flagged ? "1 open finding" : "Screening"}
        </p>
      </div>
    </div>
  );
}

/** Where the arc is. Under reduced motion, also how to move along it. */
function StageIndex({
  stage,
  onSelect,
  progress,
}: {
  stage: number;
  onSelect?: (index: number) => void;
  /** Scroll through the arc, 0 to 1. Given, the rail fills with it. */
  progress?: MotionValue<number>;
}) {
  return (
    <ol
      aria-label="Stages"
      className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1 lg:gap-0 lg:border-l lg:border-line"
    >
      {progress && (
        <motion.span
          aria-hidden
          style={{ scaleY: progress }}
          className="absolute -left-px bottom-0 top-0 hidden w-0.5 origin-top bg-ink lg:block"
        />
      )}
      {STAGES.map((s, i) => {
        const active = i === stage;
        const reached = i <= stage;
        const body = (
          <>
            <span className="block font-mono text-label text-muted-fg">{s.n}</span>
            <span
              className={cn(
                "block text-meta transition-colors duration-300",
                active ? "font-medium text-ink" : reached ? "text-ink" : "text-muted-fg",
              )}
            >
              {s.label}
            </span>
            <span className="block text-label text-muted-fg">{s.caption}</span>
          </>
        );
        const itemClass = cn(
          "block w-full border-l-2 py-2 pl-3 text-left transition-colors lg:-ml-px lg:py-3 lg:pl-5",
          active ? "border-ink" : "border-transparent",
          // On a wide screen the rail's own fill marks the place.
          progress && "lg:border-transparent",
        );

        return (
          <li key={s.n} aria-current={active ? "step" : undefined}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(itemClass, "hover:bg-parchment/60")}
              >
                {body}
              </button>
            ) : (
              <div className={itemClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Header() {
  return (
    <div className="grid gap-x-16 gap-y-6 lg:grid-cols-2 lg:items-end lg:[align-items:last_baseline]">
      <h2 className="font-display text-display text-ink">
        A finding is a <Highlight>note in the margin</Highlight> of a clause.
      </h2>
      <p className="max-w-xl text-lead text-muted-fg">
        Not a tile in a dashboard. Every concern the first pass raises
        stays attached to the words that caused it, carries the source it
        rests on, and is settled by a named advocate before anything
        reaches you.
      </p>
    </div>
  );
}

export function LivingDocument() {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // The rail follows the scroll through a spring, so a wheel notch arrives
  // as one eased movement instead of a step.
  const rail = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  // Each stage owns an equal share of the scroll. Only a change of stage
  // sets state, so scrolling within a stage costs nothing.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduced) return;
    const next = Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length)));
    setStage((prev) => (prev === next ? prev : next));
  });

  if (reduced) {
    return (
      <section
        id="arc"
        className="site-wrap scroll-mt-16 py-24 md:py-32"
      >
        <Header />
        <div className="mt-12 grid gap-x-12 gap-y-6 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
          <StageIndex stage={stage} onSelect={setStage} />
          <Sheet stage={stage} reduced />
        </div>
      </section>
    );
  }

  return (
    <section
      id="arc"
      className="site-wrap scroll-mt-16 py-24 md:py-32"
    >
      <Header />

      {/* Three screens of scroll drive four stages, then release: enough
          room that a stage is held, not flicked past. */}
      <div ref={ref} className="relative mt-16 h-[320svh]">
        <div className="sticky top-24 grid gap-x-12 gap-y-6 lg:top-[14vh] lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
          <StageIndex stage={stage} progress={rail} />
          <Sheet stage={stage} reduced={false} />
        </div>
      </div>
    </section>
  );
}
