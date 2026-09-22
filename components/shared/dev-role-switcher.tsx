"use client";

import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "client" as const, label: "Client" },
  { value: "lawyer" as const, label: "Advocate" },
];

// Rendered only when NEXT_PUBLIC_VIDHATA_PREVIEW_MODE=1 (see
// app/(client)/layout.tsx and app/(lawyer)/layout.tsx) and never on public
// routes — QA 2.3/6.2/7.1: this used to render unconditionally on every
// route, including the public landing and pricing pages.
export function DevRoleSwitcher() {
  const { role, setRole, signOut } = useSession();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-control border border-line bg-paper p-1 shadow-card">
      <span className="px-2 text-small text-muted-fg">Dev role</span>
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => setRole(r.value)}
          className={cn(
            "rounded-control px-2 py-1 text-small transition-colors",
            role === r.value
              ? "bg-accent text-accent-fg"
              : "text-ink hover:bg-canvas",
          )}
        >
          {r.label}
        </button>
      ))}
      <button
        type="button"
        onClick={signOut}
        className="rounded-control px-2 py-1 text-small text-muted-fg hover:bg-canvas"
      >
        Sign out
      </button>
    </div>
  );
}
