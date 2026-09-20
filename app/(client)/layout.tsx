"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { ClientShellNav } from "@/components/shared/client-shell-nav";
import { DevRoleSwitcher } from "@/components/shared/dev-role-switcher";

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role === "client") return;
    // QA 3.1 / 10.2: a wrong-but-present role (e.g. an advocate who landed
    // on a client route) used to be sent to /login just like a missing
    // role — the exact bug that stranded a signed-off-in advocate on the
    // client login screen. Only a missing role goes to login; a mismatched
    // role goes home to *its own* portal.
    if (role === "lawyer") router.replace("/queue");
    else router.replace("/login");
  }, [role, router]);

  if (role !== "client") return null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ClientShellNav />
      <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:pb-6">
        {children}
      </main>
      {process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1" && (
        <DevRoleSwitcher />
      )}
    </div>
  );
}
