import {
  clientVersionDiff,
  clientVersionList,
  type ClientVersionDiffResult,
} from "@/lib/clientVersions";
import { clientVisibleFindings } from "@/lib/findings";
import { nextNumber } from "@/lib/numbering";
import type { ClientVersionList, ContractDocument, DocumentVersion, Finding } from "@/lib/types";
import { asClientReads, type ShapeOptions } from "./shape-findings";

/**
 * A document's history as a client reads it.
 *
 * The drafts and what changed between them are worked out by
 * lib/clientVersions.ts, which holds the rules for what a client may be told.
 * This reads the document the way a client does (a document that says it is
 * signed off without the record to show for it is read as not signed off), and
 * numbers every finding by the number the client was given, so a finding is the
 * same number in every comparison that shows it.
 */

/**
 * The number a client reads each finding by, across every draft of the document.
 *
 * It is the stored client number. The one way a finding the client may read can
 * lack one is the advocate-added switch being turned on after sign-off: it is
 * then numbered after the highest the client has, in the order it was first
 * met, the same in every draft. Worked out here and not stored.
 */
function clientNumbers(
  doc: ContractDocument,
  versions: DocumentVersion[],
  options: ShapeOptions,
): (finding: Finding) => string {
  const drafts = [...versions]
    .sort((a, b) => a.number - b.number)
    .map((v) => ({ ...doc, version: v.number, clauses: v.clauses, findings: v.findings }));
  const everyDraft = [...drafts, doc];

  const known = new Map<string, string>();
  for (const d of everyDraft) {
    for (const f of d.findings) if (f.clientNumber !== null) known.set(f.findingId, f.clientNumber);
  }

  const fallback = new Map<string, string>();
  for (const d of everyDraft) {
    for (const f of clientVisibleFindings(d, { advocateAddedAfterSignOff: options.advocateAddedAfterSignOff })) {
      if (known.has(f.findingId) || fallback.has(f.findingId)) continue;
      fallback.set(f.findingId, nextNumber([...known.values(), ...fallback.values()]));
    }
  }
  return (f) => f.clientNumber ?? known.get(f.findingId) ?? fallback.get(f.findingId) ?? "";
}

/** The drafts, newest first, as counts. Never the drafts. */
export function shapeClientVersionList(
  record: ContractDocument,
  versions: DocumentVersion[],
  options: ShapeOptions = {},
): ClientVersionList {
  return clientVersionList(asClientReads(record), versions, options);
}

/** What changed between two drafts, for the client. */
export function shapeClientDiff(
  record: ContractDocument,
  versions: DocumentVersion[],
  a: number,
  b: number,
  options: ShapeOptions = {},
): ClientVersionDiffResult {
  const doc = asClientReads(record);
  return clientVersionDiff(doc, versions, a, b, {
    advocateAddedAfterSignOff: options.advocateAddedAfterSignOff,
    numberFor: clientNumbers(doc, versions, options),
  });
}
