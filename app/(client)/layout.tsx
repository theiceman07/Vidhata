"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { ClientShellNav } from "@/components/shared/client-shell-nav";

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role !== "client") router.replace("/login");
  }, [role, router]);

  if (role !== "client") return null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ClientShellNav />
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
