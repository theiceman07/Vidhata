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
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "vidhata-mock-role";

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

  if (!hydrated) return null;

  return (
    <SessionContext.Provider value={{ role, setRole }}>
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
