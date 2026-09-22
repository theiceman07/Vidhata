"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dateline } from "@/components/document/dateline";
import { StateLabel } from "@/components/document/state-label";
import { DURATION, EASE, duration } from "@/lib/motion";
import { getMockDocumentById } from "@/lib/mock/documents.mock";

/**
 * The hero.
 *
 * Left: the thought, set big. Right: the product doing the thing the
 * thought describes, on the real clause and the real citation that ship
 * in the fixtures. A visitor should understand inside one screen that
 * this is software for reviewing contracts, not a landing page about
 * reviewing contracts.
 *
 * The surface plays once, on load, and stops at the settled state. It is
 * not a loop: a decision that keeps un-deciding itself is theatre.
 */

// The MSA fixture's non-compete finding, verbatim. Nothing here is
// invented: the clause, the concern and the source all ship in lib/mock,
// and the citation is the one the pipeline actually verified.
const DOC = getMockDocumentById("doc-msa-pending");
const FINDING = DOC?.findings[0];
const CLAUSE = DOC?.clauses.find((c) => c.number === "7.2");
const CITATION = FINDING?.citations[0];

/** The advocate who signs off in the settled fixture. */
const ADVOCATE = getMockDocumentById("doc-nda-settled")?.advocate;

const STEP_DELAYS = [400, 1500, 2700, 3900];

export function Hero() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(STEP_DELAYS.length - 1);
      return;
    }
    const timers = STEP_DELAYS.map((delay, i) =>
      setTimeout(() => setStep(i), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  return (
    <section className="mx-auto grid max-w-[95rem] items-center gap-x-16 gap-y-16 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:px-10 lg:py-24">
      <div>
        <Dateline segments={["Vidhata", "New Delhi"]} />

        <h1 className="mt-6 font-display text-display text-ink">
          AI drafts.
          <br />
          {/* The one italic in the headline. It gives the sentence a
              cadence rather than a uniform weight, and it lands on the
              word that carries the promise. */}
          <em className="italic">Advocates</em> decide.
        </h1>

        <p className="mt-8 max-w-xl text-body text-ink">
          Contracts drafted in minutes, checked against Indian statute, and
          settled by a named advocate who stands behind the result.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-6">
          <Button asChild size="lg">
            <Link href="/new">Start a document</Link>
          </Button>
          <Link
            href="/pricing"
            className="text-body text-ink underline underline-offset-4 hover:text-accent"
          >
            What it costs
          </Link>
        </div>

        <p className="mt-16 max-w-xl border-l-2 border-line pl-4 text-meta text-muted-fg">
          A clean-looking draft still cannot tell you which clauses will
          survive contact with a court. Automation does the first pass. An
          advocate owns the final word.
        </p>
      </div>

      <ReviewSurface step={step} reduced={!!reduced} />
    </section>
  );
}

/** The product, working. Same marks and language as the workspace. */
function ReviewSurface({ step, reduced }: { step: number; reduced: boolean }) {
  if (!DOC || !CLAUSE || !FINDING || !CITATION) return null;

  const flagged = step >= 1;
  const revised = step >= 2;
  const settled = step >= 3;

  const transition = {
    duration: duration(DURATION.findingOpen, reduced),
    ease: EASE.standard,
  };

  return (
    <div
      aria-hidden
      className="border border-line bg-paper shadow-card lg:w-full lg:justify-self-end"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <Dateline segments={["Master services agreement", "Draft 03"]} />
        <StateLabel state={settled ? "settled" : "under_review"} />
      </div>

      <div className="px-5 py-6">
        <Dateline segments={[`Clause ${CLAUSE.number}`]} />
        <h2 className="mt-1 font-display text-h3 text-ink">{CLAUSE.heading}</h2>

        <p className="mt-3 font-display text-body leading-relaxed text-ink">
          {revised ? (
            <>
              The Service Provider shall not, for a period of{" "}
              <span className="border-b border-accent bg-accent/[0.08]">
                twelve (12) months following termination, solicit the
                Client&rsquo;s active customers
              </span>
              .
            </>
          ) : (
            <span
              className={cn(
                "transition-colors",
                flagged && "border-b border-caution bg-caution/[0.15]",
              )}
            >
              {FINDING.clauseText}
            </span>
          )}
        </p>

        {/* The concern, attached to its clause, with its source named at
            the same moment. Never behind a disclosure. */}
        {flagged && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className={cn(
              "mt-6 border-l-2 pl-4",
              settled ? "border-verified" : "border-caution",
            )}
          >
            <Dateline segments={["Finding 01", settled ? "Settled" : "Open"]} />
            <p className="mt-2 text-meta text-ink">{FINDING.description}</p>
            <Dateline
              segments={["Source", CITATION.text, "Citation verified"]}
              className="mt-3"
            />
          </motion.div>
        )}

        {/* A human has touched this passage. */}
        {revised && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="mt-4 border-l-2 border-accent pl-4"
          >
            <Dateline
              segments={["Advocate note", ADVOCATE?.name ?? "Advocate"]}
            />
            <p className="mt-2 text-meta text-ink">{FINDING.remedySuggested}</p>
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
        <Dateline segments={[settled ? "0 open findings" : "1 open finding"]} />
        {settled && ADVOCATE && (
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition}
            className="font-mono text-notation uppercase tracking-notation text-accent"
          >
            Signed off · {ADVOCATE.name}
          </motion.p>
        )}
      </div>
    </div>
  );
}
