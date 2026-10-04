import { SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF } from "@/lib/config/visibility";
import { clientVisibleFindings } from "@/lib/findings";
import { nextNumber } from "@/lib/numbering";
import type {
  ClientCitation,
  ClientFinding,
  ContractDocument,
  Finding,
  SignOffRecord,
} from "@/lib/types";

/**
 * What a client is handed of a document's findings.
 *
 * The one place a finding is turned into what a client may read. Every field
 * is named here, so a field added to `Finding` is not handed over until
 * someone adds it on purpose, and a client screen cannot be given what it may
 * not see because the type it receives has no such field.
 *
 * What a client may know of is `clientVisibleFindings`: what the first pass
 * raised, and a finding an advocate added only once a request is addressed to
 * them (or, after sign-off, whatever the advocate-added switch allows). The
 * switch is read here, in the API, and never by a screen.
 */

export interface ShapeOptions {
  /** For a test. Otherwise the configured switch (lib/config/visibility.ts). */
  advocateAddedAfterSignOff?: boolean;
}

/**
 * The recorded sign-off, or null. Nothing reaches a client without one, so the
 * status alone is not enough: a document that says it is settled but has no
 * advocate and date on record is not signed off, and is read as one that is
 * not. This is the same gate delivery uses (lib/api/delivery.ts).
 */
export function signOffRecord(
  doc: Pick<ContractDocument, "status" | "advocate" | "settledAt">,
): SignOffRecord | null {
  if (doc.status !== "settled" && doc.status !== "executed") return null;
  if (!doc.advocate || !doc.settledAt) return null;
  return { advocate: doc.advocate.name, enrolment: doc.advocate.bar, at: doc.settledAt };
}

export const isSignedOff = (doc: Pick<ContractDocument, "status" | "advocate" | "settledAt">): boolean =>
  signOffRecord(doc) !== null;

/**
 * The document as a client reads it. One whose status says it is signed off
 * without the record to show for it is read as still under review, so none of
 * what follows sign-off is handed over for it.
 */
export function asClientReads(doc: ContractDocument): ContractDocument {
  const claimsSignOff = doc.status === "settled" || doc.status === "executed";
  return claimsSignOff && !isSignedOff(doc) ? { ...doc, status: "under_review" } : doc;
}

function shapeCitation(c: Finding["citations"][number]): ClientCitation {
  return {
    id: c.id,
    text: c.text,
    status: c.status,
    corpusRef: c.corpusRef,
    // That it was withdrawn is said. The advocate's note on it is not.
    withdrawn: c.withdrawn !== null,
  };
}

/** The finding as this client reads it, under the number the client was given. */
function shapeFinding(
  finding: Finding,
  number: string,
  signedOff: boolean,
  advocateAdded: boolean,
): ClientFinding {
  const request = finding.changeRequest;
  return {
    number,
    clauseReference: finding.clauseReference,
    // The passage is the draft's own wording, so before sign-off it is the
    // client's only where a request is addressed to them about it.
    clauseText: signedOff || request ? finding.clauseText : null,
    // Named one by one, so the advocate who asked is never carried across.
    request: request
      ? {
          request: request.request,
          requestedAt: request.requestedAt,
          response: request.response,
          respondedAt: request.respondedAt,
        }
      : null,
    detail: signedOff
      ? {
          severity: finding.severity,
          description: finding.description,
          remedySuggested: finding.remedySuggested,
          disposition: finding.disposition,
          citations: finding.citations.map(shapeCitation),
          ...(advocateAdded && finding.source === "advocate" ? { advocateAdded: true as const } : {}),
        }
      : null,
  };
}

/**
 * The findings a client may read, each with the number it was given, in that
 * order.
 *
 * A finding the client may know of always has a client number, given when they
 * first could. The one way it can lack one is the advocate-added switch being
 * turned on after a document was signed off: those findings are then numbered
 * here, after the highest the client has, in the order they were raised. That
 * is worked out and not stored, and is the same each time it is worked out.
 *
 * Shared by everything that names a finding to a client, so none of them can
 * number it differently.
 */
export function numberedForClient(
  record: ContractDocument,
  options: ShapeOptions = {},
): { finding: Finding; number: string }[] {
  const advocateAdded = options.advocateAddedAfterSignOff ?? SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF;
  const doc = asClientReads(record);
  const visible = clientVisibleFindings(doc, { advocateAddedAfterSignOff: advocateAdded });

  const given = visible.flatMap((f) => (f.clientNumber === null ? [] : [f.clientNumber]));
  return visible
    .map((finding) => {
      let number = finding.clientNumber;
      if (number === null) {
        number = nextNumber(given);
        given.push(number);
      }
      return { finding, number };
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
}

/** The findings a client may read, as the client reads them, under their numbers. */
export function shapeClientFindings(record: ContractDocument, options: ShapeOptions = {}): ClientFinding[] {
  const advocateAdded = options.advocateAddedAfterSignOff ?? SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF;
  const signedOff = isSignedOff(asClientReads(record));
  return numberedForClient(record, options).map(({ finding, number }) =>
    shapeFinding(finding, number, signedOff, advocateAdded),
  );
}
