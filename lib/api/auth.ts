import { getSupabaseClient } from "@/lib/auth/supabaseClient";
import { portalOfAccessToken } from "@/lib/auth/role";
import type { StoredRole } from "@/lib/session-expiry";

/**
 * Sign-in against the real Supabase project. The session (and its token) stays inside the
 * Supabase client; only the email leaves this module.
 */
export async function signInWithPassword(email: string, password: string): Promise<{ email: string }> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("Sign-in failed. Check the email and password.");
  return { email: data.user.email ?? email };
}

/** The same words for a wrong password, an unknown account and an account of the other portal. */
export const NO_SUCH_ACCOUNT = "Those details do not match an account.";

/**
 * Sign in to one portal. An account that belongs to the other portal (or has no role) is signed
 * straight out again and refused with the same message as a wrong password, so the form cannot
 * be used to find out which accounts exist.
 */
export async function signInToPortal(email: string, password: string, portal: StoredRole): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(NO_SUCH_ACCOUNT);
  if (portalOfAccessToken(data.session.access_token) !== portal) {
    await supabase.auth.signOut();
    throw new Error(NO_SUCH_ACCOUNT);
  }
}

export async function signOut(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}
