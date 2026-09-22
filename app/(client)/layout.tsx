"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";

const SECTIONS: ShellSection[] = [
  {
    label: "Work",
    links: [
      { href: "/documents", label: "Documents", icon: "description" },
      { href: "/new", label: "New document", icon: "note_add" },
    ],
  },
  {
    label: "Account",
    links: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

/** The document workspace manages its own three-pane scrolling. */
function isWorkspace(pathname: string): boolean {
  return /^\/documents\/[^/]+$/.test(pathname);
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (role === "client") return;
    // QA 3.1 / 10.2: a wrong-but-present role (e.g. an advocate who landed
    // on a client route) used to be sent to /login just like a missing
    // role — the exact bug that stranded a signed-in advocate on the
    // client login screen. Only a missing role goes to login; a mismatched
    // role goes home to *its own* portal.
    if (role === "lawyer") router.replace("/queue");
    else router.replace("/login");
  }, [role, router]);

  if (role !== "client") return null;

  return (
    <AppShell
      sections={SECTIONS}
      homeHref="/documents"
      identity={{
        name: MOCK_CLIENT_ORG.name,
        standing: "Client",
        menuHref: "/settings",
      }}
      fullBleed={isWorkspace(pathname)}
    >
      {children}
    </AppShell>
  );
}
