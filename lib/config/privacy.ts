/**
 * What a deletion request would remove, and what it would not.
 *
 * Marked pending counsel confirmation, because it is a legal question and
 * this is not an answer to it: the sign-off record and the audit trail are
 * meant to be immutable (SRD §4.3), and whether the rest may be kept is for
 * counsel. No retention period is named, because none has been supplied. The
 * wording is the one place to change when counsel has confirmed it.
 *
 * A deletion request in this preview is recorded and nothing else: nothing is
 * deleted, and the screen says so.
 */
export const DELETION_STATUS = "Pending counsel confirmation";

export const DELETION_SCOPE = {
  /** What a request would remove. */
  removed: [
    "Your account and your organisation's profile",
    "Your billing details, including any GSTIN",
    "Documents that have not been signed off, with their drafts and your answers",
    "Your consultation requests and the questions you wrote",
  ],
  /** What is kept, and why. */
  kept: [
    "The sign-off record and the audit trail of every document an advocate has signed off, which are meant to be immutable",
    "Invoices and payment records, kept for accounting",
    "The consent log, the record of when you turned training use on or off, kept so a revocation can be shown to have happened",
  ],
  /** What has not been decided. */
  undecided: [
    "Whether a settled document itself is removed from your account or kept with its sign-off record",
  ],
} as const;

/** What the screen says once a request is recorded. */
export const DELETION_RECORDED =
  "Request recorded. Nothing has been deleted in this preview.";
