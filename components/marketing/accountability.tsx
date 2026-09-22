"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Dateline } from "@/components/document/dateline";
import { Seal } from "@/components/document/seal";
import { Icon } from "@/components/shared/icon";
import { DURATION, EASE, duration } from "@/lib/motion";
import { openFindingCount } from "@/lib/findings";
import { getMockDocumentById } from "@/lib/mock/documents.mock";

/**
 * The claim the whole product rests on, shown as a record.
 *
 * This is the page's one authoritative moment, so it is the only place
 * the seal is struck. Every line below is read off the settled fixture:
 * if the record changes, the page changes with it, and nothing here can
 * drift into a claim the product does not make.
 */
const DOC = getMockDocumentById("doc-nda-settled");

export function Accountability() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  if (!DOC || !DOC.advocate) return null;

  const open = openFindingCount(DOC);
  const settledFindings = DOC.findings.length - open;
  const citations = DOC.findings.flatMap((f) => f.citations).length;
  const steps = DOC.executionSteps.filter((s) => s.applicable);
  const stepsDone = steps.filter((s) => s.complete).length;

  const record = [
    "First pass completed",
    citations > 0
      ? `${citations} ${citations === 1 ? "citation" : "citations"} verified against source`
      : "Every citation verified against source",
    settledFindings > 0
      ? `${settledFindings} ${settledFindings === 1 ? "finding" : "findings"} settled`
      : "No findings left open",
    `${stepsDone} of ${steps.length} execution steps complete`,
  ];

  return (
    <section
      id="advocates"
      className="mx-auto max-w-[95rem] px-6 py-[clamp(72px,10vw,140px)] lg:px-10"
    >
      <div className="grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center">
        <div>
          <Dateline segments={["Accountability"]} />
          <h2 className="mt-4 max-w-xl font-display text-h1 text-ink">
            A named advocate stands behind the result.
          </h2>
          <p className="mt-6 max-w-lg text-body text-ink">
            Not a disclaimer, and not a panel of reviewers in the abstract. One
            empanelled advocate adjudicates every finding on your document and
            signs it. Their name and Bar enrolment number stay on the record.
          </p>
          <p className="mt-4 max-w-lg text-meta text-muted-fg">
            No document reaches you without that sign-off. A finding whose
            source could not be verified blocks it outright.
          </p>
        </div>

        {/* The record itself. */}
        <div ref={ref} className="border border-line bg-paper">
          <div className="border-b border-line px-6 py-4">
            <Dateline segments={["Document settled"]} />
            <p className="mt-1 font-display text-h2 text-ink">{DOC.title}</p>
          </div>

          <ul className="space-y-3 px-6 py-6">
            {record.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <Icon name="check" size={18} className="mt-0.5 text-verified" />
                <span className="text-meta text-ink">{line}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line px-6 py-6">
            <div>
              <Dateline segments={["Advocate"]} />
              <p className="mt-1 font-display text-h3 text-ink">
                {DOC.advocate.name}
              </p>
              <p className="mt-1 font-mono text-notation uppercase tracking-notation text-muted-fg">
                Bar {DOC.advocate.bar}
                {DOC.settledAt && (
                  <>
                    <span className="mx-2 text-line">·</span>
                    Signed off {format(new Date(DOC.settledAt), "d MMM yyyy")}
                  </>
                )}
              </p>
            </div>

            {/* The seal draws itself once, when the record comes into
                view, and appears nowhere else on the page. */}
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : undefined}
              transition={{
                duration: duration(DURATION.findingOpen, !!reduced),
                ease: EASE.standard,
              }}
            >
              {inView && <Seal className="h-20 w-20" />}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
