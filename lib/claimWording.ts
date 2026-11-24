/**
 * What the claim dialog says about the counterparty. With the live service the system checks
 * the client organisation only (backend/app/lawyer_queue/service.py, claim), so a confirmation
 * about the counterparty is the advocate's own attestation, and is not described as a check.
 */
export const BACKEND_ATTESTATION_NOTE =
  "Your confirmation about the counterparty is your own attestation. The system checks client organisations only.";

export const PREVIEW_DECLARATION_NOTE =
  "Your declaration is recorded with the claim.";

export function claimAttestationNote(backend: boolean): string {
  return backend ? BACKEND_ATTESTATION_NOTE : PREVIEW_DECLARATION_NOTE;
}

/**
 * Said before an advocate confirms a conflict with a client. The backend has no route that
 * removes a declaration, so it cannot be undone from here. The address comes from the deploy's
 * own setting (lib/config/contact.ts); none is written into the source, and while none is set
 * this says so instead of naming one.
 */
export const PERMANENT_DECLARATION =
  "This declaration is permanent. Contact support to change it.";
export const NO_SUPPORT_ADDRESS_YET = "There is no support address yet.";

export function permanentDeclarationNote(
  supportAddress: string | null,
): string {
  return supportAddress
    ? `${PERMANENT_DECLARATION} Write to ${supportAddress}.`
    : `${PERMANENT_DECLARATION} ${NO_SUPPORT_ADDRESS_YET}`;
}
