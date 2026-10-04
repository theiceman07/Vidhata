"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  readStoredSession,
  remainingMs,
  serialiseSession,
  type StoredRole,
} from "@/lib/session-expiry";

export type SessionRole = StoredRole | null;

interface SessionContextValue {
  role: SessionRole;
  /** False until the stored role has been read. Before that, role is unknown, not absent. */
  ready: boolean;
  /** Whose session ended, when one did. Null for someone who signed out or never signed in. */
  expiredRole: StoredRole | null;
  setRole: (role: SessionRole) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

// QA 2.2: these keys — and everything that reads them — are presentation-only.
// They carry no authority; the server returns the same 200 HTML shell for
// every route regardless of what's stored here. A real backend must
// authorize every request from a server-verified session, never this
// value. See SECURITY-PREVIEW.md.
const STORAGE_KEY = "vidhata-preview-role";
// Whose session ended last, so the screen that says so can send them to the
// right sign-in page, even after a reload.
const EXPIRED_KEY = "vidhata-preview-expired";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — the session still works for this tab
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<SessionRole>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [expiredRole, setExpiredRole] = useState<StoredRole | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const expire = useCallback((whose: StoredRole) => {
    write(STORAGE_KEY, null);
    write(EXPIRED_KEY, whose);
    setRoleState(null);
    setStartedAt(null);
    setExpiredRole(whose);
  }, []);

  useEffect(() => {
    const stored = readStoredSession(read(STORAGE_KEY), Date.now());
    if (stored.state === "active") {
      setRoleState(stored.role);
      setStartedAt(stored.startedAt);
      // A bare role from an earlier preview is rewritten with a start time.
      write(STORAGE_KEY, serialiseSession(stored.role, stored.startedAt));
    } else if (stored.state === "expired") {
      expire(stored.role);
    } else {
      const earlier = read(EXPIRED_KEY);
      if (earlier === "client" || earlier === "lawyer") setExpiredRole(earlier);
    }
    setHydrated(true);
  }, [expire]);

  // A session that ends while the page is open ends there and then.
  useEffect(() => {
    if (!role || startedAt === null) return;
    const timer = window.setTimeout(() => expire(role), remainingMs(startedAt, Date.now()));
    return () => window.clearTimeout(timer);
  }, [role, startedAt, expire]);

  const setRole = useCallback((next: SessionRole) => {
    setRoleState(next);
    setExpiredRole(null);
    write(EXPIRED_KEY, null);
    if (next) {
      const now = Date.now();
      setStartedAt(now);
      write(STORAGE_KEY, serialiseSession(next, now));
    } else {
      setStartedAt(null);
      write(STORAGE_KEY, null);
    }
  }, []);

  // QA 10.5 / 3.4: sign-out used to exist only inside the developer role
  // switcher, which is not shipped to production — leaving no way for a
  // user to end their session at all. Signing out is not an expiry: it
  // leaves no screen behind saying the session ended.
  const signOut = useCallback(() => setRole(null), [setRole]);

  // Children always render. This provider used to hold the whole app
  // behind a placeholder until the role hydrated, which meant every page,
  // public ones included, shipped a blank server render and painted
  // nothing until its script had run. Only the portals need the role, and
  // they wait on `ready` themselves.
  return (
    <SessionContext.Provider value={{ role, ready: hydrated, expiredRole, setRole, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
