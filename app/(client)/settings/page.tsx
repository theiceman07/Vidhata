"use client";

import { useRouter } from "next/navigation";
import { Dateline } from "@/components/document/dateline";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";

/**
 * Client settings.
 *
 * Deliberately short. Everything the product knows about an
 * organisation is shown as a record rather than as a form full of
 * fields nobody changes, and the one genuinely useful action here is
 * ending the session.
 */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-1 border-b border-line py-4">
      <dt className="w-40 shrink-0 font-mono text-notation uppercase tracking-notation text-muted-fg">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-body text-ink">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useSession();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Dateline segments={["Settings"]} />
      <h1 className="mt-3 font-display text-h1 text-ink">
        {MOCK_CLIENT_ORG.name}
      </h1>

      <dl className="mt-decision border-t border-line">
        <Row label="Organisation">{MOCK_CLIENT_ORG.name}</Row>
        <Row label="Documents scoped to">
          <span className="font-mono text-notation uppercase tracking-notation">
            {MOCK_CLIENT_ORG.id}
          </span>
        </Row>
        <Row label="Review tier">Chosen per document when you start one.</Row>
        <Row label="Billing">
          Not enabled in this preview. No payment is taken.
        </Row>
      </dl>

      <section className="mt-decision">
        <h2 className="font-mono text-notation uppercase tracking-notation text-muted-fg">
          Session
        </h2>
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
