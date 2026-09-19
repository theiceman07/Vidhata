"use client";

import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "client" as const, label: "Client" },
  { value: "lawyer" as const, label: "Advocate" },
];

export function DevRoleSwitcher() {
  const { role, setRole } = useSession();

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
              ? "bg-brand text-brand-fg"
              : "text-ink hover:bg-canvas",
          )}
        >
          {r.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setRole(null)}
        className="rounded-control px-2 py-1 text-small text-muted-fg hover:bg-canvas"
      >
        Sign out
      </button>
    </div>
  );
}
