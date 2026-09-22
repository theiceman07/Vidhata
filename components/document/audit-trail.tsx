import { format } from "date-fns";
import type { AuditEntry } from "@/lib/audit";

/**
 * The retained record.
 *
 * Set entirely in the notation voice, because this is audit information
 * rather than something to be read for pleasure. Each line states what
 * happened and who did it, in that order.
 */
export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div>
      <h2 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
        Audit trail
      </h2>

      <ol className="mt-4 border-t border-line">
        {entries.map((entry, i) => (
          <li
            key={`${entry.at}-${i}`}
            className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line py-2.5"
          >
            <time
              dateTime={entry.at}
              className="w-44 shrink-0 font-mono text-notation uppercase tracking-notation text-muted-fg"
            >
              {format(new Date(entry.at), "d MMM yyyy · HH:mm")}
            </time>
            <p className="min-w-0 flex-1 text-meta text-ink">
              {entry.action}
              {entry.ref && (
                <span className="ml-2 font-mono text-notation uppercase tracking-notation text-muted-fg">
                  {entry.ref}
                </span>
              )}
            </p>
            <p className="font-mono text-notation uppercase tracking-notation text-muted-fg">
              {entry.actor}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
