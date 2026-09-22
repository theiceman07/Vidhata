// Mock fixture only — never an auth mechanism. Reachable exclusively when
// NEXT_PUBLIC_VIDHATA_PREVIEW_MODE=1 (see app/(public)/login/page.tsx and
// app/(public)/advocate-login/page.tsx). QA 2.1: this used to be a real,
// unconditional credential check shipped in the production bundle.
export const MOCK_PREVIEW_CREDENTIALS = {
  username: "admin",
  password: "admin",
};
