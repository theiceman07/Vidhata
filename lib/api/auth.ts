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

export type SignInProvider = "google" | "azure";

/** Which provider the person chose, so the callback can name it. sessionStorage. */
export const PROVIDER_KEY = "vidhata-signin-provider";

/**
 * Google or Microsoft sign-in for an existing client account. The browser leaves for the
 * provider and comes back to /auth/callback, which finishes the sign-in (finishProviderSignIn).
 * Microsoft is "azure" to Supabase; the email scope is asked for so the account can be matched.
 */
export async function signInWithProvider(provider: SignInProvider): Promise<void> {
  try {
    window.sessionStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    // Storage unavailable: the callback assumes Google for the label only.
  }
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: provider === "azure" ? "email openid profile" : undefined,
    },
  });
  if (error) throw new Error("Couldn't reach the sign-in provider. Try again, or use your email and password.");
}

export type ProviderSignInResult =
  | { kind: "client" }
  /** No account behind that address (backend migration 24 gives it no role). Already signed out. */
  | { kind: "no-account"; name?: string; email?: string }
  | { kind: "failed" };

/**
 * After the provider sends the browser back. Supabase reads the code in the URL itself; this waits
 * for the session and decides where the person goes. An advocate account, or an account with no
 * role, is signed straight out: provider sign-in is for the client portal, and a user with no role
 * is someone who has not been invited yet.
 */
export async function finishProviderSignIn(): Promise<ProviderSignInResult> {
  const supabase = getSupabaseClient();
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error")) return { kind: "failed" };

  let session = (await supabase.auth.getSession()).data.session;
  if (!session && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { kind: "failed" };
    session = data.session;
  }
  if (!session) return { kind: "failed" };

  if (portalOfAccessToken(session.access_token) === "client") return { kind: "client" };

  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : undefined;
  const email = session.user.email ?? undefined;
  await supabase.auth.signOut();
  return { kind: "no-account", name, email };
}
