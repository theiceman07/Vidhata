import type { StoredRole } from "@/lib/session-expiry";

/**
 * Which portal a signed-in backend account belongs to, read from the `user_role` claim the
 * Supabase access-token hook adds (backend migration 08). This only routes the person to the
 * right sign-in destination. It decides nothing about access: the backend checks the signed
 * token on every request.
 */
export function portalOfClaim(claim: unknown): StoredRole | null {
  if (claim === "startup_user") return "client";
  if (claim === "lawyer") return "lawyer";
  return null;
}

export function portalOfAccessToken(token: string): StoredRole | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claims: unknown = JSON.parse(atob(padded));
    if (typeof claims !== "object" || claims === null) return null;
    return portalOfClaim((claims as Record<string, unknown>).user_role);
  } catch {
    return null;
  }
}
