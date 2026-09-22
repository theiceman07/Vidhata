"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { LawyerShellNav } from "@/components/shared/lawyer-shell-nav";
import { DevRoleSwitcher } from "@/components/shared/dev-role-switcher";

export default function LawyerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role === "lawyer") return;
    // See app/(client)/layout.tsx — same fix, mirrored (QA 3.1 / 10.2).
    if (role === "client") router.replace("/documents");
    else router.replace("/advocate-login");
  }, [role, router]);

  if (role !== "lawyer") return null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <LawyerShellNav />
      <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:pb-6">{children}</main>
      {process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1" && (
        <DevRoleSwitcher />
      )}
    </div>
  );
}
