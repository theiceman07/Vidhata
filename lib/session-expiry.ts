/**
 * How long a preview sign-in lasts, and how a stored one is read back.
 *
 * Presentation only, like the role itself (see lib/session.tsx): it carries
 * no authority, and a real backend verifies a session on every request. It
 * exists so the screens for an ended session can be walked in the preview.
 */

export type StoredRole = "client" | "lawyer";

/** One working day. A single value, so the preview and its tests agree. */
export const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

export type StoredSession =
  | { state: "none" }
  | { state: "active"; role: StoredRole; startedAt: number }
  | { state: "expired"; role: StoredRole };

const isRole = (value: unknown): value is StoredRole => value === "client" || value === "lawyer";

/**
 * Reads what was stored. A bare role (what earlier previews wrote) counts as
 * signed in just now, so no one is signed out by the change. Anything
 * unreadable is no session at all.
 */
export function readStoredSession(raw: string | null, now: number): StoredSession {
  if (!raw) return { state: "none" };
  if (isRole(raw)) return { state: "active", role: raw, startedAt: now };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { state: "none" };
    const { role, at } = parsed as { role?: unknown; at?: unknown };
    if (!isRole(role) || typeof at !== "number" || !Number.isFinite(at)) return { state: "none" };
    return now - at >= SESSION_LIFETIME_MS
      ? { state: "expired", role }
      : { state: "active", role, startedAt: at };
  } catch {
    return { state: "none" };
  }
}

export function serialiseSession(role: StoredRole, now: number): string {
  return JSON.stringify({ role, at: now });
}

/** Milliseconds left on a session that began at `startedAt`, never negative. */
export function remainingMs(startedAt: number, now: number): number {
  return Math.max(0, SESSION_LIFETIME_MS - (now - startedAt));
}

/** Where each portal's sign-in page is, and where its work begins. */
export const PORTAL_PATHS: Record<StoredRole, { signIn: string; home: string; name: string }> = {
  client: { signIn: "/login", home: "/documents", name: "client" },
  lawyer: { signIn: "/advocate-login", home: "/queue", name: "advocate" },
};
