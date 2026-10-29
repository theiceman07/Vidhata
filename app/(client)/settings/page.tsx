"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAccount,
  inviteMember,
  removeMember,
  saveProfile,
} from "@/lib/api/account";
import { useSession } from "@/lib/session";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { Account, TeamMember } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { PrivacySettings } from "@/components/domain/privacy-settings";
import { cn } from "@/lib/utils";

/**
 * Client settings.
 *
 * Who you are, who is on the team, and the way out. Billing and privacy have
 * their own pages. It stays small on purpose: in the preview every member has
 * the same access and an invitation sends nothing, because who may invite or
 * remove, and what each person may see, are real organisation and role
 * handling that has not been built.
 */
type LoadState = "loading" | "error" | "loaded";

const STATUS_WORD: Record<TeamMember["status"], string> = {
  owner: "Owner",
  active: "Member",
  invited: "Invited",
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-baseline gap-x-8 gap-y-1 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className="text-meta font-medium text-muted-fg">{label}</dt>
      <dd className="min-w-0 text-body text-ink">{children}</dd>
    </div>
  );
}

function AccountSettings() {
  const router = useRouter();
  const { signOut } = useSession();

  const [account, setAccount] = useState<Account | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileProblem, setProfileProblem] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteProblem, setInviteProblem] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  // The person whose removal is waiting to be confirmed.
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const loaded = await getAccount(MOCK_CLIENT_ORG.id);
      setAccount(loaded);
      setName(loaded.profile.name);
      setEmail(loaded.profile.email);
      setState("loaded");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Could not load your account.",
      );
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileProblem("");
    try {
      const saved = await saveProfile(MOCK_CLIENT_ORG.id, { name, email });
      setAccount(saved);
      setName(saved.profile.name);
      setEmail(saved.profile.email);
      toast.success("Your details are updated");
    } catch (err) {
      setProfileProblem(
        err instanceof Error ? err.message : "Could not save your details.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteProblem("");
    try {
      setAccount(await inviteMember(MOCK_CLIENT_ORG.id, inviteEmail));
      toast.success(`Invitation recorded for ${inviteEmail.trim()}`);
      setInviteEmail("");
    } catch (err) {
      setInviteProblem(
        err instanceof Error ? err.message : "Could not send the invitation.",
      );
    } finally {
      setInviting(false);
    }
  }

  async function remove(member: TeamMember) {
    setRemoving(member.id);
    setConfirming(null);
    try {
      setAccount(await removeMember(MOCK_CLIENT_ORG.id, member.id));
      toast.success(
        member.status === "invited"
          ? "Invitation withdrawn"
          : "Removed from the team",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove this person.",
      );
    } finally {
      setRemoving(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="w-full" aria-busy="true">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
        </div>
      </div>
    );
  }
  if (state === "error" || !account) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const profileUnchanged =
    name.trim() === account.profile.name &&
    email.trim() === account.profile.email;

  return (
    <div className="w-full">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <section
            aria-labelledby="profile-title"
            className="rounded-card bg-surface p-5"
          >
            <h2 id="profile-title" className="font-display text-h3 text-ink">
              Your details
            </h2>
            <form
              onSubmit={save}
              noValidate
              className="mt-4 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-describedby={
                    profileProblem ? "profile-problem" : undefined
                  }
                />
              </div>
              {profileProblem && (
                <p
                  id="profile-problem"
                  role="alert"
                  className="text-meta text-ink sm:col-span-2"
                >
                  {profileProblem}
                </p>
              )}
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={saving || profileUnchanged || name.trim() === ""}
                >
                  {saving ? "Saving" : "Save details"}
                </Button>
              </div>
            </form>
          </section>

          <section
            aria-labelledby="team-title"
            className="rounded-card bg-surface p-5"
          >
            <h2 id="team-title" className="font-display text-h3 text-ink">
              Your team
            </h2>
            <p className="mt-2 max-w-measure text-meta text-muted-fg">
              Everyone here has the same access. Inviting someone sends nothing
              in the preview.
            </p>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {account.members.map((member) => (
                <li
                  key={member.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_11rem]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body text-ink">
                      {member.name ?? member.email}
                    </p>
                    {member.name && (
                      <p className="truncate text-meta text-muted-fg">
                        {member.email}
                      </p>
                    )}
                  </div>
                  <span className="justify-self-start rounded-full bg-parchment px-2.5 py-0.5 text-label text-muted-fg">
                    {STATUS_WORD[member.status]}
                  </span>
                  <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                    {member.status !== "owner" &&
                      (confirming === member.id ? (
                        <>
                          <span className="text-meta text-ink">
                            {member.status === "invited"
                              ? "Withdraw?"
                              : "Remove?"}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={removing === member.id}
                            onClick={() => void remove(member)}
                            className="hover:border-flagged hover:text-ink"
                          >
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirming(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={removing === member.id}
                          aria-label={
                            member.status === "invited"
                              ? `Withdraw the invitation to ${member.email}`
                              : `Remove ${member.name ?? member.email} from the team`
                          }
                          onClick={() => setConfirming(member.id)}
                          className="text-muted-fg hover:text-ink"
                        >
                          {member.status === "invited" ? "Withdraw" : "Remove"}
                        </Button>
                      ))}
                  </div>
                </li>
              ))}
            </ul>

            <form onSubmit={invite} noValidate className="mt-4">
              <Label htmlFor="invite-email">Invite someone by email</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@company.example"
                  autoComplete="off"
                  className="max-w-sm flex-1"
                  aria-describedby={
                    inviteProblem ? "invite-problem" : undefined
                  }
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={
                    inviting || !/^\S+@\S+\.\S+$/.test(inviteEmail.trim())
                  }
                >
                  {inviting ? "Inviting" : "Invite"}
                </Button>
              </div>
              {inviteProblem && (
                <p
                  id="invite-problem"
                  role="alert"
                  className="mt-2 text-meta text-ink"
                >
                  {inviteProblem}
                </p>
              )}
            </form>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section
            aria-labelledby="org-title"
            className="rounded-card bg-surface p-5"
          >
            <h2 id="org-title" className="font-display text-h3 text-ink">
              Organisation
            </h2>
            <dl className="mt-2">
              <Row label="Name">{MOCK_CLIENT_ORG.name}</Row>
              <Row label="Review tier">
                Assigned per document
                <span className="mt-0.5 block text-meta text-muted-fg">
                  After screening, from its value and risk.
                </span>
              </Row>
              <Row label="Billing">
                <Link href="/billing" className="link">
                  Invoices and billing details
                </Link>
              </Row>
            </dl>
            <div className="mt-4 border-t border-line pt-4">
              <h3 id="session-title" className="text-meta font-medium text-ink">
                Session
              </h3>
              <p className="mt-2 max-w-measure text-meta text-muted-fg">
                Signing out ends this session on this device. Your documents and
                their audit trails are unaffected.
              </p>
              {/* QA 10.5 / 3.4: sign-out used to exist only inside the developer
            role switcher, which is not shipped, leaving no way for a user
            to end their session at all. */}
              <div className="mt-4">
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const SETTINGS_TABS = [
  { key: "account", label: "Account", href: "/settings" },
  { key: "privacy", label: "Privacy", href: "/settings?tab=privacy" },
] as const;

/** Settings has two tabs: who you are, and what Vidhata may do with your documents. */
function SettingsTabs() {
  const tab =
    useSearchParams().get("tab") === "privacy" ? "privacy" : "account";

  return (
    <div className="w-full">
      <PageHeader
        title="Settings"
        tabs={
          <nav aria-label="Settings">
            <ul className="-ml-3 flex flex-wrap items-center gap-x-1">
              {SETTINGS_TABS.map((t) => (
                <li key={t.key}>
                  <Link
                    href={t.href}
                    aria-current={t.key === tab ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-8 items-center rounded-control px-3 text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      t.key === tab
                        ? "font-medium text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-ink"
                        : "text-muted-fg hover:text-ink",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        }
      />
      {tab === "privacy" ? <PrivacySettings /> : <AccountSettings />}
    </div>
  );
}

export default function SettingsPage() {
  // useSearchParams reads the URL on the client, so the page waits behind a boundary.
  return (
    <Suspense fallback={null}>
      <SettingsTabs />
    </Suspense>
  );
}
