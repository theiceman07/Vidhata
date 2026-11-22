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
