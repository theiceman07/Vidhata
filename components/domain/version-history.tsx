"use client";

import { useEffect, useMemo, useState } from "react";
import { AddedByLabel } from "@/components/document/added-by-label";
import { ErrorState } from "@/components/shared/error-state";
import { Icon, type IconName } from "@/components/shared/icon";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClientDiff } from "@/lib/api/client/versions";
import {
  defaultComparison,
  dispositionText,
  findingFigures,
  type ClientVersionDiffResult,
} from "@/lib/clientVersions";
import { cn } from "@/lib/utils";
import { wordDiff, type WordPart } from "@/lib/wordDiff";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type {
  ClientClauseRow,
  ClientFindingRow,
  ClientDiff,
  ClientVersionList,
} from "@/lib/types";

/**
 * A document's drafts, and what changed between any two of them.
 *
 * It draws what the API hands over and decides nothing itself: the list of
 * drafts is counts, and each comparison is asked for when it is chosen, already
 * limited to what the client may read. The drafts themselves never reach this
 * component. Every change is said in a word, with an icon beside it where there
 * is one, so no change is told by colour alone.
 */

const CLAUSE_CHANGE: Record<
  ClientClauseRow["kind"],
  { word: string; icon: IconName | null }
> = {
  changed: { word: "Changed", icon: "edit" },
  added: { word: "Added", icon: "add" },
  removed: { word: "Removed", icon: "remove" },
  unchanged: { word: "Unchanged", icon: null },
};

type DiffLoad =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "loaded"; result: ClientVersionDiffResult };

export function VersionHistory({
  documentId,
  rows,
  header,
}: {
  documentId: string;
  rows: ClientVersionList;
  /** Draws the page's header. */
  header: () => React.ReactNode;
}) {
  // The latest two drafts, or nothing when there is nothing earlier to compare.
  const initial = useMemo(() => defaultComparison(rows), [rows]);
  const [from, setFrom] = useState<number | null>(initial?.from ?? null);
  const [to, setTo] = useState<number | null>(initial?.to ?? null);
  const [load, setLoad] = useState<DiffLoad>({ phase: "idle" });
  const [attempt, setAttempt] = useState(0);

  // Each comparison is asked for when it is chosen. A reply to a comparison that
  // is no longer the one chosen is dropped, so a slow answer cannot replace a
  // newer one.
  useEffect(() => {
    if (from === null || to === null || from === to) {
      setLoad({ phase: "idle" });
      return;
    }
    let current = true;
    setLoad({ phase: "loading" });
    getClientDiff(MOCK_CLIENT_ORG.id, documentId, from, to)
      .then((result) => {
        if (!current) return;
        if (!result) throw new Error("Document not found.");
        setLoad({ phase: "loaded", result });
      })
      .catch((err) => {
        if (!current) return;
        setLoad({
          phase: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not load this comparison.",
        });
      });
    return () => {
      current = false;
    };
  }, [documentId, from, to, attempt]);

  const picker = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-3 rounded-card bg-surface p-4">
      <DraftPicker id="compare-from" label="From" value={from} otherValue={to} rows={rows} onChange={setFrom} />
      <span aria-hidden className="flex h-10 items-center text-muted-fg">
        <Icon name="arrow_forward" size={20} />
      </span>
      <DraftPicker id="compare-to" label="To" value={to} otherValue={from} rows={rows} onChange={setTo} />
    </div>
  );

  if (rows.length === 0) {
    return (
      <>
        {header()}
        <p className="max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
          No drafts are recorded yet. A draft is recorded each time it is handed
          on, so the first appears once the first pass has finished.
        </p>
      </>
    );
  }

  return (
    <>
      {header()}
      <div className="min-w-0">
        {rows.length === 1 ? (
          <p className="max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
            No earlier drafts. This is the first draft, so there is nothing
            earlier to compare it with.
          </p>
        ) : (
          <>
            <div className="mt-4" aria-live="polite">
              {!(load.phase === "loaded" && load.result.ok) && (
                <div className="mb-4 max-w-md">{picker}</div>
              )}
              {load.phase === "loading" ? (
                <div className="space-y-4" aria-busy="true">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-40 w-full rounded-card" />
                  <Skeleton className="h-24 w-full rounded-card" />
                </div>
              ) : load.phase === "error" ? (
                <ErrorState
                  message={load.message}
                  onRetry={() => setAttempt((n) => n + 1)}
                />
              ) : load.phase === "loaded" && load.result.ok ? (
                <DiffView diff={load.result.diff} picker={picker} />
              ) : (
                <p className="max-w-2xl rounded-card bg-parchment p-6 text-body text-ink">
                  {load.phase === "loaded" &&
                  !load.result.ok &&
                  load.result.reason === "same_draft"
                    ? "Choose two different drafts to compare."
                    : "Choose the two drafts to compare."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
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
    <div className="min-w-0">
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
            <SelectItem
              key={row.number}
              value={String(row.number)}
              disabled={row.number === otherValue}
            >
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

function DiffView({ diff, picker }: { diff: ClientDiff; picker: React.ReactNode }) {
  const shown = diff.clauses.filter(
    (c) => c.kind !== "unchanged" || !diff.signedOff,
  );
  const quiet = diff.clauses.filter(
    (c) => c.kind === "unchanged" && diff.signedOff,
  );
  const others = diff.otherClauses;
  const otherCount =
    others.added + others.removed + others.changed + others.unchanged;
  const total = diff.clauses.length + otherCount;
  const changed =
    diff.clauses.filter((c) => c.kind !== "unchanged").length +
    others.added +
    others.removed +
    others.changed;
  const stats: { label: string; value: number }[] = [
    { label: "Clauses compared", value: total },
    { label: "Changed", value: changed },
    ...findingFigures(diff).map((f) => ({
      label: `Findings: ${f.label.toLowerCase()}`,
      value: Number(f.value),
    })),
  ];

  return (
    <section aria-labelledby="diff-title" className="space-y-4">
      <h2 id="diff-title" className="sr-only">
        {diff.fromLabel} to {diff.toLabel}
      </h2>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {picker}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col justify-between gap-3 rounded-card bg-surface p-4">
              <dd
                className={cn(
                  "font-display text-h1 leading-none tabular-nums",
                  stat.value === 0 ? "text-muted-fg" : "text-ink",
                )}
              >
                {stat.value}
              </dd>
              <dt className="text-label leading-4 text-muted-fg">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <p className="max-w-3xl text-label leading-5 text-muted-fg">
        {otherCount > 0 && (
          <>
            <span className="font-medium text-ink">
              {[
                others.changed > 0 &&
                  `${plural(others.changed, "other clause", "other clauses")} changed`,
                others.added > 0 &&
                  `${plural(others.added, "clause", "clauses")} added`,
                others.removed > 0 &&
                  `${plural(others.removed, "clause", "clauses")} removed`,
                `${others.unchanged} unchanged`,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
            {diff.signedOff
              ? ". Their wording is not shown. "
              : ". Until this document is signed off you see the wording only of the clauses your advocate has asked you about. "}
          </>
        )}
        {otherCount === 0 &&
          !diff.signedOff &&
          "Until this document is signed off you see the wording only of the clauses your advocate has asked you about. Every other clause is only counted. "}
        New means first raised in the later draft; it may already be decided.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <h3 className="flex items-baseline gap-2 font-display text-h3 text-ink">
            Clauses
            <span className="font-sans text-meta text-muted-fg">{shown.length}</span>
          </h3>
          <div className="mt-3 space-y-3">
            {/* What changed first, then what did not. */}
            {[...shown]
              .sort(
                (a, b) =>
                  Number(a.kind === "unchanged") -
                  Number(b.kind === "unchanged"),
              )
              .map((clause) => (
                <ClauseDiff key={clause.number} clause={clause} diff={diff} />
              ))}

            {shown.length === 0 && otherCount === 0 && (
              <p className="rounded-card bg-surface p-5 text-meta text-ink">
                Neither draft has any clauses to compare.
              </p>
            )}
          </div>

          {quiet.length > 0 && <UnchangedList clauses={quiet} />}
        </div>

        <div className="min-w-0">
          <h3 className="flex items-baseline gap-2 font-display text-h3 text-ink">
            Findings
            <span className="font-sans text-meta text-muted-fg">{diff.findingRows.length}</span>
          </h3>
          {diff.findingRows.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {diff.findingRows.map((finding) => (
                <FindingChange
                  key={`${finding.number}-${finding.clauseReference}`}
                  finding={finding}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-card bg-surface p-5 text-meta text-ink">
              {diff.signedOff
                ? "Neither draft has any findings."
                : "No finding behind a request to you changed between these drafts."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** The clauses that did not change, counted, with their names one press away. */
function UnchangedList({ clauses }: { clauses: ClientClauseRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 text-meta text-muted-fg">
      <p className="flex flex-wrap items-center gap-x-3">
        <span className="font-medium text-ink">
          {plural(clauses.length, "unchanged clause", "unchanged clauses")}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="unchanged-clauses"
          className="link inline-flex min-h-6 items-center rounded-control text-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {open ? "Hide" : "Show"}
        </button>
      </p>
      {open && (
        <ul
          id="unchanged-clauses"
          className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2"
        >
          {clauses.map((c) => (
            <li key={c.number}>
              <span className="font-mono">{c.number}</span> {c.heading}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClauseDiff({
  clause,
  diff,
}: {
  clause: ClientClauseRow;
  diff: ClientDiff;
}) {
  const quiet = clause.kind === "unchanged";
  // Both sides are in full; only the words that differ are marked, so the clause keeps its context.
  const words =
    clause.kind === "changed" && clause.before !== null && clause.after !== null
      ? wordDiff(clause.before, clause.after)
      : undefined;

  return (
    // A changed clause is a full parchment sheet; an unchanged one is set back,
    // half the tint and its wording muted, so what moved reads first.
    <article
      className={cn(
        "rounded-card",
        quiet ? "bg-surface/60 p-4" : "bg-surface p-5",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h4 className="font-display text-h3 text-ink">{clause.heading}</h4>
        <span className="text-label tabular-nums text-muted-fg">Clause {clause.number}</span>
        <span className="ml-auto">
          <ChangeWord kind={clause.kind} />
        </span>
      </header>

      {clause.kind === "unchanged" ? (
        <div className="mt-2 max-w-3xl font-clause text-meta leading-6 text-muted-fg">
          <Paragraphs text={clause.after ?? ""} />
        </div>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <DraftText
            label={diff.fromLabel}
            text={clause.before}
            absent="Not in this draft"
            parts={words?.before}
          />
          <DraftText
            label={diff.toLabel}
            text={clause.after}
            absent="Not in this draft"
            parts={words?.after}
          />
        </div>
      )}
    </article>
  );
}

function DraftText({
  label,
  text,
  absent,
  parts,
}: {
  label: string;
  text: string | null;
  absent: string;
  /** The text split into words, with the ones that differ marked. */
  parts?: WordPart[];
}) {
  return (
    <div className="min-w-0 rounded-control bg-paper p-4">
      <p className="text-label font-medium text-muted-fg">{label}</p>
      {text === null ? (
        <p className="mt-2 text-meta text-muted-fg">{absent}</p>
      ) : (
        <div className="mt-2 font-clause text-body text-ink">
          {parts ? <MarkedText parts={parts} /> : <Paragraphs text={text} />}
        </div>
      )}
    </div>
  );
}

/** Words that differ are marked by more than colour: struck through when lost, ruled beneath when gained. */
function MarkedText({ parts }: { parts: WordPart[] }) {
  return (
    <p className="whitespace-pre-line">
      {parts.map((part, i) =>
        part.kind === "removed" ? (
          <del key={i} className="rounded-sm bg-blocked-tint line-through">
            {part.text}
          </del>
        ) : part.kind === "added" ? (
          <ins
            key={i}
            className="rounded-sm border-b-2 border-brand bg-brand-tint no-underline"
          >
            {part.text}
          </ins>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

const DISPOSITION_MEANING: Record<string, string> = {
  confirmed: "The advocate confirmed the concern was real.",
  overridden: "The advocate decided the concern did not apply.",
};

function FindingChange({ finding }: { finding: ClientFindingRow }) {
  return (
    <li className="rounded-card bg-surface p-4">
      <p className="text-body font-medium text-ink">
        Finding {finding.number}
        <span className="text-meta font-normal text-muted-fg">
          {" "}
          · {finding.clauseReference}
        </span>
      </p>
      {finding.description && (
        <p className="mt-1.5 text-meta text-muted-fg">{finding.description}</p>
      )}
      {/* Three different things, said apart and in the same place on every card: what changed in this draft, who raised it, and what the advocate decided. */}
      <dl className="mt-3 space-y-2.5 rounded-control bg-paper p-3.5 text-meta">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-label text-muted-fg">Change</dt>
          <dd className="font-medium text-ink">{finding.change}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-label text-muted-fg">Source</dt>
          <dd>
            {finding.advocateAdded ? (
              <AddedByLabel />
            ) : (
              <span className="text-ink">Not stated</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-label text-muted-fg">Advocate&apos;s decision</dt>
          <dd className="min-w-0 text-right text-ink">
            {finding.disposition ? (
              <>
                <span className="font-medium">
                  {dispositionText(finding.disposition)}
                </span>
                {DISPOSITION_MEANING[finding.disposition] && (
                  <span className="mt-0.5 block text-muted-fg">
                    {DISPOSITION_MEANING[finding.disposition]}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-fg">None yet</span>
            )}
          </dd>
        </div>
      </dl>
    </li>
  );
}
