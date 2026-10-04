/**
 * What a client may read once an advocate has signed a document off.
 *
 * Before sign-off the client sees status, the passages behind requests
 * addressed to them, and counts. After it, the whole record is theirs,
 * read-only. The one open question in that is findings the advocate added
 * in review: this is the single switch for whether they are part of it.
 * Turn it off to narrow what the client reads to the first pass's findings
 * and any the advocate addressed to them.
 */
export const SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF = true;
