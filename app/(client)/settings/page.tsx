"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";

/**
 * Client settings.
 *
 * Deliberately short. Everything the product knows about an
 * organisation is shown as a record rather than as a form full of
 * fields nobody changes. Billing has its own page, and the one genuinely
 * useful action here is ending the session.
 */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-label font-medium text-muted-fg">{label}</dt>
      <dd className="min-w-0 text-body text-ink">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useSession();

  return (
    <div className="w-full">
      <h1 className="font-display text-h1 text-ink">Settings</h1>
      <p className="mt-2 text-body text-muted-fg">{MOCK_CLIENT_ORG.name}</p>

      <section className="mt-8 max-w-3xl rounded-card bg-parchment p-6">
        <dl>
          <Row label="Organisation">{MOCK_CLIENT_ORG.name}</Row>
          <Row label="Documents scoped to">
            <span className="font-mono text-meta">{MOCK_CLIENT_ORG.id}</span>
          </Row>
          <Row label="Review tier">
            Assigned to each document after screening, from its value and risk.
          </Row>
          <Row label="Billing">
            <Link href="/billing" className="underline underline-offset-2 hover:text-accent">
              Invoices and billing details
            </Link>
          </Row>
          <Row label="Privacy">
            <Link
              href="/settings/privacy"
              className="underline underline-offset-2 hover:text-accent"
            >
              Training use, export and deletion
            </Link>
          </Row>
        </dl>
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-label font-medium text-muted-fg">Session</h2>
        <p className="mt-3 max-w-prose text-meta text-muted-fg">
          Signing out ends this session on this device. Your documents and
          their audit trails are unaffected.
        </p>
        {/* QA 10.5 / 3.4: sign-out used to exist only inside the developer
            role switcher, which is not shipped, leaving no way for a user
            to end their session at all. */}
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => {
              signOut();
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}
