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

// Both findings on this document rest on the advocate's judgment, so it carries
// no statutory source to show. How a source appears, verified and blocked, is
// shown from another sample's findings and labelled as such. Nothing here is
// written for the page: a citation is shown only as the fixtures hold it.
const otherSample = getMockDocumentById("doc-msa-pending");
const verifiedExample = otherSample?.findings
  .flatMap((f) => f.citations)
  .find((c) => c.status === "verified" && c.corpusRef === "ica-1872-s27");
const blockedExample = otherSample?.findings
  .flatMap((f) => f.citations)
  .find((c) => c.status === "blocked" && c.id === "cite-3");

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

  return (
    <div>
      <SiteHeader />
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-24 md:pt-32">
          <p className="inline-flex rounded-full bg-parchment px-4 py-1.5 text-meta font-medium text-ink">
            Sample document
          </p>
          <h1 className="mt-6 max-w-4xl font-display text-display text-ink">{doc.title}</h1>
          <p className="mt-4 max-w-measure text-lead text-muted-fg">
            This is a settled document as a client receives it. The parties and the advocate are
            fictional, and nothing on this page can be changed.
          </p>
          <dl className="mt-8 grid max-w-4xl gap-x-10 gap-y-4 text-meta sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-label font-medium text-muted-fg">Parties</dt>
              <dd className="mt-1 text-ink">
                {doc.clientName} and {doc.counterpartyName}
              </dd>
            </div>
            <div>
              <dt className="text-label font-medium text-muted-fg">Status</dt>
              <dd className="mt-1">
                <StateLabel state={doc.status} />
              </dd>
            </div>
            <div>
              <dt className="text-label font-medium text-muted-fg">Draft</dt>
              <dd className="mt-1 text-ink">Draft {doc.version}</dd>
            </div>
            <div>
              <dt className="text-label font-medium text-muted-fg">Findings</dt>
              <dd className="mt-1 text-ink">
                {findings.length} raised · {settledCount} settled
              </dd>
            </div>
          </dl>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
            <h2 className="font-display text-h1 text-ink">The text, with its findings in the margin</h2>
            <p className="mt-3 max-w-measure text-body text-muted-fg">
              Each finding sits beside the clause it is about, with the source it rests on shown
              at once. A source is either verified against the approved corpus or blocked.
            </p>

            <div className="mt-10">
              {doc.clauses.map((clause) => {
                const notes = clause.findingIds
                  .map((id) => byId.get(id))
                  .filter((f): f is NonNullable<typeof f> => Boolean(f));
                return (
                  <article
                    key={clause.id}
                    className="grid gap-x-10 gap-y-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"
                  >
                    <div className="min-w-0">
                      <h3 className="flex items-baseline gap-3 font-display text-h3 text-ink">
                        <span className="font-mono text-label text-muted-fg">{clause.number}</span>
                        {clause.heading}
                      </h3>
                      <div className="mt-2 max-w-measure font-clause text-body leading-relaxed text-ink">
                        <Paragraphs text={clause.body} />
                      </div>
                    </div>

                    {notes.length > 0 && (
                      <div className="space-y-4 lg:pt-8">
                        {notes.map((finding) => (
                          <div key={finding.findingId} className="rounded-card bg-paper p-5">
                            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <span className="font-mono text-label text-muted-fg">
                                Finding {numbers[finding.findingId]}
                              </span>
                              <SeverityMark severity={finding.severity} />
                              <StateLabel state={findingState(finding)} />
                            </p>
                            <p className="mt-3 text-meta text-ink">{finding.description}</p>
                            <div className="mt-4">
                              <CitationBlock citations={finding.citations} showWithdrawalNote={false} />
                            </div>
                            <p className="mt-4 text-label text-muted-fg">
                              {dispositionText(finding.disposition)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {verifiedExample && blockedExample && (
          <section className="mx-auto w-full max-w-6xl px-6 pt-20 md:pt-24">
            <h2 className="font-display text-h1 text-ink">How a source is shown</h2>
            <p className="mt-3 max-w-measure text-body text-muted-fg">
              The findings above rest on the advocate&apos;s judgment, so they carry no statutory
              source. Where a finding does cite one, it is checked against the approved corpus by
              exact match, and shown as one or the other. These two come from a different sample
              document.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-card bg-parchment p-6">
                <CitationBlock citations={[verifiedExample]} showWithdrawalNote={false} />
              </div>
              <div className="rounded-card bg-parchment p-6">
                <CitationBlock citations={[blockedExample]} showWithdrawalNote={false} />
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-h1 text-ink">The sign-off</h2>
              {doc.advocate && doc.settledAt && (
                <dl className="mt-6 max-w-md space-y-3 text-body">
                  <div className="flex gap-6">
                    <dt className="w-32 shrink-0 text-meta text-muted-fg">Signed off by</dt>
                    <dd className="text-ink">{doc.advocate.name}, advocate</dd>
                  </div>
                  <div className="flex gap-6">
                    <dt className="w-32 shrink-0 text-meta text-muted-fg">Bar enrolment</dt>
                    <dd className="text-ink">{doc.advocate.bar}</dd>
                  </div>
                  <div className="flex gap-6">
                    <dt className="w-32 shrink-0 text-meta text-muted-fg">Date</dt>
                    <dd className="text-ink">{signedAt(doc.settledAt)}</dd>
                  </div>
                </dl>
              )}
              <p className="mt-6 max-w-measure text-meta text-muted-fg">
                Nothing reaches a client without a recorded advocate sign-off. The record beside this
                is kept with the document.
              </p>
            </div>
            <AuditTrail entries={clientAuditTrail(doc)} title="The record" />
          </div>
        </section>

        <section className="tile-grain w-full bg-parchment">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
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
