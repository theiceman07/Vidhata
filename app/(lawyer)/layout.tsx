"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { LawyerShellNav } from "@/components/shared/lawyer-shell-nav";

export default function LawyerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role !== "lawyer") router.replace("/lawyer-login");
  }, [role, router]);

  if (role !== "lawyer") return null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <LawyerShellNav />
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
