import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccount, inviteMember, removeMember, saveProfile } from "./account";

// The mock layer's failure switch (?fail=1 in a browser), set by a test.
const failure = vi.hoisted(() => ({ on: false }));
vi.mock("./delay", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delay")>();
  return { ...original, shouldSimulateFailure: () => failure.on };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  failure.on = false;
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}
async function refusal(promise: Promise<unknown>): Promise<string> {
  const caught = promise.then(
    () => "",
    (e: Error) => e.message,
  );
  await vi.runAllTimersAsync();
  return caught;
}

const org = "org-anaya-textiles";

describe("the account", () => {
  it("starts as a named owner and one member, with fictional addresses", async () => {
    const account = await settle(getAccount(org));
    expect(account.profile).toEqual({ name: "Meera Shah", email: "meera@anaya-textiles.example" });
    expect(account.members.map((m) => m.status)).toEqual(["owner", "active"]);
    for (const m of account.members) expect(m.email).toMatch(/\.example$/);
  });

  it("is nothing for an organisation that is not there", async () => {
    expect(await refusal(getAccount("org-nobody"))).toBe("Account not found.");
  });

  it("holds no internal id a client should not see", async () => {
    const account = await settle(getAccount(org));
    expect(JSON.stringify(account)).not.toContain(org);
  });
});

describe("saving your details", () => {
  it("keeps what was typed, trimmed, and the owner's line on the team follows it", async () => {
    const saved = await settle(saveProfile(org, { name: "  Meera S. Shah ", email: " meera.shah@anaya-textiles.example " }));
    expect(saved.profile).toEqual({ name: "Meera S. Shah", email: "meera.shah@anaya-textiles.example" });
    expect(saved.members.find((m) => m.status === "owner")).toMatchObject({
      name: "Meera S. Shah",
      email: "meera.shah@anaya-textiles.example",
    });
    expect((await settle(getAccount(org))).profile).toEqual(saved.profile);
  });

  it("needs a name, and an address that looks like one, and changes nothing otherwise", async () => {
    const before = await settle(getAccount(org));
    expect(await refusal(saveProfile(org, { name: "   ", email: "a@b.example" }))).toBe("Your name is needed.");
    for (const email of ["", "meera", "meera@", "@anaya.example", "a b@c.example"]) {
      expect(await refusal(saveProfile(org, { name: "Meera", email })), email).toBe(
        "That does not look like an email address.",
      );
    }
    expect(await settle(getAccount(org))).toEqual(before);
  });

  it("refuses an address that belongs to someone else on the team", async () => {
    expect(
      await refusal(saveProfile(org, { name: "Meera", email: "ROHAN@anaya-textiles.example" })),
    ).toBe("That address belongs to someone else on your team.");
  });

  it("changes nothing when it fails, and works again afterwards", async () => {
    const before = await settle(getAccount(org));
    failure.on = true;
    expect(await refusal(saveProfile(org, { name: "Changed", email: "changed@anaya-textiles.example" }))).toMatch(
      /Nothing was changed/,
    );
    failure.on = false;
    expect(await settle(getAccount(org))).toEqual(before);
    expect((await settle(saveProfile(org, { name: "Changed", email: "changed@anaya-textiles.example" }))).profile.name).toBe(
      "Changed",
    );
  });
});

describe("inviting someone", () => {
  it("records an invitation with no name yet, and sends nothing", async () => {
    const account = await settle(inviteMember(org, "  priya@anaya-textiles.example "));
    const invited = account.members.find((m) => m.email === "priya@anaya-textiles.example")!;
    expect(invited).toMatchObject({ name: null, status: "invited" });
    expect(invited.id).toMatch(/^member-\d+$/);
  });

  it("is one invitation however many times it is pressed, whatever the case", async () => {
    await settle(inviteMember(org, "dev@anaya-textiles.example"));
    const again = await settle(inviteMember(org, "DEV@anaya-textiles.example"));
    expect(again.members.filter((m) => m.email.toLowerCase() === "dev@anaya-textiles.example")).toHaveLength(1);
  });

  it("gives every invitation its own id", async () => {
    await settle(inviteMember(org, "one@anaya-textiles.example"));
    const account = await settle(inviteMember(org, "two@anaya-textiles.example"));
    const ids = account.members.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("refuses an address already on the team, and one that is not an address", async () => {
    expect(await refusal(inviteMember(org, "rohan@anaya-textiles.example"))).toBe("That person is already on your team.");
    expect(await refusal(inviteMember(org, "not an address"))).toBe("That does not look like an email address.");
  });

  it("changes nothing when it fails", async () => {
    const before = await settle(getAccount(org));
    failure.on = true;
    expect(await refusal(inviteMember(org, "late@anaya-textiles.example"))).toMatch(/Nothing was changed/);
    failure.on = false;
    expect(await settle(getAccount(org))).toEqual(before);
  });
});

describe("removing someone", () => {
  it("takes a member off the team, and withdraws an invitation", async () => {
    const invited = (await settle(inviteMember(org, "temp@anaya-textiles.example"))).members.find(
      (m) => m.email === "temp@anaya-textiles.example",
    )!;
    const afterInvite = await settle(removeMember(org, invited.id));
    expect(afterInvite.members.some((m) => m.id === invited.id)).toBe(false);

    const afterMember = await settle(removeMember(org, "member-2"));
    expect(afterMember.members.some((m) => m.email === "rohan@anaya-textiles.example")).toBe(false);
  });

  it("never removes the owner", async () => {
    expect(await refusal(removeMember(org, "member-1"))).toBe("The owner of the account cannot be removed.");
    expect((await settle(getAccount(org))).members.some((m) => m.status === "owner")).toBe(true);
  });

  it("changes nothing for someone who is already gone, however many times it is pressed", async () => {
    const before = await settle(getAccount(org));
    expect(await settle(removeMember(org, "member-999"))).toEqual(before);
  });
});
