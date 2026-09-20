# Security posture of this preview

This is a frontend-only prototype. Read this before treating it as, or
deploying it as, anything more than that.

## What is and isn't real here

- **There is no authentication.** `lib/mock/auth.mock.ts` holds a mock
  credential pair used only when `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE=1` is
  set at build time. With that flag unset (the default), the login forms
  render an "unavailable" state and the credential comparison is not
  reachable in the compiled bundle at all.
- **There is no access control.** `lib/session.tsx` stores a role string
  (`vidhata-preview-role`) in `localStorage`, read by a client-side React
  effect. This is presentation-only — it decides what a component renders,
  never what data is reachable. The Next.js server currently returns the
  same response for every route regardless of this value, because there is
  no server-side authorization layer yet.
- **There is no tenancy enforcement.** `lib/api/documents.ts` scopes the
  mock in-memory store by `orgId` when the client dashboard asks for it,
  but nothing prevents a caller from asking for a different `orgId` — the
  filter is a data-shaping convenience, not a security boundary.
- **There is no persistence.** Everything resets on reload; the "store" in
  `lib/api/documents.ts` is a module-level array in server memory (and
  reset per serverless invocation on Vercel).

## What this means for deployment

Do not point this build at real client, contract or personal data. Do not
treat a deployed instance of this app as access-controlled — anyone who
can reach the URL can reach every route and, once `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE=1`
is set, every mock credential and every mock document.

## Before this goes anywhere near production

1. Replace `lib/mock/auth.mock.ts` and the login pages' credential compare
   with a real server-side identity provider (see `Vidhata_Fix_Plan_v2.md`
   §1.1 for the full remediation plan).
2. Move authorization into `middleware.ts` (doesn't exist yet) and into
   every `lib/api/*` function, keyed off a verified server session — never
   off `lib/session.tsx`'s client role.
3. Enforce `orgId` scoping server-side from the authenticated subject.
4. Stand up real persistence and re-run the full QA matrix, including a
   multi-tenant isolation test and an access-control test with no
   `localStorage` role set at all.

See `Vidhata_Fix_Plan_v2.md` for the complete, file-by-file remediation
plan this preview was built against.
