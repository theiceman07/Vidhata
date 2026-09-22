"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { Dateline } from "@/components/document/dateline";
import { Seal } from "@/components/document/seal";

/**
 * The living document.
 *
 * The four-stage arc every document travels, played out on real clause
 * text as the reader scrolls: as drafted, a concern raised, an advocate
 * revising the wording, settled.
 *
 * This is the product thesis rather than decoration around it, which is
 * the only reason a moment this large earns its place. Nothing here is
 * atmosphere: every element is a thing the product actually does.
 *
 * Under prefers-reduced-motion the section renders as four static
 * stages, stacked and labelled, with no pinning and no scroll hijack.
 */

const STAGES = [
  { n: "01", label: "Document", caption: "As drafted" },
  { n: "02", label: "AI interpretation", caption: "Finding raised" },
  { n: "03", label: "Human review", caption: "Advocate note" },
  { n: "04", label: "Trusted release", caption: "Settled" },
] as const;

const FINDING =
  "The fifteen-day notice period may be shorter than the statutory minimum applicable to this class of tenancy. Confirm before release.";

const ADVOCATE_NOTE =
  "Notice period extended to thirty days. The revised wording is within the period this class of tenancy requires.";

/**
 * The document itself. `stage` drives what is shown, so the animated and
 * static paths render exactly the same thing at each step and cannot
 * drift apart.
 */
function DocumentCard({ stage }: { stage: number }) {
  const revised = stage >= 2;
  const settled = stage >= 3;

  return (
    <div className="bg-paper p-6 sm:p-10">
      <Dateline segments={["Clause 7.1"]} />
      <h3 className="mt-1 font-display text-h2 text-ink">Termination</h3>

      <p className="mt-4 font-display text-body leading-relaxed text-ink">
        Either party may terminate this agreement by giving{" "}
        {revised ? (
          <span className="border-b border-accent bg-accent/[0.08]">
            thirty days&rsquo;
          </span>
        ) : (
          <span
            className={cn(
              "transition-colors",
              stage >= 1 && "border-b border-caution bg-caution/[0.15]",
            )}
          >
            fifteen days&rsquo;
          </span>
        )}{" "}
        written notice to the other, without assigning any reason.
      </p>

      {/* Stage 02 · the concern, attached to its clause, with its source
          named at the same moment. */}
      {stage >= 1 && (
        <div
          className={cn(
            "mt-6 border-l-2 pl-4",
            settled ? "border-verified" : "border-caution",
          )}
        >
          <Dateline segments={["Finding 04", settled ? "Settled" : "Open"]} />
          <p className="mt-2 text-meta text-ink">{FINDING}</p>
          <Dateline
            segments={["Raised by AI first pass"]}
            className="mt-2"
          />
        </div>
      )}

      {/* Stage 03 · a human has touched this passage. */}
      {stage >= 2 && (
        <div className="mt-4 border-l-2 border-accent pl-4">
          <Dateline segments={["Advocate note", "R. Kapoor"]} />
          <p className="mt-2 text-meta text-ink">{ADVOCATE_NOTE}</p>
        </div>
      )}

      {/* Stage 04 · the seal, once, at the end. */}
      {settled && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div>
            <Dateline segments={["Advocate"]} />
            <p className="mt-1 font-display text-h3 text-ink">R. Kapoor</p>
            <Dateline
              segments={["Bar council no. D/1842/2016", "Empanelled"]}
              className="mt-1"
            />
          </div>
          <Seal className="h-16 w-16" />
        </div>
      )}
    </div>
  );
}

/** One stage of the arc as a static block. The reduced-motion path. */
function StaticStage({ index }: { index: number }) {
  const stage = STAGES[index];

  return (
    <div className="border-t border-line py-8">
      <Dateline segments={[stage.n, stage.label, stage.caption]} />
      <div className="mt-4">
        <DocumentCard stage={index} />
      </div>
    </div>
  );
}

/** Reveals each stage as its share of the scroll passes. */
function AnimatedStage({
  progress,
  index,
}: {
  progress: MotionValue<number>;
  index: number;
}) {
  const start = index / STAGES.length;
  const opacity = useTransform(
    progress,
    [start - 0.08, start, start + 0.18, start + 0.24],
    index === STAGES.length - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
  );

  return (
    <motion.div style={{ opacity }} className="absolute inset-x-0 top-0">
      <DocumentCard stage={index} />
    </motion.div>
  );
}

function StageIndexItem({
  stage,
  progress,
  start,
}: {
  stage: (typeof STAGES)[number];
  progress: MotionValue<number>;
  start: number;
}) {
  const opacity = useTransform(
    progress,
    [start - 0.1, start, start + 0.25, start + 0.3],
    [0.3, 1, 1, 0.3],
  );

  return (
    <motion.li style={{ opacity }}>
      <Dateline segments={[stage.n, stage.label]} />
    </motion.li>
  );
}

function Header() {
  return (
    <div className="max-w-2xl">
      <Dateline segments={["The arc every document travels"]} />
      <h2 className="mt-4 font-display text-h1 text-ink">
        A finding is a note in the margin of a clause.
      </h2>
      <p className="mt-4 text-body text-muted-fg">
        Not a tile in a dashboard. Every concern the first pass raises
        stays attached to the words that caused it, carries the source it
        rests on, and is settled by a named advocate before anything
        reaches you.
      </p>
    </div>
  );
}

export function LivingDocument() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Reduced motion: four static stages, in order, fully readable. The
  // arc is information, so it must survive the animation being removed.
  if (reduced) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-[clamp(72px,10vw,140px)]">
        <Header />
        <div className="mt-12">
          {STAGES.map((_, i) => (
            <StaticStage key={i} index={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-[clamp(72px,10vw,140px)]">
      <Header />

      {/* Two screens of scroll drive four stages, then release. */}
      <div ref={ref} className="relative mt-12 h-[240svh]">
        <div className="sticky top-[12vh]">
          <ol className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-line pb-4 sm:grid-cols-4">
            {STAGES.map((stage, i) => (
              <StageIndexItem
                key={stage.n}
                stage={stage}
                progress={scrollYProgress}
                start={i / STAGES.length}
              />
            ))}
          </ol>

          <div className="relative mt-6 min-h-[30rem]">
            {STAGES.map((_, i) => (
              <AnimatedStage key={i} progress={scrollYProgress} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
