import { format } from "date-fns";

/**
 * An advocate's note to the client, read, beside the clause it is about.
 *
 * Shared by both portals: the advocate reads it on the sign-off page as what
 * will be shared, and the client reads it in the settled document as what was
 * released. It takes the plain facts of a note and nothing else, so it can hold
 * no record and nothing of the advocate beyond the byline it is given. It is
 * not a working note, and has no control that makes it one.
 */
export function SettlementNoteView({
  clauseNumber,
  clauseHeading,
  text,
  label,
  releasedAt,
}: {
  clauseNumber: string;
  clauseHeading?: string | null;
  text: string;
  /** What it is called to this reader: "Note to client", or "Your advocate's note". */
  label: string;
  /** Shown only once it has been released. */
  releasedAt?: string | null;
}) {
  return (
    <article className="rounded-card bg-parchment p-4">
      <p className="text-label font-medium text-muted-fg">
        {label}
        <span className="mx-1.5 text-line">·</span>
        Clause {clauseNumber}
        {clauseHeading ? ` · ${clauseHeading}` : ""}
        {releasedAt ? ` · ${format(new Date(releasedAt), "d MMM yyyy")}` : ""}
      </p>
      {/* The advocate's own words, as written, and nothing added to them. */}
      <p className="mt-2 whitespace-pre-line text-body text-ink">{text}</p>
    </article>
  );
}
