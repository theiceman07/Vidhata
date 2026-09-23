"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { AppShell, type ShellSection } from "@/components/shared/app-shell";
import { BrandLoader } from "@/components/shared/brand-loader";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";

const SECTIONS: ShellSection[] = [
  {
    label: "Work",
    links: [
      // No "New document" here: a document starts from the prompt on
      // Documents, which drafts it or opens intake for what is missing.
      { href: "/documents", label: "Documents", icon: "description" },
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
  const { role, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (role === "client") return;
    // QA 3.1 / 10.2: a wrong-but-present role (e.g. an advocate who landed
    // on a client route) used to be sent to /login just like a missing
    // role — the exact bug that stranded a signed-in advocate on the
    // client login screen. Only a missing role goes to login; a mismatched
    // role goes home to *its own* portal.
    if (role === "lawyer") router.replace("/queue");
    else router.replace("/login");
  }, [ready, role, router]);

  // The stored role is read after the first render. Until then who you
  // are is unknown, not absent, so this waits rather than redirecting,
  // and a wrong role waits here while it is sent to its own portal.
  if (!ready || role !== "client") return <BrandLoader />;

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
