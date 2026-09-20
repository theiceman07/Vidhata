# Vidhata — To-Fix Plan

Consolidated from `Vidhata_QA_Report.docx` (19 Sep 2026 QA pass) and `UI-changes.docx`
(UI review notes). Reminder: this is a **frontend-only** app right now (no backend) —
several "fixes" below are explicitly scoped as *mock-layer* fixes to keep the app
honest about what it is, plus a separate track for what needs a real backend later.

Legend: 🔴 Critical 🟠 Major 🟡 Minor 🔵 UX/A11y 📱 Responsive 🎨 Brand

---

## 0. How this plan is organized

1. **Phase 1 — Gate before any deploy** (🔴 all 4 critical items + the two UI-doc items
   that are effectively critical: broken advocate routing, dead sign-out)
2. **Phase 2 — Core journey fixes** (🟠 major items + related UI-doc items)
3. **Phase 3 — Navigation & IA fixes** (UI-doc items: logo, active tab, back nav, whitespace)
4. **Phase 4 — Minor / hygiene**
5. **Phase 5 — UX, accessibility, responsive**
6. **Phase 6 — Brand & compliance**
7. **Phase 7 — Post-backend track** (items that cannot be truly fixed until a real
   backend exists — call out mock-acceptable interim fix vs. real fix)

Each item lists: **Source**, **Files likely involved**, **Root cause**, **Fix**,
**Acceptance criteria**.

---

## Phase 1 — Gate before any deploy

### 1.1 🔴 Hard-coded `admin/admin` credentials in the public bundle
- **Source:** QA 2.1
- **Files:** login panel component(s) under `app/(public)` or wherever `/login` and
  `/lawyer-login` render (module referred to as "3855" in the report — locate via
  `grep -r "admin"` across `app/`, `components/`), plus any `lib/api` auth call.
- **Root cause:** client-side string comparison against literal `"admin"`.
- **Fix (mock-acceptable interim):** Move the literal comparison out of a shared/public
  bundle path into `lib/mock` explicitly, rename the constant so it reads as a mock
  fixture (e.g. `MOCK_PREVIEW_CREDENTIALS`), and stop advertising "Preview credentials:
  admin/admin" in the UI copy — replace with a note that login is not yet backed by
  real authentication. This does not fix the underlying issue (there is no backend to
  authenticate against) but stops presenting a security control as if it were real.
- **Fix (real):** Requires backend — server-side identity provider (NextAuth / Clerk /
  custom), httpOnly session cookie, no secrets in client code. Track in Phase 7.
- **Acceptance:** No plaintext credential string ships as a "real" auth check; UI copy
  no longer promises credential security it can't deliver; if kept as a demo login, it
  is visibly labeled as a demo, not a security feature.

### 1.2 🔴 Role-based access is a client-only `localStorage` flag
- **Source:** QA 2.2
- **Files:** `lib/session.tsx` (`SessionProvider`, `STORAGE_KEY = "vidhata-mock-role"`),
  layout guards in `app/(client)/layout.tsx` and `app/(lawyer)/layout.tsx`.
- **Root cause:** `useSession()` reads/writes `localStorage` directly; layout guards
  redirect client-side only, no server enforcement.
- **Fix (mock-acceptable interim):** Keep the mock role model (there's no backend to
  enforce server-side yet) but: (a) do not present it as real authorization anywhere in
  copy, (b) ensure every protected page also fails gracefully / shows a "preview only"
  banner so it can't be mistaken for a security boundary in a demo.
- **Fix (real):** Server-side session + middleware-level route protection
  (`middleware.ts` checking a signed session cookie), role claims issued by the auth
  provider, not settable by the client. Track in Phase 7.
- **Acceptance:** No route in the app is reachable with real data protection until a
  real backend exists; current mock behavior is clearly labeled, not silently exploitable-looking.

### 1.3 🔴 `DevRoleSwitcher` shipped to every production route
- **Source:** QA 2.3, UI-doc (indirectly — this is the "Sign Out" control location too)
- **Files:** root `app/layout.tsx` (renders `DevRoleSwitcher` unconditionally), the
  `DevRoleSwitcher` component itself (likely under `app/dev/` or `components/shared`).
- **Root cause:** No environment gate around the widget.
- **Fix:**
  1. Locate the `DevRoleSwitcher` import in `app/layout.tsx`.
  2. Wrap its render with an environment check:
     `{process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === "true" && <DevRoleSwitcher />}`
     and only set that env var in local/staging, never in the Vercel production env.
  3. Alternatively, exclude the whole `app/dev` route group and switcher component
     from the production build via a build-time flag if the framework allows it.
  4. Once gated, re-verify: home page, `/pricing`, `/dashboard`, `/queue` at both
     viewport sizes show no widget in a production build (`npm run build && npm start`
     with the flag unset).
- **Acceptance:** `npm run build` with prod env vars produces zero references to the
  switcher in the client bundle (verify via bundle search, not just visual check).

### 1.4 🔴 "Downloadable execution checklist" (PDF) not implemented
- **Source:** QA 2.4
- **Files:** `components/domain/execution-checklist.tsx`, checklist page
  `app/(client)/documents/[id]/checklist/page.tsx`, login page copy, document detail
  page copy.
- **Root cause:** No export code path exists at all; button just fires a toast.
- **Fix:**
  1. Fastest safe route per the QA report: implement **print-to-PDF** using the
     browser's native print dialog (`window.print()`) with a dedicated print
     stylesheet (`@media print`) that renders the checklist/settled-document cleanly
     (hide nav, dev widget, buttons).
  2. Replace "Download as PDF" with "Print / Save as PDF" if going this route, and
     update copy on the login page and document detail page to match what's actually
     offered — remove "download your execution checklist" language until true export
     exists, or update it to reflect the print-based flow.
  3. If true PDF generation is wanted instead, this needs a library (e.g. `react-pdf`)
     or a server route — flag as a Phase 7 item if the client wants that instead of print.
- **Acceptance:** Clicking the checklist export control produces an actual printable/
  saveable PDF of the checklist and settled contract text; no UI copy claims a
  capability that isn't wired up.

### 1.5 🟠→🔴-equivalent Advocate sign-off redirects to client login
- **Source:** QA 3.1
- **Files:** `app/(lawyer)/review/[id]/sign-off/page.tsx` (the `completeSignoff`
  handler's navigation target).
- **Root cause:** On success, navigation pushes to `/documents/[id]/checklist`, a
  client-protected route; the `(client)` layout guard bounces the lawyer role to
  `/login`.
- **Fix:**
  1. Change `completeSignoff`'s post-success navigation target to a lawyer-owned route
     — e.g. back to `/queue` with a success toast/banner, or a dedicated
     `/(lawyer)/review/[id]/sign-off/complete` confirmation screen.
  2. Add a client-side signal that sign-off completed: surface it via document status
     (`document-status-trail.tsx`) so the client dashboard reflects it, since the report
     notes "no signal ... except the document status" currently.
- **Acceptance:** Completing all 3 adjudications + 4 sign-off confirmations lands the
  advocate on a success state inside the lawyer portal, never on `/login`.

### 1.6 UI-doc: Advocate Login redirects to Client Login Dashboard
- **Source:** UI-changes doc, item 2
- **Files:** whatever renders the "Advocate Login" entry point (likely
  `app/(public)` landing/login selection, or `/lawyer-login` route itself), plus
  `lib/session.tsx` role-setting on login submit.
- **Root cause:** Likely the same class of bug as 1.5/1.2 — role isn't being set to
  `"lawyer"` before navigation, or the post-login redirect target is hard-coded to the
  client dashboard regardless of which login form was used.
- **Fix:** Audit both login forms (client vs. lawyer). Confirm each calls
  `setRole("client")` / `setRole("lawyer")` respectively *before* navigating, and that
  each navigates to its own dashboard (`/dashboard` vs `/queue`). Add a regression
  check: log in via `/lawyer-login` and assert `role === "lawyer"` and landing route is
  `/queue`.
- **Acceptance:** Advocate Login always lands on the Advocate/lawyer dashboard (`/queue`),
  never `/dashboard`.

### 1.7 UI-doc: Sign-Out control is non-functional
- **Source:** UI-changes doc, item 5; overlaps QA 3.4 (no sign-out in either portal)
- **Files:** wherever the visible sign-out icon/button lives in the client/lawyer
  layouts (`app/(client)/layout.tsx`, `app/(lawyer)/layout.tsx`), `lib/session.tsx`.
- **Root cause:** Per QA 3.4, the *only* working sign-out lives inside the hidden
  `DevRoleSwitcher`. The UI doc separately flags a visible sign-out icon that does
  nothing — likely a placeholder button never wired to `setRole(null)`.
- **Fix:**
  1. Add a real, visible "Sign out" control to both the client nav and the lawyer nav
     (not just the dev widget).
  2. Wire it to call `setRole(null)` from `useSession()` and redirect to `/login` (or
     the marketing home).
  3. Show a brief confirmation (toast: "Signed out") per the UI doc's requirement for
     clear feedback.
  4. Remove/hide the sign-out affordance from `DevRoleSwitcher` once this exists, or
     leave it as a dev convenience only when the widget itself is gated (see 1.3).
- **Acceptance:** Sign-out is visible and functional in both portals without opening
  the dev widget; session state clears; user lands on an appropriate public page with
  visible confirmation.

---

## Phase 2 — Core journey fixes

### 2.1 🟠 Pricing tiers are fictional — no selection, no payment
- **Source:** QA 3.2
- **Files:** `app/(public)` pricing page, `components/domain/intake-wizard.tsx`,
  `lib/mock` (`createDocument`, `mockAnalyse` / `mockFinishAnalysis`).
- **Root cause:** Wizard never collects a tier; `createDocument` hard-codes
  `tier: "standard"`; a separate mock step force-upgrades to `"enhanced"`.
- **Fix (mock-acceptable interim, no payment processor available yet):**
  1. Add a tier-selection step to `IntakeWizard` (radio/segmented control: Standard /
     Enhanced / Senior review) that's actually passed into `createDocument`.
  2. Remove the automatic "standard → enhanced" upgrade in `mockFinishAnalysis`; respect
     the tier the user picked.
  3. Until a real payment flow exists, mark this clearly as "no payment collected yet"
     in the wizard (e.g. a note under the price) rather than silently pretending
     payment happened — do not fabricate a checkout UI with no backend behind it.
  4. Decide with the client whether "Senior review" should be reachable in the mock
     (recommend: yes, make it selectable) or removed from `/pricing` until supported.
- **Fix (real):** Payment gateway integration (Razorpay/Stripe) — Phase 7.
- **Acceptance:** Tier selected in the wizard equals tier shown on the created document
  in 100% of cases; no tier is silently overwritten post-creation.

### 2.2 🟠 New-deal wizard drops `durationMonths`, `governingLaw`, `keyTerms`
- **Source:** QA 3.3
- **Files:** `components/domain/intake-wizard.tsx` (submit handler),
  `lib/api/documents.ts` / `lib/mock` `createDocument`, `lib/types.ts`, document detail
  page, pipeline view.
- **Root cause:** Submit handler only forwards a subset of fields; the rest are
  collected in the form state but never included in the payload to `createDocument`.
- **Fix:**
  1. Extend the `createDocument` payload type in `lib/types.ts` to include
     `durationMonths`, `governingLaw`, `keyTerms`.
  2. Update the `IntakeWizard` submit handler to pass all three through.
  3. Update `lib/mock`'s document fixture shape to store them.
  4. Render them on the document detail page and/or drafting-brief view (wherever the
     other transaction facts like `transactionValue` are shown) — per the report, "the
     durationMonths, governingLaw and keyTerms values are ... never rendered anywhere."
- **Acceptance:** Creating a document with all three fields populated shows all three
  on the resulting document's detail view; nothing entered in the wizard is silently lost.

### 2.3 🟠 Every client sees every tenant's documents
- **Source:** QA 3.5
- **Files:** `lib/mock` (`listDocuments`), client dashboard page
  `app/(client)/dashboard/page.tsx`.
- **Root cause:** Mock data layer has no concept of "current client" scoping — it
  returns the full document store regardless of who's logged in.
- **Fix (mock-acceptable interim):**
  1. Add a `clientId` (or `clientName`) field to the session/mock-user model in
     `lib/session.tsx` or a new `lib/mock/current-user.ts`.
  2. Filter `listDocuments()` by that identity before returning results.
  3. Seed at least two distinct mock client identities so the scoping is visibly testable.
- **Fix (real):** Backend-enforced row-level scoping by tenant/org ID — Phase 7.
- **Acceptance:** Logging in as a given mock client only shows that client's own
  documents; switching mock identity changes the visible set.

### 2.4 🟠 "Available for new claims" toggle has no effect
- **Source:** QA 3.6
- **Files:** `app/(lawyer)/profile/page.tsx`, queue filtering logic (wherever
  `/queue` filters claimable documents — likely `lib/mock` or a queue hook).
- **Root cause:** Toggle is local `useState` only, not persisted or read by queue logic.
- **Fix:**
  1. Persist the toggle to the same mock-session/store mechanism used elsewhere (e.g.
     store on the mock advocate record in `lib/mock`), not just component state.
  2. Update queue-claim logic to check advocate availability and exclude/disable claim
     actions when `false`.
  3. Also address the permanently-empty "Declared conflicts" section noted in the same
     finding — either wire up a basic add/remove UI backed by mock state, or hide the
     section until it does something, per "don't ship a half-finished implementation."
- **Acceptance:** Toggling availability off actually changes claim eligibility in the
  queue for that advocate; conflicts section either functions or is removed.

### 2.5 UI-doc: "Needs Your Attention" section on wrong dashboard
- **Source:** UI-changes doc item 4; related to QA 4.2
- **Files:** `app/(client)/dashboard/page.tsx` (remove from here),
  `app/(lawyer)/queue/page.tsx` or a new lawyer dashboard summary area (add here).
- **Root cause:** Component placed on the client dashboard where flagged/pending-review
  items aren't actionable by the client; should live where advocates act on them.
- **Fix:** Move the "Needs your attention" stat/section component from the client
  dashboard to the advocate queue page. While moving it, also fix QA 4.2: the stat
  currently only counts `revision` and `draft` statuses and excludes `pending_review` —
  since it's now living on the advocate side, base it on statuses relevant to advocate
  action (e.g. `pending_review`, flagged findings count), not the client-facing ones.
- **Acceptance:** Section no longer appears on the client dashboard; appears on the
  advocate queue with counts that reflect items actually needing advocate action,
  including `pending_review`.

---

## Phase 3 — Navigation & IA fixes (UI-doc)

### 3.1 Missing brand logo in header
- **Source:** UI-changes doc item 3
- **Files:** shared nav/header component — check `components/shared` for a `Header` or
  `Nav` component used across `app/(client)/layout.tsx`, `app/(lawyer)/layout.tsx`, and
  `app/(public)`.
- **Root cause:** Logo asset/markup never added to the header.
- **Fix:** Add the Vidhata wordmark/logo (respect brand typography — Cormorant Infant
  display face per `CLAUDE.md`) to the shared header component, linking to the
  appropriate home/dashboard route for the current role. Use an existing asset if one
  exists in `public/` or `app/icon.png`-adjacent files; otherwise flag to the user that
  a logo asset is needed before this can be finished.
- **Acceptance:** Logo visible and consistent in the header across public, client, and
  lawyer surfaces; clicking it navigates home.

### 3.2 Insufficient visual indication of the active tab
- **Source:** UI-changes doc item 6
- **Files:** the nav/tab component in `components/shared` used by both layouts.
- **Root cause:** Active state styling too subtle; also a placement/IA concern per the
  note.
- **Fix:** Add a clear active-state treatment using existing Tailwind brand tokens only
  (`bg-brand`/`text-brand`/`border-line` etc., no raw hex per `CLAUDE.md`) — e.g.
  underline + bold weight + color shift. Reassess placement of the active tab in the
  nav order/hierarchy while doing this pass, per the note about it not fitting
  naturally.
- **Acceptance:** Current route's nav item is unambiguous at a glance; passes a quick
  contrast check consistent with the amber-badge fix in 5.1 below.

### 3.3 Missing Back/Home navigation on secondary pages
- **Source:** UI-changes doc item 7
- **Files:** secondary/detail pages — `app/(client)/documents/[id]/page.tsx`,
  `.../chat/page.tsx`, `.../checklist/page.tsx`, `app/(lawyer)/review/[id]/page.tsx`,
  `.../sign-off/page.tsx`.
- **Root cause:** No back/home affordance built into these deeper routes; users depend
  on the browser back button, creating dead-end screens.
- **Fix:** Add a consistent "Back" control (component in `components/shared`, e.g.
  `BackLink`) at the top of each secondary page, wired to `router.back()` with a
  sensible fallback route (e.g. back to `/dashboard` or `/queue` if there's no history).
  Reuse one component across all listed pages rather than one-off implementations.
- **Acceptance:** Every secondary page listed has a visible, working back/home action
  that doesn't depend on browser chrome.

### 3.4 Insufficient visual hierarchy / excessive whitespace on Home Page
- **Source:** UI-changes doc item 1
- **Files:** `app/(public)/page.tsx` or `app/page.tsx` (marketing home), likely
  `components/marketing`.
- **Root cause:** Design/content gap, not a functional bug — under-filled hero/content
  sections.
- **Fix:** This is a design pass, not a mechanical fix — needs actual content/design
  decisions (what supporting sections, imagery, or copy to add). Recommend treating
  this as its own small design task: bring in design guidance and iterate visually
  rather than guessing structure blind. Flag to the user for direction before
  implementing (what sections: testimonials? process diagram? stats?).
- **Acceptance:** Defer — needs a design decision from the user before this is
  actionable as a coded fix.

---

## Phase 4 — Minor / hygiene (QA §4)

### 4.1 🟡 Identical `<title>`/meta on every route; no robots.txt/sitemap
- **Files:** `app/layout.tsx` (root metadata), each route's `page.tsx` (add
  per-route `metadata` exports), new `app/robots.ts` and `app/sitemap.ts`.
- **Fix:** Use Next.js App Router's per-page `export const metadata` (or
  `generateMetadata`) on at least the public marketing routes (`/`, `/pricing`) and
  key app routes; add `robots.ts` / `sitemap.ts` per Next.js conventions.
- **Acceptance:** Each route has a distinct title/description; `/robots.txt` and
  `/sitemap.xml` return 200.

### 4.2 🟡 "Needs your attention" excludes `pending_review`
- Folded into 2.5 above (fixed as part of moving the section to the advocate side).

### 4.3 🟡 Review keyboard shortcuts (J/K/C) undocumented and unsafe
- **Files:** `app/(lawyer)/review/[id]/page.tsx` (keydown effect).
- **Fix:** (a) Add a small on-screen hint (e.g. a "Shortcuts: J/K next/prev, C
  confirm" caption near the finding controls). (b) Harden the guard: exclude
  `contenteditable` elements, native `<select>` focus, and open Radix popover/dialog
  states, not just `INPUT`/`TEXTAREA`. Consider requiring a brief confirm step for `C`
  specifically since it's destructive-ish (adjudication), addressed together with 5.2.
- **Acceptance:** Shortcuts are visibly documented; stray keystrokes inside any open
  control (select, popover, contenteditable) never trigger confirm.

### 4.4 🟡 `?fail=1` QA hook exposed in production
- **Files:** mock API layer, `getFail()` helper reading `window` search params.
- **Fix:** Gate `getFail()` behind the same env flag used for the dev widget (1.3) —
  only honor `?fail=1` when `NEXT_PUBLIC_SHOW_DEV_TOOLS === "true"`.
- **Acceptance:** `?fail=1` has no effect in a production build.

### 4.5 🟡 Pipeline analysis timer resets on navigation away
- **Files:** document detail page pipeline timer (`app/(client)/documents/[id]/page.tsx`
  or a hook it uses), `components/domain/pipeline-progress.tsx`.
- **Root cause:** `setTimeout` cleared on unmount; no durable state.
- **Fix (mock-acceptable interim):** Persist elapsed analysis time/start timestamp in
  the mock document record (not just component state) so revisiting the page resumes
  from where it should be rather than restarting the full wait. True fix needs a real
  backend job — flag to Phase 7.
- **Acceptance:** Navigating away and back does not indefinitely re-stall a document
  that should have finished analysing by wall-clock time.

### 4.6 🟡 Wrong-credential handling is generic/unmitigated
- **Files:** client/lawyer login forms.
- **Fix:** Keep this simple given there's no real backend yet — no fake rate-limiting
  theater. At minimum, make the error message state clearly this is a preview login;
  avoid implying real lockout/throttling exists when it can't.
- **Acceptance:** Copy doesn't overstate security behavior that isn't implemented.

### 4.7 🟡 Dashboard row not clickable, only small View button
- **Files:** `app/(client)/dashboard/page.tsx` (documents table).
- **Fix:** Make the whole row clickable (navigate to document detail) in addition to
  keeping the explicit View button, and increase the button's touch target size for
  mobile.
- **Acceptance:** Clicking anywhere on a document row navigates to its detail page;
  touch target meets a reasonable minimum (~44px).

---

## Phase 5 — UX, Accessibility, Responsive

### 5.1 🔵 Insufficient contrast on amber "caution" badges
- **Files:** `components/domain/status-badge.tsx`, `app/globals.css` (caution token).
- **Root cause:** `text-caution` (#B4741C) over `bg-caution/15` renders ~3.1–3.3:1,
  below WCAG AA 4.5:1 for normal text.
- **Fix:** Darken the caution foreground token or increase weight/size until it passes
  AA at the badge's actual font size (13–14px). Use Tailwind tokens only per
  `CLAUDE.md` — update the token definition, not one-off inline styles, so the fix
  applies everywhere `caution` is used (status colors are semantic, must stay
  consistent). Recompute contrast against the actual shipped background, not just the
  solid color.
- **Acceptance:** Caution badge foreground/background contrast ≥ 4.5:1 at shipped font
  size; verified badges (`verified`/`flagged`) remain unaffected.

### 5.2 🔵 J/K/C shortcuts: no visual hint, silent confirm
- Same root cause and fix as 4.3 — track together; the "silent confirm" half is the
  a11y angle (no confirmation dialog/undo for an irreversible-feeling action). Consider
  adding a brief inline toast ("Confirmed via keyboard — Z to undo") if undo is cheap
  to add to the mock adjudication state.

### 5.3 🔵📱 Dev widget overlaps content on every surface
- Same fix as 1.3 (gate/remove the widget). Once gated out of production, this and 6.1
  (mobile nav overlap) resolve automatically. No separate work needed beyond 1.3.

### 5.4 🔵 No status announcements for long-running pipeline actions
- **Files:** `components/domain/pipeline-progress.tsx`, claim/sign-off action handlers.
- **Fix:** Wrap the elapsed-time ticker and any status-change messaging in an
  `aria-live="polite"` region so screen readers get periodic/on-change updates.
  Announce claim/sign-off completion explicitly (e.g. a visually-hidden live region
  updated on success).
- **Acceptance:** Screen reader announces pipeline progress changes and claim/sign-off
  completion without requiring focus to be on the element.

### 5.5 📱 Dashboard document table overflows at mobile widths, no scroll
- **Files:** `app/(client)/dashboard/page.tsx` (table + wrapper classes).
- **Root cause:** Wrapper uses `overflow-hidden` instead of allowing horizontal scroll;
  measured 512px table inside a 356px clipped wrapper at 390px viewport.
- **Fix:** Change the wrapper to `overflow-x-auto` (with a scroll shadow/affordance if
  desired) instead of `overflow-hidden`, or reflow to a stacked/card layout below a
  breakpoint if that better fits the design system. Given `CLAUDE.md`'s "every list
  view needs loading, empty and error states" rule, confirm those three states also
  render correctly in whichever layout is chosen.
- **Acceptance:** At 390×844, all columns (including Created and View) are reachable —
  either via horizontal scroll or a reflowed layout; nothing is clipped.

### 5.6 📱 Dev widget covers mobile bottom nav "New deal" tab
- Resolved by 1.3 (gating the widget out of production). No separate work.

---

## Phase 6 — Brand & Compliance

### 6.1 🎨 Dev widget on public pages breaks brand
- Resolved by 1.3. No separate work.

### 6.2 🎨 No Terms, Privacy Policy, or contact link on public site
- **Files:** public footer component, likely `components/marketing`.
- **Fix:** Add a footer with links to Terms of Service, Privacy Policy, and a
  contact/help channel. If those legal pages don't exist yet, this splits into two
  sub-tasks: (a) add the footer links component now, (b) draft the actual
  Terms/Privacy content — flag to the user as a content task, not something to
  fabricate legal text for. Given this is a legal-services product, do not invent
  placeholder legal copy — ask for real content or use an explicit "Coming soon" state
  rather than fake terms.
- **Acceptance:** Footer present with working links; either real legal pages exist or
  an honest placeholder is shown — never fabricated legal text.

### 6.3 🎨 "Priority turnaround" pricing claim has no matching behavior
- **Files:** `/pricing` feature table copy, queue/routing logic.
- **Fix:** Either (a) remove/soften the "Priority turnaround" claim until queue
  prioritization logic exists, or (b) implement basic priority ordering in the mock
  queue (e.g. sort claimable documents by tier before other criteria) so the claim is
  true even in the mock. Recommend (a) short-term, (b) as a Phase 7 real-backend item
  once tiers are functional (see 2.1).
- **Acceptance:** No pricing copy claims a capability the product doesn't exhibit, even
  in mock form.

---

## Phase 7 — Post-backend track (cannot be fully fixed frontend-only)

These need a real backend/auth/payment layer; the phases above only get them to an
honest, non-misleading state on the frontend. Once a backend exists:

- Real server-side authentication + session cookies (supersedes 1.1)
- Real server-side authorization / route protection via middleware (supersedes 1.2)
- Real PDF/document generation service if print-to-PDF isn't sufficient (supersedes 1.4)
- Real payment gateway + tier enforcement (supersedes 2.1, enables 6.3 option b)
- Real per-tenant document scoping enforced server-side, not just filtered client-side
  (supersedes 2.3)
- Durable server-side analysis job state (supersedes 4.5)
- Real rate-limiting/lockout on login (supersedes 4.6)

---

## Suggested execution order

1. Phase 1 (1.1–1.7) — nothing else matters until these are honest/safe
2. Phase 2 (2.1–2.5) — core journeys must work end-to-end
3. Phase 3 (3.1–3.4) — navigation/IA, quick wins except 3.4 (needs design input)
4. Phase 5.1, 5.5 — accessibility/responsive items with concrete, mechanical fixes
5. Phase 4 — remaining hygiene items
6. Phase 5.2, 5.4, Phase 6 — remaining a11y/brand polish
7. Phase 7 — scope once backend work is greenlit

## Notes on process
- Every fix above should keep `lib/api/*` as the only fetch boundary, Server
  Components by default with `"use client"` only where interactivity is added, and
  Tailwind brand tokens only — per `CLAUDE.md`.
- Several "fixes" here are really "stop the UI from lying about what it can do" rather
  than full remediation, because there's no backend yet — flagged explicitly per item
  above so nothing gets implemented as a fake-real feature.
- Before starting implementation on any Phase 1–2 item, confirm current behavior with a
  quick manual repro in the running app, since the QA report is now several hours old
  relative to this plan and file names were partially inferred from bundle module
  numbers rather than source paths.
