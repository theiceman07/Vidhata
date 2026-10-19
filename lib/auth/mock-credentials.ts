import { MOCK_PREVIEW_CREDENTIALS } from "@/lib/mock/auth.mock";
import { backendDataEnabled } from "@/lib/api/source";

/**
 * Whether a sign-in matches the preview's sample credentials. With the real backend on it is
 * always false, so the mock check cannot let anyone in however it is reached: only a real
 * Supabase account signs in then.
 */
export function mockCredentialsAccepted(username: string, password: string): boolean {
  if (backendDataEnabled()) return false;
  return (
    username === MOCK_PREVIEW_CREDENTIALS.username &&
    password === MOCK_PREVIEW_CREDENTIALS.password
  );
}
