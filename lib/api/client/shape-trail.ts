import { clientAuditTrail } from "@/lib/audit";
import type { ClientAuditEntry, ContractDocument } from "@/lib/types";
import { asClientReads, isSignedOff, numberedForClient, type ShapeOptions } from "./shape-findings";

/**
 * A document's activity trail as a client reads it.
 *
 * Built from the existing client trail (lib/audit.ts), which already keeps out
 * the advocate's working record and says only that a draft was revised, not
 * where. This closes what it left open:
 *
 * - Before sign-off a client is told what is raised and never what was decided,
 *   so a finding settled, a source withdrawn and the advocate's own conflict
 *   declaration are left out. After it, the record is theirs.
 * - Before sign-off the advocate is "Advocate", never a name. After it the
 *   record names them, as the sign-off already does.
 * - A finding is named by the number the client was given, in the entry and in
 *   its text, and never by an id.
 */
export function shapeClientTrail(record: ContractDocument, options: ShapeOptions = {}): ClientAuditEntry[] {
  const doc = asClientReads(record);
  const signedOff = isSignedOff(doc);
  const findings = new Map(
    numberedForClient(doc, options).map(({ finding, number }) => [
      finding.findingId,
      { number, clauseReference: finding.clauseReference },
    ]),
  );

  return clientAuditTrail(doc, { advocateAddedAfterSignOff: options.advocateAddedAfterSignOff })
    .filter((e) => signedOff || !e.afterSignOff)
    // An entry about a finding the client may not know of is never handed over.
    .filter((e) => !e.findingId || findings.has(e.findingId))
    .map((e) => {
      const about = e.findingId ? findings.get(e.findingId) : undefined;
      const entry: ClientAuditEntry = {
        at: e.at,
        actor: signedOff || !e.actor.endsWith(", advocate") ? e.actor : "Advocate",
        action: e.action,
        findingNumber: about?.number ?? null,
        ref: about ? `Finding ${about.number} · ${about.clauseReference}` : e.ref,
        kind: e.kind,
      };
      if (e.clause !== undefined) entry.clause = e.clause;
      return entry;
    });
}
