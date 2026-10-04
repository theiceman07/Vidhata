import type { Account } from "@/lib/types";
import { MockApiError, randomDelay, shouldSimulateFailure } from "./delay";
import { register, restored } from "./state";

/**
 * The client's own details and its team.
 *
 * A preview, and deliberately small. An invitation sends nothing, and every
 * member has the same access: who may invite or remove, what each person may
 * see, and what happens to the last owner are real organisation and role
 * handling, which is backend work (docs/api-contract.md, section 10.2). Held
 * for this browser tab with the rest of the preview's data.
 */
const accounts = new Map<string, Account>(restored("account"));
register("account", () => [...accounts]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function accountOf(orgId: string): Account {
  const found = accounts.get(orgId);
  if (!found) throw new MockApiError("Account not found.");
  return found;
}

export async function getAccount(orgId: string): Promise<Account> {
  await randomDelay(150, 300);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not load your account.");
  }
  return structuredClone(accountOf(orgId));
}

/**
 * Change the signed-in person's name and email. A name is needed, and an email
 * has to look like one; it is checked against nothing else, because the preview
 * has nothing to check it against. The owner's line on the team follows it.
 */
export async function saveProfile(
  orgId: string,
  profile: { name: string; email: string },
): Promise<Account> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not save your details. Nothing was changed.");
  }
  const account = accountOf(orgId);
  const name = profile.name.trim();
  const email = profile.email.trim();
  if (!name) throw new MockApiError("Your name is needed.");
  if (!EMAIL.test(email)) throw new MockApiError("That does not look like an email address.");
  if (account.members.some((m) => m.status !== "owner" && same(m.email, email))) {
    throw new MockApiError("That address belongs to someone else on your team.");
  }
  account.profile = { name, email };
  const owner = account.members.find((m) => m.status === "owner");
  if (owner) Object.assign(owner, { name, email });
  return structuredClone(account);
}

/**
 * Invite someone by email. Nothing is sent. The same address invited again is
 * the one invitation, so a double click makes one; an address already on the
 * team is refused.
 */
export async function inviteMember(orgId: string, email: string): Promise<Account> {
  await randomDelay(250, 500);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not send the invitation. Nothing was changed.");
  }
  const account = accountOf(orgId);
  const address = email.trim();
  if (!EMAIL.test(address)) throw new MockApiError("That does not look like an email address.");
  const existing = account.members.find((m) => same(m.email, address));
  if (existing) {
    if (existing.status === "invited") return structuredClone(account);
    throw new MockApiError("That person is already on your team.");
  }
  const next = Math.max(0, ...account.members.map((m) => Number(m.id.replace(/\D/g, "")))) + 1;
  account.members.push({ id: `member-${next}`, name: null, email: address, status: "invited" });
  return structuredClone(account);
}

/**
 * Take someone off the team, or withdraw an invitation. The owner cannot be
 * removed. Removing someone who is already gone changes nothing.
 */
export async function removeMember(orgId: string, memberId: string): Promise<Account> {
  await randomDelay(200, 400);
  if (shouldSimulateFailure()) {
    throw new MockApiError("Could not remove this person. Nothing was changed.");
  }
  const account = accountOf(orgId);
  const member = account.members.find((m) => m.id === memberId);
  if (member?.status === "owner") throw new MockApiError("The owner of the account cannot be removed.");
  account.members = account.members.filter((m) => m.id !== memberId);
  return structuredClone(account);
}
