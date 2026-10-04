import type { Account } from "@/lib/types";
import { MOCK_CLIENT_ORG } from "./client.mock";

/**
 * The client organisation's own details and team, as the preview starts. The
 * people are fictional, and the addresses are on a reserved example domain, so
 * none can be a real person's. A preview invitation sends nothing.
 */
export const accountSeed: [string, Account][] = [
  [
    MOCK_CLIENT_ORG.id,
    {
      profile: { name: "Meera Shah", email: "meera@anaya-textiles.example" },
      members: [
        { id: "member-1", name: "Meera Shah", email: "meera@anaya-textiles.example", status: "owner" },
        { id: "member-2", name: "Rohan Iyer", email: "rohan@anaya-textiles.example", status: "active" },
      ],
    },
  ],
];
