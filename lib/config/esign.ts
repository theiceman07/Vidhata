import { CONTRACT_TYPES } from "@/lib/mock/intake-options.mock";
import type { ContractDocument, ExecutionStep } from "@/lib/types";

/**
 * Whether a document can be signed electronically.
 *
 * The classes that cannot are the Problem Statement's list. They are shown to
 * the client as they are, and they carry one standing note: the list needs
 * legal confirmation, because the schedule to the IT Act can be amended. This
 * is orientation for the client, not a legal opinion, and nothing here names a
 * section or quotes statute text.
 */

export const ESIGN_EXCLUSIONS = [
  "Wills",
  "Trusts",
  "Negotiable instruments",
  "Powers of attorney (non-regulated)",
] as const;

export const ESIGN_LEGAL_NOTE =
  "This list needs legal confirmation. The schedule to the IT Act can be amended.";

/**
 * The agreement types Vidhata drafts that fall in one of the classes above.
 * None does: a mutual NDA, a vendor agreement, a master services agreement and
 * an employment agreement are none of a will, a trust, a negotiable instrument
 * or a power of attorney. A type is added here, and only here, if one ever is.
 */
const EXCLUDED_TYPES: ReadonlyArray<ContractDocument["type"]> = [];

export function canSignElectronically(
  type: ContractDocument["type"],
  excluded: ReadonlyArray<ContractDocument["type"]> = EXCLUDED_TYPES,
): boolean {
  return !excluded.includes(type);
}

/**
 * The e-signature step for a document of this type, not yet done.
 *
 * It states whether the type can be signed electronically and how the client
 * confirms it. It names no signing provider and no portal, because none is
 * connected: the signatories sign by whatever means they use, and the client
 * confirms here that they have.
 */
export function esignatureStep(
  type: ContractDocument["type"],
  excluded: ReadonlyArray<ContractDocument["type"]> = EXCLUDED_TYPES,
): ExecutionStep {
  const label = CONTRACT_TYPES.find((t) => t.value === type)?.label ?? type;
  const eligible = canSignElectronically(type, excluded);

  return {
    kind: "esignature",
    applicable: eligible,
    headline: eligible
      ? "e-signature: can be signed electronically"
      : "e-signature: not available for this document",
    detail: eligible
      ? "Both signatories can sign this document electronically. Legal confirmation of this is pending."
      : "This kind of document cannot be signed electronically. It is signed on paper.",
    reason: eligible
      ? `A ${label} is not among the classes that cannot be signed electronically. ${ESIGN_LEGAL_NOTE}`
      : `A ${label} is among the classes that cannot be signed electronically. ${ESIGN_LEGAL_NOTE}`,
    instructions: eligible
      ? [
          "Both signatories sign the settled document electronically, by the means they use.",
          "Keep the signed copy and attach it here as proof.",
          "Confirm below that both have signed.",
        ]
      : [],
    complete: false,
    completedAt: null,
    completedBy: null,
    evidence: null,
  };
}
