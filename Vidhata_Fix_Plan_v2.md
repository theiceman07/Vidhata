# Vidhata — Remediation Plan v2

**Source:** `Vidhata_QA_Report_Merged.docx` (compiled 20 Sep 2026; merges the primary QA
report, the earlier automated pass, and the UI change-request notes).
**Supersedes:** `Vidhata_To_Fix_Plan.md` (built from the two older, un-merged docs).
**Codebase state:** verified against working tree at commit `0371469`, branch `main`.

Every item below was checked against real source before being written down. Where the
report's description does not match the current code, that is flagged as
**⚠ Report vs. code**.

Legend: 🔴 Critical · 🟠 Major · 🟡 Minor · 🔵 UX/A11y · 📱 Responsive · 🎨 Brand · 🎯 UI-CR

---

## 0. Standing constraints

These come from `CLAUDE.md` and bind every item below:

- **Frontend only.** No backend exists. Any fix that genuinely needs a server is split
  into an **interim (honest mock)** fix and a **real fix (post-backend)**. Interim fixes
  must never *claim* a capability the app does not have.
- Never call `fetch` in a component — all data access goes through `lib/api/*`.
- Types live in `lib/types.ts`. Do not redeclare shapes inline.
- Tailwind tokens only (`bg-paper`, `text-ink`, `border-line`). No raw hex in JSX.
- Vocabulary: **advocate**, **finding**, **settled**, **sign-off**, **execution checklist**.
- Every list view needs loading, empty and error states.
- Server Components by default; `"use client"` only for interactivity.
- Never invent statute text, section numbers or case names — use `lib/mock` fixtures.

**Verification command set** (run after each phase):

```bash
npm run lint && npm run typecheck && npm run build
```

---

## 1. Issue inventory (34 items)

| # | Sev | Title | Phase |
|---|-----|-------|-------|
| 2.1 | 🔴 | Hard-coded `admin/admin` in public bundle | 1 |
| 2.2 | 🔴 | RBAC is a client-side localStorage flag | 1 |
| 2.3 | 🔴 | `DevRoleSwitcher` shipped to production | 1 |
| 2.4 | 🔴 | "Downloadable execution checklist" (PDF) not implemented | 1 |
| 10.5 | 🎯 | Sign-out control non-functional / absent | 1 |
| 10.2 | 🎯 | Advocate login lands on client dashboard | 1 |
| 3.1 | 🟠 | Sign-off redirects advocate to client login | 2 |
| 3.2 | 🟠 | Pricing tiers fictional — no tier choice, no payment | 2 |
| 3.3 | 🟠 | Wizard drops `durationMonths` / `governingLaw` / `keyTerms` | 2 |
| 3.4 | 🟠 | No sign out in either portal | 2 (with 10.5) |
| 3.5 | 🟠 | Every client sees every tenant's documents | 2 |
| 3.6 | 🟠 | Advocate "Available for new claims" toggle inert | 2 |
| 10.3 | 🎯 | Missing brand logo in header | 3 |
| 10.6 | 🎯 | Weak active-tab indication | 3 |
| 10.7 | 🎯 | Missing Back / Back-to-home navigation | 3 |
| 10.1 | 🎯 | Weak visual hierarchy on Home | 3 |
| 10.4 | 🎯 | "Needs your attention" on wrong dashboard | 3 |
| 4.1 | 🟡 | Identical metadata everywhere; no robots/sitemap | 4 |
| 4.2 | 🟡 | "Needs your attention" omits `pending_review` | 4 |
| 4.3 | 🟡 | Review shortcuts undocumented and unguarded | 4 |
| 4.4 | 🟡 | `?fail=1` QA hook shipped in production | 4 |
| 4.5 | 🟡 | Analysis timer dies on navigate-away | 4 |
| 4.6 | 🟡 | Generic wrong-credential handling; short-password input | 4 |
| 4.7 | 🟡 | Dashboard row not clickable; small touch target | 4 |
| 5.1 | 🔵 | Amber badge contrast below AA | 5 |
| 5.2 | 🔵 | J/K/C shortcuts invisible; C confirms silently | 5 (with 4.3) |
| 5.3 | 🔵 | Dev widget overlaps content | 5 (resolved by 2.3) |
| 5.4 | 🔵 | No `aria-live` for long-running pipeline actions | 5 |
| 6.1 | 📱 | Dashboard table clipped at 390px, no scroll | 6 |
| 6.2 | 📱 | Dev widget covers mobile bottom nav | 6 (resolved by 2.3) |
| 6.3 | ℹ️ | No tablet/landscape audit (informational) | 6 |
| 7.1 | 🎨 | Dev UI on public surfaces (resolved by 2.3) | 7 |
| 7.2 | 🎨 | No terms / privacy / contact | 7 |
| 7.3 | 🎨 | "Priority turnaround" claim unbacked | 7 |

---

# Phase 1 — Deploy gate (nothing ships until these are done)

## 1.1 🔴 2.1 — Hard-coded credentials in the public bundle

- **Verified location:** `lib/mock/auth.mock.ts` exports `DEMO_USERNAME = "admin"` /
  `DEMO_PASSWORD = "admin"`; compared literally in
  `app/(public)/login/page.tsx:22` and `app/(public)/lawyer-login/page.tsx:23`.
  Both pages print `Preview credentials: admin / admin`
  (`login/page.tsx:65`, `lawyer-login/page.tsx:65`).
- **Root cause:** there is no auth. A string compare in a client component is the login.

### Interim fix (frontend-only, honest)
1. In `lib/mock/auth.mock.ts`, rename the export to `MOCK_PREVIEW_CREDENTIALS` and add a
   top-of-file banner comment: *mock fixture, never an auth mechanism*.
2. Gate the credential path behind a build-time flag,
   `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE`. When the flag is not `"1"`:
   - the compare path is not reachable, and
   - both login forms render a "Sign-in is not yet available" state instead of a form.
   This is the only honest way to keep a demo working while making a production build
   refuse to authenticate anyone.
3. Delete both `Preview credentials: admin / admin` lines from the UI. If the demo needs
   the hint, render it *only* when the preview flag is on, and word it as
   *"Demo preview — not a real account."*
4. Remove `placeholder="admin"` from the username input (`login/page.tsx:46`).

### Real fix (post-backend)
Server-side identity provider; credentials validated in a route handler / server action;
session as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. No credential value of any
kind in a client bundle.

### Acceptance criteria
- `grep -rn "admin" .next/static` on a production build returns no credential literal.
- With the preview flag unset, `npm run build` output contains no `"admin"` comparison
  and `/login` renders the unavailable state.
- No UI copy anywhere advertises credentials.

---

## 1.2 🔴 2.2 — RBAC is a browser-local flag

- **Verified location:** `lib/session.tsx` stores role under `vidhata-mock-role` in
  `localStorage`; guards in `app/(client)/layout.tsx` and `app/(lawyer)/layout.tsx` are
  `useEffect` redirects only.
- **Root cause:** authorization is presentation state. The server returns a 200 shell for
  every protected route.

### Interim fix
1. **Do not pretend to fix this.** Rename the storage key to `vidhata-preview-role` and
   add an explicit comment block in `lib/session.tsx`: *presentation-only; carries no
   authority; must be replaced by a server session.*
2. Make the guard fail closed on first paint: the layouts already return `null` on
   mismatch — keep that, but replace the `null` with a small skeleton so the redirect is
   not a blank flash.
3. Add an in-repo `SECURITY-PREVIEW.md` stating the app has no access control, and link it
   from `README`, so no one mistakes the preview for a gated environment.
4. Audit `lib/mock/documents.mock.ts` for anything resembling real party names or figures
   — nothing in the fixtures should be sensitive if leaked.

### Real fix (post-backend)
- Session cookie verified in `middleware.ts` for `/dashboard`, `/new`, `/documents/*`,
  `/queue`, `/profile`, `/review/*`.
- Every `lib/api/*` call authorizes server-side against the session subject, not a
  client-supplied role.
- Client role state becomes a *hint for rendering*, never a gate.

### Acceptance criteria
- Setting `localStorage` by hand grants no data that isn't already public fixture data.
- `SECURITY-PREVIEW.md` exists and is linked from `README`.
- Post-backend: an unauthenticated request to `/queue` returns a redirect from
  middleware, not a 200 HTML shell.

---

## 1.3 🔴 2.3 — `DevRoleSwitcher` in production (also fixes 5.3, 6.2, 7.1)

- **Verified location:** rendered unconditionally in `app/layout.tsx:44`; component at
  `components/shared/dev-role-switcher.tsx`, `fixed bottom-4 right-4 z-50`. Mobile bottom
  nav is `z-40` (`components/shared/client-shell-nav.tsx:57`) — hence the overlap in 6.2.

### Fix
1. Gate the render:
   ```tsx
   {process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE === "1" && <DevRoleSwitcher />}
   ```
   A literal `process.env.NEXT_PUBLIC_*` comparison is statically replaced at build time,
   so the component tree-shakes out of a production bundle entirely.
2. Never render it on public routes (`/`, `/pricing`, `/login`, `/lawyer-login`) even in
   preview mode — move the render out of the root layout into the two portal layouts.
3. This is **not** a substitute for real sign-out — see 1.5.

### Acceptance criteria
- Production build: `grep -rn "Dev role" .next/static` returns nothing.
- Landing, pricing and both login pages show no floating widget in any environment.
- At 390×844 nothing overlays the bottom nav (6.2 closed).
- No content occlusion at 1400×900 (5.3 closed); no dev nomenclature on marketing
  surfaces (7.1 closed).

---

## 1.4 🔴 2.4 — "Downloadable execution checklist" does not exist

- **Verified location:** `app/(client)/documents/[id]/checklist/page.tsx:79` fires
  `toast.info("PDF export isn't available in this preview.")`. The promise appears in
  `app/(public)/login/page.tsx:34` panel copy ("download your execution checklist") and on
  the document detail page.

### Fix — do **A** (preferred) and **B** regardless

**A. Implement print-to-PDF (real, shippable, no backend).**
1. Add an `@media print` section in `app/globals.css`: hide nav, the toaster and all
   buttons; force `bg-paper`/`text-ink`; `break-inside: avoid` on checklist steps.
2. Add a print view for `/documents/[id]/checklist` rendering the settled clause text, the
   execution checklist, the advocate sign-off record (name, bar number, timestamp) and a
   "generated on" line.
3. Replace the toast with `window.print()`. Relabel the control **"Download / print
   checklist"** so the affordance matches reality.
4. Do the same for the settled document text so the detail page's claim ("available in the
   downloadable PDF") becomes true.

**B. Make the copy honest until A lands.**
- Remove "download your execution checklist" from login panel copy.
- Remove "is available in the downloadable PDF" from the document detail page.

### Acceptance criteria
- Clicking the control opens the print dialog; the resulting PDF contains the full
  checklist, legible (no dark-on-dark, no clipped columns).
- No screen promises a download that does not happen.
- Sign-off attribution appears on the printed artefact — ties to the CLAUDE.md rule that
  no document reaches a client without a recorded advocate sign-off.

---

## 1.5 🎯 10.5 + partial 3.4 — Sign-out must exist and work

- **Verified location:** the only sign-out is inside the dev widget
  (`components/shared/dev-role-switcher.tsx:36`). Removing the widget in 1.3 **deletes the
  only logout in the app**, so this is a hard dependency of 1.3 and must ship in the same
  change.

### Fix
1. Add `signOut()` to the session context in `lib/session.tsx`: clear state, remove the
   storage key, and let the caller navigate.
2. Client portal: add a sign-out control at the foot of the desktop sidebar in
   `components/shared/client-shell-nav.tsx` and in the mobile header bar (not the bottom
   nav — that stays two-up).
3. Advocate portal: same in `components/shared/lawyer-shell-nav.tsx`.
4. On activation: clear session → `router.replace("/")` → `toast.success("Signed out.")`
   — this satisfies 10.5's "clear feedback" requirement.
5. Use the icon **plus** a visible "Sign out" label. An icon alone reads as decorative,
   which is part of why 10.5 reported it as non-functional.

### Acceptance criteria
- Sign out is reachable in both portals, desktop and mobile, without the dev widget.
- After sign-out, navigating back to `/dashboard` or `/queue` redirects to the
  corresponding login.
- A toast confirms the action.

---

## 1.6 🎯 10.2 — Advocate login routes to the client dashboard

**⚠ Report vs. code:** the advocate login page already does
`setRole("lawyer"); router.push("/queue")` (`app/(public)/lawyer-login/page.tsx:24-25`).
The reported symptom is one of two real defects, both of which must be fixed:

1. **Stale role collision.** If `localStorage` already holds `client`, or the user hits a
   `(client)` route first, the `(client)` guard redirects to `/login` — the advocate sees
   the *client* login screen and reports "advocate login sent me to the client side".
   Same root cause as **2.1** below.
2. **Discoverability.** "Advocate login" is buried in the landing footer (`app/page.tsx:44`)
   while "Client login" sits in the header (`app/page.tsx:18`). A user clicking the
   prominent header link lands on the client portal and reports the advocate route as
   broken.

### Fix
1. Promote **Advocate login** to the landing header next to Client login (keep the footer
   link too), so the two portals are visibly peer entry points.
2. On successful advocate sign-in, call `setRole("lawyer")` *before* navigation and ensure
   any stale client role is cleared (`setRole` already overwrites — add a test).
3. Fix the cross-portal redirect target in 2.1 so a role mismatch never dumps an advocate
   on the client login screen.

### Acceptance criteria
- From a clean browser *and* from a browser holding a stale `client` role, signing in at
  `/lawyer-login` lands on `/queue` every time.
- Both portal entry points are visible above the fold on `/`.

---

**Phase 1 exit gate:** lint/typecheck/build clean; production bundle contains no credential
literal and no dev widget; sign-out works in both portals; PDF/print either works or is no
longer promised.

---

# Phase 2 — Core journey repair

## 2.1 🟠 3.1 — Sign-off dead-ends the advocate on the client login page

- **Verified location:** `app/(lawyer)/review/[id]/sign-off/page.tsx:93` →
  `router.push(\`/documents/${doc.id}/checklist\`)`. That path is inside the `(client)`
  route group, whose layout guard immediately `router.replace("/login")`s a `lawyer` role.

### Fix
1. Replace the navigation with an **advocate-side success state**: keep the advocate on
   the sign-off route and render a confirmation panel showing document title, findings
   adjudicated, settled timestamp and the advocate's own name / bar number.
2. Primary action: **Back to queue** (`/queue`). Secondary: **Sign off another** when the
   queue is non-empty.
3. Fire `toast.success("Sign-off recorded. The client can now view the settled document.")`
4. **Harden the guards generally:** when the role is present but *wrong* (a lawyer on a
   client route), redirect to that role's own home (`/queue`) rather than `/login`. Only a
   *missing* role should go to a login page. Apply in both `app/(client)/layout.tsx` and
   `app/(lawyer)/layout.tsx`. This also closes 1.6's symptom 1.
5. **Client-side signal:** on the client dashboard, surface newly `settled` documents (see
   3.5) so sign-off is visible to the client, not just a silent status change.

### Acceptance criteria
- Adjudicate all findings on `doc-msa-pending` → sign off → advocate sees a success panel
  at an advocate-owned URL, never `/login`.
- A lawyer navigating to `/documents/x/checklist` lands on `/queue`, not `/login`.
- The client dashboard visibly reflects the new `settled` state.

---

## 2.2 🟠 3.2 — Pricing and tiers are fictional

- **Verified location:** `IntakeInput` in `lib/api/documents.ts` has no `tier` field;
  `createDraftDocument` hard-codes `tier: "standard"`; `completeAnalysis` unconditionally
  sets `doc.tier = "enhanced"`. `/pricing` renders three tiers via
  `components/marketing/pricing-table.tsx` with no purchase path. "Senior review" is
  unreachable.

### Interim fix (frontend-only)
1. **Add tier selection to the wizard.** A new step (or a field in step 1) offering
   Standard / Enhanced / Senior review, defaulting to Standard. Extend `IntakeInput` and
   document creation to carry the chosen `tier`.
2. **Stop the silent upgrade.** `completeAnalysis` must preserve `doc.tier` rather than
   forcing `"enhanced"`.
3. **Surface the tier** on the document detail page and the dashboard row so the user can
   see what they selected.
4. **Do not fake payment.** On the pricing page, replace each tier CTA with "Start a deal"
   plus a clearly worded line: *"Billing is not enabled in this preview — no payment is
   taken."* Update the FAQ entry about switching tiers to describe the actual behaviour
   (tier chosen at intake; switching not yet supported).
5. **Alternative** if the commercial story isn't settled: downgrade `/pricing` to an
   explainer without purchasable tiers until checkout exists. Choose one — do not leave
   three priced tiers with no path to buy them.

### Real fix (post-backend)
Checkout (UPI / card / invoice), order record, tier locked to a paid order, tier-aware
routing so "Senior review" actually routes to a senior advocate, and a tier-change flow
matching the FAQ.

### Acceptance criteria
- A deal created at "Senior review" still reads "Senior review" after analysis completes.
- No page offers a price without either a working purchase path or an explicit
  "billing not enabled" disclosure.

---

## 2.3 🟠 3.3 — The wizard silently discards deal facts

- **Verified location:** the schema collects `durationMonths`
  (`components/domain/intake-wizard.tsx:35`), `governingLaw` (`:37`) and `keyTerms`
  (`:38`), and the inputs render at `:238`, `:274`, `:291` — but `IntakeInput` in
  `lib/api/documents.ts` has no such fields, so `createDraftDocument` never receives them.

### Fix
1. Add `durationMonths: number`, `governingLaw: string`, `keyTerms?: string` to
   `ContractDocument` in `lib/types.ts` — **not** inline (CLAUDE.md rule).
2. Extend `IntakeInput` and `createDraftDocument` to persist all three.
3. Backfill the fixtures in `lib/mock/documents.mock.ts` so every seeded document has the
   new fields — keeps the types honest and avoids optional-everything drift.
4. **Render them.** Add a "Deal brief" block on the document detail page showing duration,
   governing law and key terms alongside the existing party / value / state facts. If a
   field is empty, show an explicit "Not specified" rather than omitting the row.
5. Use `governingLaw` in `buildExecutionSteps` reasoning text where genuinely relevant —
   reuse existing fixture language only; do not invent statute.

### Acceptance criteria
- Create a deal with duration 12, governing law "Laws of India", key terms "exclusivity 24
  months, renewal automatic" → all three appear on the resulting document detail page.
- `npm run typecheck` passes with the new required fields across all fixtures.

---

## 2.4 🟠 3.4 — No sign out in either portal

Delivered in **1.5**. Listed for traceability; re-verify after the Phase 3 nav changes,
since those components are edited twice.

---

## 2.5 🟠 3.5 — Every client sees every tenant's documents

- **Verified location:** `listDocuments()` in `lib/api/documents.ts` returns the entire
  store unfiltered; the dashboard renders all of it. Fixtures span Anaya Textiles, Bharosa
  Fintech, Trivandrum Cloud Labs and an individual.

### Interim fix
1. Introduce a mock client identity in `lib/mock/` (e.g. `MOCK_CLIENT_ORG` with an `orgId`
   and display name) and give every fixture document an `orgId` in `lib/types.ts` +
   `documents.mock.ts`.
2. `listDocuments()` takes an `orgId` argument and filters on it; the dashboard passes the
   session's org. **Scope it in the data layer, not in the component** — a component-level
   `.filter()` is the exact mistake that becomes a real leak later.
3. Keep at least two orgs in the fixtures so isolation is demonstrable; add a second
   preview identity if the demo needs to show both.
4. The advocate queue is intentionally cross-org and stays unfiltered — say so in a
   comment so it isn't "fixed" by mistake.

### Real fix (post-backend)
Tenant scoping enforced in the query by the server from the session subject, never from a
client-supplied org id. Add multi-tenant isolation tests.

### Acceptance criteria
- The client dashboard shows only that org's documents.
- Switching preview identity changes the document set.
- The filter lives in `lib/api/documents.ts`; no org `.filter()` in any component.

---

## 2.6 🟠 3.6 — Advocate availability toggle is decorative

- **Verified location:** `app/(lawyer)/profile/page.tsx` — local `useState` only; the queue
  filters by status and advocate id alone.

### Interim fix
1. Move availability into the advocate record in `lib/mock/advocate.mock.ts` and expose
   `setAdvocateAvailability()` through a new `lib/api/advocate.ts`, so it persists for the
   tab like every other mutation.
2. Make it *mean* something: when unavailable, disable the **Claim** action in the queue
   and show an inline explanation ("You're marked unavailable for new claims — update in
   Profile"). Honest and implementable with no backend.
3. **Declared conflicts:** either (a) implement add/remove of a conflict entry against the
   mock advocate record, or (b) if out of scope now, replace the permanently empty section
   with an explicit empty state ("No conflicts declared — conflict management arrives with
   advocate onboarding"). Do not leave a blank panel implying a capability.

### Real fix (post-backend)
Availability and conflicts persisted per advocate, enforced in queue routing, auditable for
compliance.

### Acceptance criteria
- Toggling availability off survives navigation within the tab.
- With availability off, Claim is unavailable and the reason is stated.
- The conflicts section either works or states plainly that it doesn't yet.

---

**Phase 2 exit gate:** every main journey completes without a dead end — create a deal (all
facts retained, tier respected) → analyse → advocate claims → adjudicates → signs off →
advocate sees success and returns to queue → client sees the settled document scoped to
their org → prints the checklist → signs out.

---

# Phase 3 — Navigation, IA and visual hierarchy (UI change requests)

## 3.1 🎯 10.3 — Brand logo in the header

- **Verified:** the header/nav renders the wordmark "Vidhata" as plain text
  (`app/page.tsx:13`, `components/shared/client-shell-nav.tsx:26`,
  `components/shared/lawyer-shell-nav.tsx:18`) — there is no logo mark.

### Fix
1. Create `components/shared/brand-logo.tsx` — mark + wordmark, sized by prop, brand tokens
   only. One place where the identity is defined.
2. Use an inline SVG mark: no raster dependency, theme-safe, crisp at any size. Existing
   `/public/icon.png` continues to back the favicon.
3. Replace all four wordmark call sites with `<BrandLogo />`, each wrapped in a `Link` to
   the role-appropriate home (`/` public, `/dashboard` client, `/queue` advocate).
4. The public header is currently a bare `<span>` — make it a link to `/` (also serves 3.3).

### Acceptance criteria
- The logo appears in the public header and both portal navs (desktop and mobile), is
  keyboard-focusable, has an accessible name, and renders identically across all four.

---

## 3.2 🎯 10.6 — Active tab lacks prominence

- **Verified:** the client nav uses `bg-brand text-brand-fg` on desktop
  (`client-shell-nav.tsx:36`) but mobile uses only `text-brand` vs `text-muted-fg`
  (`client-shell-nav.tsx:63`) — a colour-only distinction, which is both weak and an
  accessibility failure (colour as sole carrier of meaning).

### Fix
1. Mobile bottom nav: add a non-colour indicator — a 2px top border, or a pill behind the
   icon on the active item — plus a font-weight step.
2. Add `aria-current="page"` to the active link in **both** nav components (absent in both
   today). This is the accessible equivalent of the visual state.
3. Desktop advocate nav: match the client nav's treatment so the portals are consistent.
4. 10.6 also asks that placement "fit more naturally in the hierarchy" — align both portals
   on one pattern: brand at top, primary links, sign-out pinned to the foot. Today the
   advocate nav is a horizontal bar on mobile while the client nav is a bottom tab bar;
   unify to the client pattern.

### Acceptance criteria
- Active state is conveyed by at least two channels (colour + weight/shape).
- `aria-current="page"` present on the active item in both portals.
- Both portals share one navigation structure.

---

## 3.3 🎯 10.7 — Missing Back / Back-to-home navigation

- **Verified:** `components/shared/page-header.tsx` exists, but secondary screens
  (`/documents/[id]`, `/documents/[id]/checklist`, `/documents/[id]/chat`, `/review/[id]`,
  `/review/[id]/sign-off`, `/new`) have no consistent back affordance.

### Fix
1. Extend `PageHeader` with optional `backHref` + `backLabel`, rendering a left-aligned
   back link with a chevron above the title.
2. Apply to every secondary screen with a **semantic parent**, not `router.back()`:
   - `/documents/[id]` → Dashboard
   - `/documents/[id]/checklist` → that document
   - `/documents/[id]/chat` → that document
   - `/review/[id]` → Queue
   - `/review/[id]/sign-off` → that review
   - `/new` → Dashboard

   Semantic parents are correct where history is not — e.g. after the sign-off redirect fix
   in 2.1.
3. Public pages: the logo links home (3.1); `/pricing` gets a back-to-home link.
4. Add `not-found.tsx` and `error.tsx` at the app root, each with a route home. The
   report's "dead-end screens" concern applies most sharply to error states.

### Acceptance criteria
- Every non-root screen has a visible route to its parent without browser chrome.
- 404 and error boundaries offer a way home.

---

## 3.4 🎯 10.1 — Home page visual hierarchy and whitespace

- **Verified:** `app/page.tsx` is Hero → FeatureGrid → IndiaChecks → LogoCloud → CTA, all
  inside `max-w-4xl` (896px) on a 1400px viewport — that is the source of the reported dead
  space.

### Fix
1. Widen the content shell to `max-w-6xl` for full-bleed sections (hero, feature grid, logo
   cloud) while keeping prose at a readable measure (~65ch). The fix is *not* "add more
   stuff" — it is using the width the design already implies.
2. Strengthen vertical rhythm: alternate `bg-paper` / `bg-canvas` section backgrounds so the
   page reads as distinct chapters rather than one long column.
3. Raise the hero's primary CTA prominence and add a secondary "See how it works" anchor to
   the feature grid, so the fold directs attention to one primary action.
4. Add one genuinely useful section rather than filler: a three-step **How it works**
   (describe the deal → AI drafts and the seven-layer pipeline screens it → advocate signs
   off and you get your execution checklist). That is the product's actual story and it is
   currently missing from the landing page.
5. Keep brand constraints: Cormorant Infant for headlines only, Outfit for body, tokens
   only.

### Acceptance criteria
- At 1400×900 no section has more than ~25% unused horizontal space.
- One unambiguous primary CTA above the fold.
- Both portal entry points visible in the header (also serves 1.6).

---

## 3.5 🎯 10.4 + 🟡 4.2 — "Needs your attention" placement and correctness

- **Verified:** `app/(client)/dashboard/page.tsx:77` counts only `revision` and `draft`;
  rendered as a StatCard at `:97`.

**⚠ Judgement call:** 10.4 says move the section to the advocate dashboard; 4.2 says fix its
client-side maths. These are not contradictory once the two audiences are separated —
implement both.

### Fix
1. **Client dashboard:** keep a client metric but count what the *client* can act on —
   `revision` (client must respond) and `draft` (client must submit). Explicitly **exclude**
   `pending_review`: the client can do nothing about it. Relabel to **"Awaiting your
   response"** so the number matches the words. This resolves 4.2's "misleading metric"
   complaint without pretending the client can act on an advocate's queue.
2. Add a separate, non-actionable client stat — **"With your advocate"** — counting
   `pending_review` + `under_review`, so the status is visible without implying action.
3. **Advocate surface:** add the real "Needs your attention" panel 10.4 asks for —
   unclaimed `pending_review` documents, plus the advocate's own `under_review` documents
   with pending findings. That is where the phrase is genuinely meaningful.

### Acceptance criteria
- No client-facing count includes a status the client cannot act on.
- Every stat label matches the statuses it counts.
- The advocate surface has an attention panel derived from real queue state.

---

# Phase 4 — Minor defects and hygiene

## 4.1 🟡 4.1 — Metadata, robots.txt, sitemap.xml

- **Verified:** a single `metadata` export at `app/layout.tsx:23`; no robots or sitemap
  files in the repo.

### Fix
1. Export route-level `metadata` from every public route — `/`, `/pricing`, `/login`,
   `/lawyer-login` — with a unique `title` and `description` each.
2. Add `metadataBase`, an OpenGraph/Twitter block, and a shared title template
   (`%s · Vidhata`) in the root layout.
3. Add `app/robots.ts` and `app/sitemap.ts` (Next 14 file conventions — typed, no static
   files to drift). **Disallow** the portal routes (`/dashboard`, `/documents`, `/queue`,
   `/review`, `/profile`, `/new`); list only marketing pages in the sitemap.
4. Portal routes carry client data — mark them `robots: { index: false }`.

### Acceptance criteria
- Each public route returns a distinct `<title>` and description.
- `/robots.txt` and `/sitemap.xml` return 200 with correct contents.
- No authenticated route is indexable.

---

## 4.2 🟡 4.2 — Attention metric

Delivered in **3.5**.

---

## 4.3 🟡 4.3 + 🔵 5.2 — Review keyboard shortcuts

- **Verified:** `app/(lawyer)/review/[id]/page.tsx:129` guards on `["INPUT","TEXTAREA"]`
  tagName only; `j`/`k` at `:132-133`; the confirm at `:134`.

### Fix
1. **Harden the guard.** Replace the tagName check with a predicate that also ignores:
   - `isContentEditable` nodes,
   - `SELECT` elements,
   - anything inside an open Radix layer
     (`closest('[role="dialog"], [role="listbox"], [data-radix-popper-content-wrapper]')`),
   - any event with `ctrlKey` / `metaKey` / `altKey` set.
2. **Make `C` safe.** Confirming an adjudication with one keystroke and no undo is the
   actual risk. Either require a confirm step, or — better — keep the single keystroke and
   add an **undo affordance** in the success toast ("Finding confirmed · Undo"), backed by
   an `updateFinding` call reverting to `pending`. Undo beats a modal here because
   advocates confirm findings in rapid succession.
3. **Make them discoverable (5.2).** Add a keyboard-hint line in the review page header
   ("J / K to move between findings · C to confirm") and a `?` shortcut opening a small
   shortcuts dialog. Render hints as `<kbd>` elements.
4. Ensure the finding list is keyboard-navigable *without* the shortcuts (focus moves,
   visible focus ring) — shortcuts are an accelerator, not the only path.

### Acceptance criteria
- Typing `c` in an open severity `Select`, a dialog, or a contenteditable does not confirm a
  finding.
- Every confirm is undoable from the toast.
- The shortcuts are documented on screen.

---

## 4.4 🟡 4.4 — `?fail=1` hook in production

- **Verified:** `lib/api/delay.ts` — `shouldSimulateFailure()` reads
  `window.location.search` unconditionally in every environment.

### Fix
```ts
export function shouldSimulateFailure(): boolean {
  if (process.env.NEXT_PUBLIC_VIDHATA_PREVIEW_MODE !== "1") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("fail") === "1";
}
```
The literal env comparison is inlined at build time, so the branch is dead-code-eliminated
in production. **Keep** the hook in preview — it is the only way to exercise the error
states that the CLAUDE.md conventions require every list view to have.

### Acceptance criteria
- `?fail=1` has no effect on a production build.
- `?fail=1` still drives every error state in preview mode.

---

## 4.5 🟡 4.5 — Analysis stalls when the user navigates away

- **Verified:** the pipeline timer lives in the document detail page and is cleared on
  unmount; `completeAnalysis` is only ever called by that timer. The seeded
  `doc-employment-analysing` fixture is stuck permanently.

### Interim fix
1. Move the timer out of the component into a module-scoped scheduler in
   `lib/api/documents.ts` (or a small `lib/api/analysis.ts`): `startAnalysis` schedules
   completion against the in-memory store and records an `analysisCompletesAt` timestamp on
   the document. The timer is no longer owned by a React lifecycle.
2. `getDocument` / `listDocuments` reconcile on read: if `status === "analysing"` and
   `analysisCompletesAt` has passed, complete it before returning. This makes the state
   durable across navigation *and* for a component that was never mounted — the same shape a
   real job queue has.
3. Seed `doc-employment-analysing` with a timestamp already in the past so it resolves on
   first read instead of sitting stuck forever.
4. The detail page's ticker becomes a view over `analysisCompletesAt`, not the source of
   truth.

### Real fix (post-backend)
Server-side job; client polls or subscribes. The read-time reconciliation above keeps the
API shape, so the swap stays contained.

### Acceptance criteria
- Start an analysis, navigate to the dashboard, wait, return — the document is
  `pending_review`.
- No seeded document remains permanently in `analysing`.

---

## 4.6 🟡 4.6 — Wrong-credential handling and short-password input

- **Verified:** `app/(public)/login/page.tsx:28` sets a single generic string; no attempt
  tracking anywhere.

### Fix
1. **Investigate the single-character password report first — do not fix blind.** The inputs
   are controlled (`value`/`onChange`), so a one-character value *should* register.
   Reproduce at `/login` with password `a` and determine whether the failure is input
   handling or simply a wrong credential. If it reproduces, inspect
   `components/ui/input.tsx` for anything swallowing the first keystroke, and rule out a
   password manager overlaying the field. **Record the finding either way** — a "fix" with
   no reproduced defect is worse than none.
2. Improve the error surface: keep the message non-enumerating ("Invalid username or
   password" is correct security practice — do not make it more specific), but add
   `role="alert"` and `aria-live="polite"` so it is announced, and associate it with the
   form via `aria-describedby`.
3. Add client-side attempt throttling as an *interim honesty measure*: after 5 failed
   attempts, disable submit for 30 seconds with a visible countdown. State plainly in a
   comment that client-side throttling is not a security control — it is UX until
   server-side lockout exists.
4. Clear the password field on failure; keep the username.

### Real fix (post-backend)
Server-side rate limiting, progressive delay, account lockout, audit log of attempts.

### Acceptance criteria
- The single-character case is reproduced-and-fixed, or documented as not-reproducible with
  evidence.
- Errors are announced to screen readers.
- Rapid repeated failures are throttled with visible feedback.

---

## 4.7 🟡 4.7 — Dashboard row interaction

- **Verified:** dashboard table at `app/(client)/dashboard/page.tsx:112` — only the View
  control navigates.

### Fix
1. Make the **document title a link** to the document — the accessible, standard pattern.
   This beats a click handler on `<tr>`, which breaks keyboard navigation and
   middle-click-to-new-tab.
2. Keep the explicit View control but raise its hit area to ≥44×44px at mobile widths.
3. Add a hover / `focus-visible` row highlight so the affordance reads.
4. Do **not** add an `onClick` to the row — that produces an element that is clickable but
   not focusable, a worse accessibility outcome than today.

### Acceptance criteria
- Title and View both navigate, both keyboard-reachable, both support open-in-new-tab.
- Touch targets ≥44px at 390px width.

---

# Phase 5 — Accessibility and UX

## 5.1 🔵 5.1 — Amber badge contrast below WCAG AA

- **Verified:** `caution: '#B4741C'` at `tailwind.config.ts:20`, used as
  `bg-caution/15 text-caution` on `pending_review` and `revision` in
  `components/domain/status-badge.tsx`. Measured ~3.1–3.3:1 — below the 4.5:1 AA floor for
  13–14px text.

### Fix
1. Add a dedicated foreground token rather than darkening `caution` globally (the same value
   is used for non-text decoration where the hue is correct):
   ```ts
   caution: { DEFAULT: '#B4741C', fg: '#7A4E0D' }  // fg meets AA on caution/15
   ```
2. The badge becomes `bg-caution/15 text-caution-fg`.
3. **Re-measure the other two while you're there.** The report says verified `#2F7A4B` and
   flagged `#B3311D` pass — verify against their actual `/15` backgrounds over `bg-paper`,
   not against white, and add `-fg` variants if either is marginal.
4. Never rely on colour alone: the badges already carry text labels — keep that, and confirm
   `components/domain/severity-pill.tsx` and `components/domain/citation-badge.tsx` do the
   same.
5. Record the measured ratios in a comment beside the tokens so the next change doesn't
   silently regress them.

### Acceptance criteria
- Every status badge measures ≥4.5:1 in DevTools at its rendered size.
- Semantic colours stay semantic (CLAUDE.md: status colours are never decorative).

---

## 5.2 🔵 5.2 — Shortcut discoverability

Delivered in **4.3**.

---

## 5.3 🔵 5.3 — Dev widget occlusion

Resolved by **1.3**. Re-verify at 1400×900 after Phase 1.

---

## 5.4 🔵 5.4 — No live-region announcements for long operations

- **Verified:** the pipeline elapsed-time ticker and the claim/sign-off flows have no
  `aria-live` wrapper.

### Fix
1. Wrap the pipeline status line in `components/domain/pipeline-progress.tsx` in
   `role="status" aria-live="polite" aria-atomic="true"`.
2. **Do not announce every tick** — a per-second ticker in a live region is an accessibility
   failure of its own (constant interruption). Announce *state transitions* only: "Analysis
   started", "Layer 4 of 7", "Analysis complete — 3 findings". Keep the visual ticker
   outside the live region with `aria-hidden`.
3. Add announcements for claim, adjudication save, sign-off and checklist toggles. Confirm
   the `sonner` Toaster (`components/ui/sonner.tsx`) announces — if not, pair each toast
   with a visually-hidden live region.
4. Add `aria-busy` to regions being loaded, alongside the existing skeletons.

### Acceptance criteria
- A screen reader announces start, meaningful progress and completion of a ~28s analysis
  without reading every second.
- Claim, sign-off and adjudication produce an announced confirmation.

---

# Phase 6 — Responsive

## 6.1 📱 6.1 — Dashboard table clipped at 390px

- **Verified:** the wrapper at `app/(client)/dashboard/page.tsx:112` is
  `overflow-hidden rounded-card border border-line bg-paper shadow-card` — `overflow-hidden`
  with no `overflow-x-auto` is exactly the reported clip (512px table in a 356px box).

### Fix — choose the card pattern, not just a scrollbar
1. **Preferred:** below `md`, stop rendering a table. Render each document as a stacked card
   (title, status badge, counterparty, created, View). A six-column table at 390px is
   unreadable even when it scrolls.
2. **Minimum:** keep the table and change the wrapper to `overflow-x-auto`, moving the
   rounded border to an inner element so the radius survives, plus `min-w-[512px]` on the
   table and a scroll-shadow hint.
3. Audit other tables and wide grids for the same `overflow-hidden` wrapper — the queue and
   review screens use similar card wrappers.

### Acceptance criteria
- At 390×844 every column of every row is reachable and readable; nothing is clipped.
- Touch targets ≥44px (ties to 4.7).

---

## 6.2 📱 6.2 — Dev widget over the mobile bottom nav

Resolved by **1.3** (widget removed from production and from public routes). Re-verify
geometry at 390×844: the bottom nav `z-40` must be the topmost fixed element.

---

## 6.3 ℹ️ 6.3 — Tablet/landscape audit not performed

Not a defect — an untested range. **Action:** run an explicit pass at 768×1024 and 1024×768
across queue, review, checklist and dashboard after Phases 3 and 6 land, and record the
result. Add both viewports to the standing QA matrix so this doesn't stay a blind spot.

---

# Phase 7 — Brand and compliance

## 7.1 🎨 7.1 — Dev UI on public surfaces

Resolved by **1.3**.

---

## 7.2 🎨 7.2 — No terms, privacy or contact

- **Verified:** `app/page.tsx:41` footer contains only a tagline and the advocate-login
  link. No legal routes exist.

### Fix
1. Build a shared footer (`components/marketing/site-footer.tsx`) used by `/` and
   `/pricing`: Terms of Service · Privacy Policy · Contact · Advocate login · copyright.
2. Add `/terms`, `/privacy` and `/contact` routes.
3. **Do not draft the legal text.** These are a legal-services company's own terms and
   privacy notice; they must be written or approved by a qualified person. Ship the routes
   with a clearly-marked placeholder and a named owner, or hold the pages until the copy
   exists. Publishing invented terms on a legal product is a worse failure than having none.
4. Contact can ship immediately with a real email address and an expected response time.
5. Given the product handles contract data, plan for: a data-retention statement, an
   advocate-empanelment disclosure, and an explicit "this is not legal advice from Vidhata;
   your advocate's sign-off is the legal act" notice — the last directly supports the
   CLAUDE.md rule that the chat agent never gives advice.

### Acceptance criteria
- Footer links present on every public page.
- Each route resolves (no 404) and is either real copy or explicitly marked pending with a
  named owner.

---

## 7.3 🎨 7.3 — "Priority turnaround" is unbacked

- **Verified:** `components/marketing/pricing-table.tsx` lists the claim; the queue has no
  priority ordering.

### Fix — pick one, do not leave it as is
- **(a)** Implement it: derive `priority` from tier on the document, sort the advocate queue
  by priority then age, and show a priority marker on queue rows.
- **(b)** Remove the claim from the pricing table until (a) ships.

**Recommendation: (a)** — a small change in `lib/api/documents.ts` plus the queue sort, and
it makes the tier work from 2.2 meaningful. Audit every other pricing claim in the same
pass; the "fixed transparent price" claim depends on 2.2 landing.

### Acceptance criteria
- Every line in the pricing feature table maps to observable behaviour, or is removed.

---

# 8. Sequencing and dependencies

```
Phase 1  1.3 (remove dev widget) ──requires──> 1.5 (real sign-out)    [same change]
         1.1 (credentials) ──shares flag with──> 1.3, 4.4             [NEXT_PUBLIC_VIDHATA_PREVIEW_MODE]
         1.6 (advocate login) ──depends on──> 2.1 (guard redirect fix)
Phase 2  2.3 (wizard fields) ──touches lib/types.ts──> 2.2 (tier), 2.5 (orgId)
         2.1 (sign-off) ──unblocks──> 3.5 (client settled signal)
Phase 3  3.1 (logo) + 3.2 (active tab) + 1.5 (sign-out) all edit both nav components
Phase 4  4.5 (durable analysis) ──touches lib/api/documents.ts alongside 2.2 / 2.5
Phase 5  5.1 (tokens) is independent — can run any time
Phase 6  6.1 shares a component with 4.7 (touch targets)
```

**Batching advice:** `lib/types.ts` and `lib/api/documents.ts` are touched by 2.2, 2.3, 2.5,
4.5 and 7.3. Do those five as one coherent data-layer change rather than five sequential
edits that each break `typecheck` for the others. Likewise the two nav components are
touched by 1.5, 3.1 and 3.2 — one pass.

---

# 9. What this plan does not fix

Stated plainly, because the QA report's core conclusion is that the app is a prototype:

- **There is still no authentication.** Phase 1 removes a shipped credential and makes the
  app stop lying about being gated. It does not make the app secure — anyone can still reach
  any route.
- **There is still no tenancy.** 2.5 scopes the mock store. With a real backend the same
  filter must be enforced server-side or it is decorative.
- **There is still no persistence.** Everything resets on reload. 4.5 makes analysis state
  durable *within a tab*, not across reloads.
- **There is still no payment.** 2.2 makes the pricing page honest; it does not make it
  transactional.

**Therefore:** the report's recommendation stands — this build must not be exposed to real
customers or real contract data, even after every item above is closed. Completing Phases
1–7 makes the preview *safe to demo and honest about itself*. Production readiness requires
the backend track.

---

# 10. Suggested delivery order

| PR | Contents | Gate |
|----|----------|------|
| 1 | Preview-mode flag; remove credentials from UI; gate dev widget; real sign-out in both portals (1.1, 1.3, 1.5, 4.4) | Deploy gate |
| 2 | Guard redirect fix + sign-off success state + advocate login promotion (2.1, 1.6) | Deploy gate |
| 3 | Print-to-PDF checklist + honest copy (1.4) | Deploy gate |
| 4 | Data-layer batch: types, tier, wizard fields, org scoping, durable analysis, priority (2.2, 2.3, 2.5, 4.5, 7.3) | High |
| 5 | Advocate availability + conflicts (2.6) | High |
| 6 | Nav pass: logo, active tab, back nav, sign-out polish (3.1, 3.2, 3.3) | Medium |
| 7 | Dashboard stats split + advocate attention panel (3.5, 4.2) | Medium |
| 8 | Home page hierarchy (3.4) | Medium |
| 9 | A11y pass: contrast tokens, live regions, shortcut guard + hints, error announcements (5.1, 5.4, 4.3, 4.6) | Medium |
| 10 | Responsive pass: mobile table/cards, touch targets, tablet audit (6.1, 4.7, 6.3) | Medium |
| 11 | SEO + legal footer (4.1, 7.2) | Low |

Run `npm run lint && npm run typecheck && npm run build` on every PR. After PR 3, re-run the
QA matrix's critical and major reproduction steps end-to-end before calling the deploy gate
cleared.
