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

  if (!hydrated) {
    // A brief skeleton instead of `null` avoids a blank-page flash while
    // the client-only role hydrates from localStorage.
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div
          className="h-8 w-8 animate-pulse rounded-full bg-line"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ role, setRole, signOut }}>
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
