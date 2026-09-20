// The single client identity the mock layer authenticates as "client"
// (QA 3.5 — every client used to see every tenant's documents). Documents
// are scoped to this org in lib/api/documents.ts. A real backend derives
// the org from the authenticated session, never from a client value.
export const MOCK_CLIENT_ORG = {
  id: "org-anaya-textiles",
  name: "Anaya Textiles Pvt Ltd",
};
