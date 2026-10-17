import { getSupabaseClient } from "@/lib/auth/supabaseClient";

/**
 * Sign-in against the real Supabase project, for the development upload page. The session
 * (and its token) stays inside the Supabase client; only the email leaves this module.
 */
export async function signInWithPassword(email: string, password: string): Promise<{ email: string }> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("Sign-in failed. Check the email and password.");
  return { email: data.user.email ?? email };
}

export async function signOut(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}
