import type { Metadata } from "next";
import { AuditTrail } from "@/components/document/audit-trail";
import { CitationBlock } from "@/components/document/citation-block";
import { SeverityMark } from "@/components/document/severity";
import { StateLabel } from "@/components/document/state-label";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { clientAuditTrail } from "@/lib/audit";
import { dispositionText } from "@/lib/clientVersions";
import { clientVisibleFindings, findingNumbers, findingState } from "@/lib/findings";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import type { ExecutionStep } from "@/lib/types";

export const metadata: Metadata = {
  title: "Sample document",
  description:
    "A settled document as a client receives it: the text, each finding with its source, the advocate's sign-off and the execution checklist. Fictional parties, read-only.",
};

/**
 * A settled document, as the client receives it.
 *
 * Read from the settled NDA fixture through the same readers a client's own
 * screens use, so it shows what a client is shown: after sign-off the whole
 * text, every finding with the advocate's disposition and its source, the
 * sign-off record, and the execution checklist. It is public and read-only, so
 * it links to nothing that needs a sign-in. The parties and the advocate are
 * fictional.
 */
const doc = getMockDocumentById("doc-nda-settled");

const STEP_ORDER: ExecutionStep["kind"][] = ["stamping", "registration", "esignature"];
const STEP_TITLE: Record<ExecutionStep["kind"], string> = {
  stamping: "Stamp duty",
  registration: "Registration",
  esignature: "e-signature",
};

const signedAt = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className={i > 0 ? "mt-3" : undefined}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

function Step({ step, number }: { step: ExecutionStep; number: number }) {
  return (
    <li className="rounded-card bg-paper p-6">
      <p className="text-label font-medium text-muted-fg">
        {String(number).padStart(2, "0")} · {STEP_TITLE[step.kind]}
      </p>
      <p className="mt-2 font-display text-h3 text-ink">{step.headline}</p>
      <p className="mt-2 max-w-measure text-meta text-ink">
        {step.applicable ? step.detail : step.reason}
      </p>
      <p className="mt-3 text-label text-muted-fg">
        {!step.applicable ? "Not required" : step.complete ? "Complete" : "Not done"}
      </p>
    </li>
  );
}

export default function SamplePage() {
  if (!doc) return null;
  const findings = clientVisibleFindings(doc);
  const numbers = findingNumbers({ ...doc, findings });
  const byId = new Map(findings.map((f) => [f.findingId, f]));
  const steps = STEP_ORDER.map((kind) => doc.executionSteps.find((s) => s.kind === kind)).filter(
    (s): s is ExecutionStep => Boolean(s),
  );
  const settledCount = findings.filter((f) => findingState(f) === "settled").length;
  const record = clientAuditTrail(doc);

  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-10 pt-20 md:pt-24">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <p className="inline-flex rounded-full bg-parchment px-4 py-1.5 text-meta font-medium text-ink">
                Sample document
              </p>
              <h1 className="mt-6 font-display text-display text-ink">{doc.title}</h1>
              <p className="mt-4 max-w-measure text-lead text-muted-fg">
                This is a settled document as a client receives it. The parties and the advocate
                are fictional, and nothing on this page can be changed.
              </p>
            </div>
            <dl className="space-y-5 rounded-card bg-parchment p-6 text-body">
              <div>
                <dt className="text-meta font-medium text-muted-fg">Parties</dt>
                <dd className="mt-1 text-ink">
                  {doc.clientName} and {doc.counterpartyName}
                </dd>
              </div>
              <div>
                <dt className="text-meta font-medium text-muted-fg">Status</dt>
                <dd className="mt-1">
                  <StateLabel state={doc.status} />
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-meta font-medium text-muted-fg">Draft</dt>
                  <dd className="mt-1 text-ink">Draft {doc.version}</dd>
                </div>
                <div>
                  <dt className="text-meta font-medium text-muted-fg">Findings</dt>
                  <dd className="mt-1 text-ink">
                    {findings.length} raised · {settledCount} settled
                  </dd>
                </div>
              </div>
            </dl>
          </div>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
            <h2 className="font-display text-h1 text-ink">The text and its findings</h2>
            <p className="mt-3 max-w-measure text-body text-muted-fg">
              The settled text is on the left. A clause an advocate raised a finding on is ruled
              in green and carries its finding number; the findings stay in view on the right,
              each with the source it rests on.
            </p>

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
              <div className="min-w-0">
                {doc.clauses.map((clause) => {
                  const notes = clause.findingIds
                    .map((id) => byId.get(id))
                    .filter((f): f is NonNullable<typeof f> => Boolean(f));
                  return (
                    <article
                      key={clause.id}
                      id={`clause-${clause.id}`}
                      className={
                        notes.length > 0
                          ? "scroll-mt-32 border-l-2 border-accent pb-8 pl-5"
                          : "scroll-mt-32 border-l-2 border-transparent pb-8 pl-5"
                      }
                    >
                      <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-h3 text-ink">
                        <span className="font-mono text-label text-muted-fg">{clause.number}</span>
                        {clause.heading}
                        {notes.map((finding) => (
                          <a
                            key={finding.findingId}
                            href={`#finding-${finding.findingId}`}
                            className="rounded-full bg-paper px-2.5 py-0.5 font-sans text-label font-medium text-accent transition-colors hover:bg-accent hover:text-accent-fg"
                          >
                            Finding {numbers[finding.findingId]}
                          </a>
                        ))}
                      </h3>
                      <div className="mt-2 font-clause text-body leading-relaxed text-ink">
                        <Paragraphs text={clause.body} />
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="min-w-0 space-y-4 lg:sticky lg:top-28">
                <h3 className="text-meta font-medium text-muted-fg">
                  Findings · {findings.length}
                </h3>
                {findings.map((finding) => {
                  const clause = doc.clauses.find((c) => c.findingIds.includes(finding.findingId));
                  return (
                    <div
                      key={finding.findingId}
                      id={`finding-${finding.findingId}`}
                      className="scroll-mt-32 rounded-card bg-paper p-6"
                    >
                      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-mono text-label text-muted-fg">
                          Finding {numbers[finding.findingId]}
                        </span>
                        <SeverityMark severity={finding.severity} />
                        <StateLabel state={findingState(finding)} />
                      </p>
                      <p className="mt-3 text-body text-ink">{finding.description}</p>
                      <div className="mt-4">
                        <CitationBlock citation={finding.citation} />
                      </div>
                      <p className="mt-4 text-meta text-muted-fg">
                        {dispositionText(finding.disposition)}
                        {clause && (
                          <>
                            {" · "}
                            <a
                              href={`#clause-${clause.id}`}
                              className="text-ink underline underline-offset-2"
                            >
                              Clause {clause.number}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  );
                })}
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
          <h2 className="font-display text-h1 text-ink">The sign-off</h2>
          <p className="mt-3 max-w-measure text-body text-muted-fg">
            Nothing reaches a client without a recorded advocate sign-off. The record is kept with
            the document.
          </p>
          {doc.advocate && doc.settledAt && (
            <dl className="mt-8 grid gap-6 rounded-card bg-parchment p-8 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-meta font-medium text-muted-fg">Signed off by</dt>
                <dd className="mt-1 font-display text-h2 text-ink">{doc.advocate.name}, advocate</dd>
              </div>
              <div>
                <dt className="text-meta font-medium text-muted-fg">Bar enrolment</dt>
                <dd className="mt-1 font-display text-h2 text-ink">{doc.advocate.bar}</dd>
              </div>
              <div>
                <dt className="text-meta font-medium text-muted-fg">Date</dt>
                <dd className="mt-1 font-display text-h2 text-ink">{signedAt(doc.settledAt)}</dd>
              </div>
            </dl>
          )}
          <div className="mt-6 rounded-card bg-parchment p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
              <h3 className="text-meta font-medium text-muted-fg">The record</h3>
              <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-meta text-muted-fg">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-2 w-2 rounded-full border border-accent bg-accent" />
                  A decision by the advocate
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className="h-2 w-2 rounded-full border border-muted-fg bg-paper" />
                  An event
                </span>
              </p>
            </div>
            <div className="mt-6">
              <AuditTrail entries={record} title={null} large />
            </div>
          </div>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
            <h2 className="font-display text-h1 text-ink">The execution checklist</h2>
            <p className="mt-3 max-w-measure text-body text-muted-fg">
              What remains before a settled document takes effect. The entries below are a sample:
              on a real document the checklist states no stamp-duty figure, and your advocate
              confirms the amount for the state you sign in.
            </p>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, i) => (
                <Step key={step.kind} step={step} number={i + 1} />
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
