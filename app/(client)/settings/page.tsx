"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccount, inviteMember, removeMember, saveProfile } from "@/lib/api/account";
import { useSession } from "@/lib/session";
import { MOCK_CLIENT_ORG } from "@/lib/mock/client.mock";
import type { Account, TeamMember } from "@/lib/types";

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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

  const load = useCallback(async () => {
    setState("loading");
    try {
      const loaded = await getAccount(MOCK_CLIENT_ORG.id);
      setAccount(loaded);
      setName(loaded.profile.name);
      setEmail(loaded.profile.email);
      setState("loaded");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load your account.");
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
      setProfileProblem(err instanceof Error ? err.message : "Could not save your details.");
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
      setInviteProblem(err instanceof Error ? err.message : "Could not send the invitation.");
    } finally {
      setInviting(false);
    }
  }

  async function remove(member: TeamMember) {
    setRemoving(member.id);
    try {
      setAccount(await removeMember(MOCK_CLIENT_ORG.id, member.id));
      toast.success(member.status === "invited" ? "Invitation withdrawn" : "Removed from the team");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove this person.");
    } finally {
      setRemoving(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="w-full" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-8 h-56 w-full max-w-3xl rounded-card" />
        <Skeleton className="mt-8 h-64 w-full max-w-3xl rounded-card" />
      </div>
    );
  }
  if (state === "error" || !account) {
    return <ErrorState message={errorMessage} onRetry={load} />;
  }

  const profileUnchanged =
    name.trim() === account.profile.name && email.trim() === account.profile.email;

  return (
    <div className="w-full">
      <h1 className="font-display text-h1 text-ink">Settings</h1>
      <p className="mt-2 text-body text-muted-fg">{MOCK_CLIENT_ORG.name}</p>

      <section aria-labelledby="profile-title" className="mt-8 max-w-3xl rounded-card bg-parchment p-6">
        <h2 id="profile-title" className="font-display text-h3 text-ink">
          Your details
        </h2>
        <form onSubmit={save} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
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
              aria-describedby={profileProblem ? "profile-problem" : undefined}
            />
          </div>
          {profileProblem && (
            <p id="profile-problem" role="alert" className="text-meta text-flagged sm:col-span-2">
              {profileProblem}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving || profileUnchanged || name.trim() === ""}>
              {saving ? "Saving" : "Save details"}
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="team-title" className="mt-8 max-w-3xl rounded-card bg-parchment p-6">
        <h2 id="team-title" className="font-display text-h3 text-ink">
          Your team
        </h2>
        <p className="mt-2 max-w-measure text-meta text-muted-fg">
          Everyone here has the same access. Inviting someone sends nothing in the preview.
        </p>

        <ul className="mt-4">
          {account.members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-body text-ink">{member.name ?? member.email}</p>
                {member.name && <p className="truncate text-meta text-muted-fg">{member.email}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-paper px-2.5 py-0.5 text-label text-muted-fg">
                  {STATUS_WORD[member.status]}
                </span>
                {member.status !== "owner" && (
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
                    onClick={() => void remove(member)}
                  >
                    {member.status === "invited" ? "Withdraw" : "Remove"}
                  </Button>
                )}
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
              aria-describedby={inviteProblem ? "invite-problem" : undefined}
            />
            <Button type="submit" variant="outline" disabled={inviting || inviteEmail.trim() === ""}>
              {inviting ? "Inviting" : "Invite"}
            </Button>
          </div>
          {inviteProblem && (
            <p id="invite-problem" role="alert" className="mt-2 text-meta text-flagged">
              {inviteProblem}
            </p>
          )}
        </form>
      </section>

      <section className="mt-8 max-w-3xl rounded-card bg-parchment p-6">
        <dl>
          <Row label="Organisation">{MOCK_CLIENT_ORG.name}</Row>
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
