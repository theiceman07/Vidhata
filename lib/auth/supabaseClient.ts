import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser's Supabase client, used for sign-in and for the session whose access token
 * lib/api/* sends to the backend. It holds the publishable (anon) key only.
 *
 * Built on first use, not on import, so a missing variable fails where the client is needed
 * with a message that names what to set, and modules that merely import this one still load.
 * Next inlines NEXT_PUBLIC_* only when written out in full, so each is read by name.
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter(Boolean);
    throw new Error(`Supabase is not configured: set ${missing.join(" and ")} in .env.local (see .env.example) and restart the dev server.`);
  }
  client = createClient(url, anonKey);
  return client;
}
