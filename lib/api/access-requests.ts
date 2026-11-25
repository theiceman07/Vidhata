import { getSupabaseClient } from "@/lib/auth/supabaseClient";
import { supportEmail } from "@/lib/config/contact";
import type { AccessRequestInput } from "@/lib/types";

/**
 * Requests from the public site: access for a client, an advocate's application to the panel,
 * and interest in an agreement that is not available yet. Each is one insert into the backend's
 * access_requests table (migration 23), which the browser may write and never read, and the
 * backend emails each one to Quenta (migration 25).
 *
 * The insert asks for no rows back: the browser has no SELECT on the table.
 */

export const LIMITS = { name: 200, company: 200, brief: 2000, message: 2000, agreement: 120, email: 320 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= LIMITS.email && EMAIL.test(v);
}

function clip(value: string | undefined, max: number): string | null {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
}

/** The row as the table takes it. Exported for the test. */
export function toRow(input: AccessRequestInput) {
  const details: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.details ?? {})) {
    const value = v.trim();
    if (value) details[k] = value.slice(0, 500);
  }
  return {
    kind: input.kind,
    source: "form" as const,
    name: clip(input.name, LIMITS.name),
    email: input.email.trim(),
    company: clip(input.company, LIMITS.company),
    brief: clip(input.brief, LIMITS.brief),
    message: clip(input.message, LIMITS.message),
    agreement: clip(input.agreement, LIMITS.agreement),
    details,
  };
}

export class AccessRequestError extends Error {}

/** One message for every failure, with the address to write to instead. */
export function failureMessage(): string {
  return `We couldn't send that. Please try again, or email ${supportEmail()}.`;
}

export async function submitAccessRequest(input: AccessRequestInput): Promise<void> {
  if (!isEmail(input.email)) throw new AccessRequestError("Enter an email address, like name@company.com.");
  let error: unknown;
  try {
    ({ error } = await getSupabaseClient().from("access_requests").insert(toRow(input)));
  } catch (e) {
    error = e;
  }
  if (error) throw new AccessRequestError(failureMessage());
}

/**
 * What a provider sign-in with no account hands to the request form: the name and email from the
 * provider profile. Kept in sessionStorage, never in the URL.
 */
export const PROVIDER_PREFILL_KEY = "vidhata-access-prefill";

export interface ProviderPrefill {
  name?: string;
  email?: string;
  provider: "google" | "azure";
}

export function keepProviderPrefill(prefill: ProviderPrefill): void {
  try {
    window.sessionStorage.setItem(PROVIDER_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // Storage unavailable: the form starts empty.
  }
}

/** Read once: the prefill is removed as it is read. */
export function takeProviderPrefill(): ProviderPrefill | null {
  try {
    const raw = window.sessionStorage.getItem(PROVIDER_PREFILL_KEY);
    window.sessionStorage.removeItem(PROVIDER_PREFILL_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ProviderPrefill>;
    if (value.provider !== "google" && value.provider !== "azure") return null;
    return {
      provider: value.provider,
      name: typeof value.name === "string" ? value.name : undefined,
      email: typeof value.email === "string" ? value.email : undefined,
    };
  } catch {
    return null;
  }
}
