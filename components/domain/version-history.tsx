"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AddedByLabel } from "@/components/document/added-by-label";
import { ContextPanel } from "@/components/domain/document-context";
import { Icon, type IconName } from "@/components/shared/icon";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientVersionDiff,
  clientVersionList,
  defaultComparison,
  dispositionText,
  type ClientClauseRow,
  type ClientFindingRow,
  type ClientVersionDiff,
} from "@/lib/clientVersions";
import type { ContractDocument, DocumentVersion } from "@/lib/types";

/**
 * A document's drafts, and what changed between any two of them.
 *
 * It draws what lib/clientVersions decides and decides nothing itself: what
 * the client may see is settled there, in one place. Every change is said in
 * a word, with an icon beside it where there is one, so no change is told by
 * colour alone.
 */

const CLAUSE_CHANGE: Record<ClientClauseRow["kind"], { word: string; icon: IconName | null }> = {
  changed: { word: "Changed", icon: "edit" },
  added: { word: "Added", icon: "add" },
  removed: { word: "Removed", icon: "remove" },
  unchanged: { word: "Unchanged", icon: null },
};

const day = (iso: string) => format(new Date(iso), "d MMM yyyy");

export function VersionHistory({
  doc,
  versions,
}: {
  doc: ContractDocument;
  versions: DocumentVersion[];
}) {
  const rows = useMemo(() => clientVersionList(doc, versions), [doc, versions]);
  const initial = useMemo(() => defaultComparison(versions), [versions]);
  const [from, setFrom] = useState<number | null>(initial?.from ?? null);
  const [to, setTo] = useState<number | null>(initial?.to ?? null);

  const result = useMemo(
    () => (from !== null && to !== null ? clientVersionDiff(doc, versions, from, to) : null),
    [doc, versions, from, to],
  );

  if (rows.length === 0) {
    return (
      <p className="max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
        No drafts are recorded yet. A draft is recorded each time it is handed
        on, so the first appears once the first pass has finished.
      </p>
    );
  }

  return (
    <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <ContextPanel title="Drafts" className="self-start">
        <ol className="space-y-5">
          {rows.map((row) => (
            <li key={row.number}>
              <p className="text-body font-medium text-ink">{row.label}</p>
              <p className="mt-0.5 text-meta text-muted-fg">
                {row.madeBy} · {day(row.createdAt)}
              </p>
              <p className="mt-0.5 text-label tabular-nums text-muted-fg">
                {row.clauseCount} {row.clauseCount === 1 ? "clause" : "clauses"} ·{" "}
                {row.findingCount} {row.findingCount === 1 ? "finding" : "findings"}
              </p>
            </li>
          ))}
        </ol>
      </ContextPanel>

      <div className="min-w-0">
        {rows.length === 1 ? (
          <p className="max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
            No earlier drafts. This is the first draft, so there is nothing
            earlier to compare it with.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <DraftPicker
                id="compare-from"
                label="From"
                value={from}
                otherValue={to}
                rows={rows}
                onChange={setFrom}
              />
              <DraftPicker
                id="compare-to"
                label="To"
                value={to}
                otherValue={from}
                rows={rows}
                onChange={setTo}
              />
            </div>

            <div className="mt-8" aria-live="polite">
              {result?.ok ? (
                <DiffView diff={result.diff} />
              ) : (
                <p className="max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
                  {result?.reason === "same_draft"
                    ? "Choose two different drafts to compare."
                    : "Choose the two drafts to compare."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DraftPicker({
  id,
  label,
  value,
  otherValue,
  rows,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  otherValue: number | null;
  rows: { number: number; label: string }[];
  onChange: (n: number) => void;
}) {
  return (
    <div className="w-56">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value === null ? undefined : String(value)}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Choose a draft" />
        </SelectTrigger>
        <SelectContent>
          {rows.map((row) => (
            // The draft already chosen on the other side cannot be chosen
            // here, so a draft is never compared with itself.
            <SelectItem key={row.number} value={String(row.number)} disabled={row.number === otherValue}>
              {row.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ChangeWord({ kind }: { kind: ClientClauseRow["kind"] }) {
  const { word, icon } = CLAUSE_CHANGE[kind];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-0.5 text-label font-medium text-ink">
      {icon && <Icon name={icon} size={16} />}
      {word}
    </span>
  );
}

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

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function DiffView({ diff }: { diff: ClientVersionDiff }) {
  const shown = diff.clauses.filter((c) => c.kind !== "unchanged" || !diff.signedOff);
  const quiet = diff.clauses.filter((c) => c.kind === "unchanged" && diff.signedOff);
  const others = diff.otherClauses;
  const otherCount = others.added + others.removed + others.changed + others.unchanged;
  const { findingCounts: counts } = diff;

  return (
    <section aria-labelledby="diff-title" className="space-y-8">
      <div>
        <h2 id="diff-title" className="font-display text-h3 text-ink">
          {diff.fromLabel} to {diff.toLabel}
        </h2>
        <p className="mt-2 text-meta text-muted-fg">
          Findings: {counts.new} new · {counts.stillOpen} still open · {counts.resolved} settled or
          no longer raised
        </p>
        {!diff.signedOff && (
          <p className="mt-2 max-w-measure text-meta text-muted-fg">
            Until this document is signed off you see the wording of the clauses your advocate has
            asked you about. Every other clause is only counted.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-label font-medium text-muted-fg">Clauses</h3>
        <div className="mt-3 space-y-3">
          {shown.map((clause) => (
            <ClauseDiff key={clause.number} clause={clause} diff={diff} />
          ))}

          {shown.length === 0 && otherCount === 0 && (
            <p className="rounded-card bg-parchment p-5 text-meta text-ink">
              Neither draft has any clauses to compare.
            </p>
          )}
        </div>

        {quiet.length > 0 && (
          <p className="mt-4 max-w-measure text-meta text-muted-fg">
            <span className="font-medium text-ink">Unchanged:</span>{" "}
            {quiet.map((c) => `${c.number} ${c.heading}`).join(" · ")}
          </p>
        )}

        {otherCount > 0 && (
          <p className="mt-4 max-w-measure rounded-card bg-parchment p-5 text-meta text-ink">
            {[
              others.changed > 0 && `${plural(others.changed, "other clause", "other clauses")} changed`,
              others.added > 0 && `${plural(others.added, "clause", "clauses")} added`,
              others.removed > 0 && `${plural(others.removed, "clause", "clauses")} removed`,
              `${others.unchanged} unchanged`,
            ]
              .filter(Boolean)
              .join(", ")}
            . Their wording is not shown until the document is signed off.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-label font-medium text-muted-fg">Findings</h3>
        {diff.findingRows.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {diff.findingRows.map((finding) => (
              <FindingChange key={`${finding.number}-${finding.clauseReference}`} finding={finding} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 max-w-measure rounded-card bg-parchment p-5 text-meta text-ink">
            {diff.signedOff
              ? "Neither draft has any findings."
              : "No finding behind a request to you changed between these drafts."}
          </p>
        )}
      </div>
    </section>
  );
}

function ClauseDiff({ clause, diff }: { clause: ClientClauseRow; diff: ClientVersionDiff }) {
  return (
    <article className="rounded-card bg-parchment p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-label text-muted-fg">Clause {clause.number}</span>
        <h4 className="text-meta font-medium text-ink">{clause.heading}</h4>
        <ChangeWord kind={clause.kind} />
      </header>

      {clause.kind === "unchanged" ? (
        <div className="mt-3 max-w-measure font-clause text-body text-ink">
          <Paragraphs text={clause.after ?? ""} />
          <p className="mt-3 font-sans text-label text-muted-fg">The same in both drafts.</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <DraftText label={diff.fromLabel} text={clause.before} absent="Not in this draft" />
          <DraftText label={diff.toLabel} text={clause.after} absent="Not in this draft" />
        </div>
      )}
    </article>
  );
}

function DraftText({
  label,
  text,
  absent,
}: {
  label: string;
  text: string | null;
  absent: string;
}) {
  return (
    <div className="min-w-0 rounded-control bg-paper p-4">
      <p className="text-label font-medium text-muted-fg">{label}</p>
      {text === null ? (
        <p className="mt-2 text-meta text-muted-fg">{absent}</p>
      ) : (
        <div className="mt-2 font-clause text-body text-ink">
          <Paragraphs text={text} />
        </div>
      )}
    </div>
  );
}

function FindingChange({ finding }: { finding: ClientFindingRow }) {
  return (
    <li className="rounded-card bg-parchment p-5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-label text-muted-fg">
          Finding {finding.number} · {finding.clauseReference}
        </span>
        <span className="text-meta font-medium text-ink">{finding.change}</span>
        {finding.advocateAdded && <AddedByLabel />}
      </p>
      {finding.description && (
        <p className="mt-2 max-w-measure text-meta text-ink">{finding.description}</p>
      )}
      {finding.disposition && (
        <p className="mt-2 text-label text-muted-fg">{dispositionText(finding.disposition)}</p>
      )}
    </li>
  );
}
