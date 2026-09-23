"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type SessionRole = "client" | "lawyer" | null;

interface SessionContextValue {
  role: SessionRole;
  /** False until the stored role has been read. Before that, role is unknown, not absent. */
  ready: boolean;
  setRole: (role: SessionRole) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

// QA 2.2: this key — and everything that reads it — is presentation-only.
// It carries no authority; the server returns the same 200 HTML shell for
// every route regardless of what's stored here. A real backend must
// authorize every request from a server-verified session, never this
// value. See SECURITY-PREVIEW.md.
const STORAGE_KEY = "vidhata-preview-role";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<SessionRole>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "client" || stored === "lawyer") setRoleState(stored);
    setHydrated(true);
  }, []);

  const setRole = useCallback((next: SessionRole) => {
    setRoleState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — role still works for this tab session
    }
  }, []);

  // QA 10.5 / 3.4: sign-out used to exist only inside the developer role
  // switcher, which is not shipped to production — leaving no way for a
  // user to end their session at all.
  const signOut = useCallback(() => setRole(null), [setRole]);

  // Children always render. This provider used to hold the whole app
  // behind a placeholder until the role hydrated, which meant every page,
  // public ones included, shipped a blank server render and painted
  // nothing until its script had run. Only the portals need the role, and
  // they wait on `ready` themselves.
  return (
    <SessionContext.Provider value={{ role, ready: hydrated, setRole, signOut }}>
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
