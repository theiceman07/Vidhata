/**
 * What the site asks consent for, and how an answer is read back.
 *
 * REVISE THIS WHEN ANALYTICS OR ANY OTHER TOOL IS ADDED. The preview sets no
 * cookie and runs no analytics, so there is nothing non-essential to consent
 * to and the banner says exactly that. The day something non-essential is
 * added: list it in NON_ESSENTIAL_IN_USE, bump CONSENT_VERSION so everyone who
 * answered is asked again, and have counsel confirm the wording. Nothing
 * non-essential may run before "accepted" is on record.
 */

export const CONSENT_VERSION = "preview-1";

/** Every non-essential cookie or tool the site runs. Empty while it runs none. */
export const NON_ESSENTIAL_IN_USE: readonly string[] = [];

export type ConsentChoice = "declined" | "accepted";

export interface ConsentRecord {
  choice: ConsentChoice;
  version: string;
  /** Epoch milliseconds of the answer. */
  at: number;
}

/**
 * The answer on record, or null when there is none to honour: nothing stored,
 * unreadable, or given to an earlier version of the question. Until there is
 * one, the answer is "declined": nothing non-essential runs.
 */
export function readConsent(raw: string | null, version = CONSENT_VERSION): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { choice, version: given, at } = parsed as Partial<ConsentRecord>;
    if (choice !== "declined" && choice !== "accepted") return null;
    if (given !== version || typeof at !== "number" || !Number.isFinite(at)) return null;
    return { choice, version: given, at };
  } catch {
    return null;
  }
}

export function serialiseConsent(choice: ConsentChoice, now: number): string {
  return JSON.stringify({ choice, version: CONSENT_VERSION, at: now } satisfies ConsentRecord);
}

/**
 * The line the banner opens with. It is derived, so it cannot outlive the truth.
 *
 * WORDING PENDING COUNSEL REVIEW. It is kept to what is true in every build,
 * with or without the preview workspace: no cookies beyond what the site needs,
 * no analytics. It says nothing of sign-in, because the public site has none.
 */
export function consentStatement(inUse: readonly string[] = NON_ESSENTIAL_IN_USE): string {
  return inUse.length === 0
    ? "This site doesn't use cookies beyond what it needs to work. Nothing is tracked."
    : `This site would use ${inUse.join(", ")}, which it does not need to work. Decline and it will not run.`;
}
