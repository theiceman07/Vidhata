import { SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF } from "@/lib/config/visibility";
import { clientVisibleFindings } from "@/lib/findings";
import { nextNumber } from "@/lib/numbering";
import type { ClientCitation, ClientFinding, ContractDocument, Finding } from "@/lib/types";

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

export const isSignedOff = (doc: Pick<ContractDocument, "status">): boolean =>
  doc.status === "settled" || doc.status === "executed";

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
 * The findings a client may read, each under the number it was given, in that
 * order.
 *
 * A finding the client may know of always has a client number, given when they
 * first could. The one way it can lack one is the advocate-added switch being
 * turned on after a document was signed off: those findings are then numbered
 * here, after the highest the client has, in the order they were raised. That
 * is worked out and not stored, and is the same each time it is worked out.
 */
export function shapeClientFindings(doc: ContractDocument, options: ShapeOptions = {}): ClientFinding[] {
  const advocateAdded = options.advocateAddedAfterSignOff ?? SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF;
  const signedOff = isSignedOff(doc);
  const visible = clientVisibleFindings(doc, { advocateAddedAfterSignOff: advocateAdded });

  const given = visible.flatMap((f) => (f.clientNumber === null ? [] : [f.clientNumber]));
  return visible
    .map((f) => {
      let number = f.clientNumber;
      if (number === null) {
        number = nextNumber(given);
        given.push(number);
      }
      return shapeFinding(f, number, signedOff, advocateAdded);
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
}
