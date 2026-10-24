import type { Account } from "@/lib/types";
import { MOCK_CLIENT_ORG, MOCK_CLIENT_PERSON } from "./client.mock";

/**
 * The client organisation's own details and team, as the preview starts. The
 * people are fictional, and the addresses are on a reserved example domain, so
 * none can be a real person's. A preview invitation sends nothing.
 */
export const accountSeed: [string, Account][] = [
  [
    MOCK_CLIENT_ORG.id,
    {
      profile: { name: MOCK_CLIENT_PERSON.name, email: MOCK_CLIENT_PERSON.email },
      members: [
        { id: "member-1", name: MOCK_CLIENT_PERSON.name, email: MOCK_CLIENT_PERSON.email, status: "owner" },
        { id: "member-2", name: "Rohan Iyer", email: "rohan@anaya-textiles.example", status: "active" },
      ],
    },
  ],
];
