# Vidhata Web

AI-drafted, advocate-settled contracts for Indian startups and MSMEs.
Frontend only. No backend exists yet.

## Product in one paragraph
A client describes a deal. AI drafts a contract from a curated clause
corpus. A seven-layer detection pipeline checks it against Indian
statute. An empanelled advocate adjudicates every finding and signs
off. The client gets the settled document plus an execution checklist
(stamping, registration, e-signature validity).

## Non-negotiables
- Never call fetch in a component. Use lib/api/* only.
- A citation is either verified or blocked. Never "probably fine".
- No document reaches a client without a recorded advocate sign-off.
- The chat agent explains the settled document. It never gives advice.
- Never invent statute text, section numbers or case names. Use the
  fixtures in lib/mock. If a fixture is missing, ask.

## Conventions
- Next.js 14 App Router, TypeScript strict, Tailwind, shadcn/ui.
- Server Components by default. "use client" only for interactivity.
- Domain components live in components/domain and are the only place
  Vidhata vocabulary appears in JSX.
- Types come from lib/types.ts. Do not redeclare shapes inline.
- Tailwind tokens only (bg-paper, text-ink, border-line). No raw hex.
- Every list view needs loading, empty and error states.
- Icons come from Google Material Symbols Outlined through
  components/shared/icon.tsx. The font is subset to ICON_NAMES, so a new
  icon means adding its name there. No other icon library.
- Both portals share components/shared/app-shell.tsx. There is no role
  switch anywhere in the product, the identity menu included. The preview
  enters each portal through "Use the preview workspace" on its sign-in
  page.
- The wordmark lives in components/shared/brand-logo.tsx (BrandLogo). The
  rail shows the whole word; there is no single-letter mark.
- body is a flex column. A container that centres itself with mx-auto is
  shrink-to-fit there, so it also needs w-full (app/layout.tsx holds the
  rule that does this globally, on an inner column rather than body:
  Radix menus, popovers and tooltips mount into body, and a full-width
  wrapper throws them to the left edge).
- Use cn() from lib/utils for class merging. It is configured to know the
  named font sizes (text-label, text-meta and the rest); a plain
  tailwind-merge drops them when they sit beside a colour class. A new
  named size goes in both tailwind.config.ts and lib/utils.ts.
- text-label (12px) is the size for section labels, metadata and state
  text in the product.

## Vocabulary (use these exact words in UI copy)
- advocate, not lawyer, in client-facing copy
- finding, not issue or error
- settled, not finalised
- sign-off, not approval
- execution checklist, not next steps

## Brand
Brand Board V2.0 (22 Sep 2026). This supersedes the earlier warm rust
palette and Cormorant Infant / Outfit pairing. Do not reintroduce them.

- Product name: Vidhata. "AI drafts. Advocates decide."
- One accent, earned: accent #1B4332 (hover #265E4A). Colour appears
  where a decision has been made, and nowhere else.
- Ink #141414, muted-fg #5A5A5A, line #E5E5E0, paper #FFFFFF,
  parchment #F8F5EE. The page is white: canvas is #FFFFFF too.
- Board V3 (23 Sep 2026), reference 7shifts.com. The wordmark is the
  word "Vidhata" in Apfel Grotezk (font-wordmark, self-hosted in
  app/fonts), with no symbol. Brygada 1918 (font-display and
  font-clause): headlines and contract text. Hanken Grotesk (font-sans):
  everything else. There is no monospace voice; font-mono renders the
  grotesk with tabular figures. Do not bring back Newsreader, Inter, IBM
  Plex Mono, Archivo Narrow, uppercase mono eyebrows or datelines like
  "Vidhata · New Delhi".
- Headings are 500, never bold. Body never exceeds 600.
- Status colors are semantic only, never decorative: verified #2D6A4F,
  flagged #9B2C2C, caution #B7791F (badge fills only; use caution-fg
  #92600A for text), info #2C5282 (layer badges only).
- Shape: round everywhere, never square. Buttons and labels are pills;
  rounded-control 12px, rounded-card 20px, rounded-modal 28px. No
  shadows: shadow-float is an ink hairline, not elevation.
- Marketing: a solid ink nav bar, a one-line hero, the rest told as the
  visitor scrolls. "Draft a document" appears in the hero and the
  closing panel only.
- Marketing pages: sections that need to stand apart are full-width
  tinted bands (parchment, pale accent, ink) with a fine grain
  (.tile-grain). No gradients. "Draft a document" is the DealPrompt box
  in the hero and at the end; the brief survives sign-in. Inside the
  portal it drafts: readBrief() (lib/api/brief.ts) reads what the brief
  states, a complete brief is drafted at once, and an incomplete one opens
  intake pre-filled at the first missing fact. Nothing unstated is
  guessed, the tier above all. The nav holds Pricing and Sign in only, floats with no strip behind it,
  and changes tone with scroll (mark dark bands data-nav-tone="dark").
- No visible scrollbars anywhere (globals.css).
- Portals: the rail tucks away like Arc's sidebar. At rest it is a sliver
  of the ink capsule at the left edge; pointing at it or tabbing into it
  opens it in full (the Vidhata wordmark, search, sections, identity) and
  the page makes room rather than being covered. It can be kept open
  (Ctrl+\). On mobile it lies flat as a header.
- Focus: text fields take the accent ring flush, never offset. A bare
  field inside a composed control (DealPrompt, the palette, the agent)
  carries .field-bare, because the control shows the focus.
- Loading: BrandLoader (the wordmark drafted, then ruled). The portals
  wait on useSession().ready; nothing else waits for the session.
- Prompts (DealPrompt, the document agent) share one motion: a travelling
  ring of accent and caution on focus (.prompt-ring) and a caret that
  changes colour each blink (.caret-cycle). Reduced motion stills both.
- The client dashboard opens on a greeting and a DealPrompt; a brief typed
  on the landing page survives sign-in and reappears there.
- A settled document carries the document agent in the right pane
  (DocumentWorkspace companion). It explains the settled text and never
  advises; replies are mocked until the real agent lands.
- The advocate's review page carries the review agent in the same pane.
  It reads the first pass back (blockers, findings with their sources,
  blocked citations, clauses) and links to each finding. It never
  decides: settle, override and sign-off questions are handed back with
  the evidence. Mocked in lib/mock/review-agent.mock.ts.
- Advocate notes: an advocate can stick private notes in a clause's
  margin, under its findings (MarginNote, lib/api/notes.ts). They are
  the advocate's alone, never reach the client, are not findings, carry
  no state and play no part in sign-off.
- The client rail has no "New document": a document starts from the
  DealPrompt on Documents.
- Avoid: purple/violet/indigo, gradients, glassmorphism, heavy shadows,
  decorative icon treatments, scales, gavels, sepia parchment graphics.
- The seal appears once per document, at sign-off. That is the only place
  the mark is used inside the product.
- No em dashes in product copy. The separator is the middle dot.

## State
Four systems, each with its own state. Never fold them into one label.
- Document: ContractDocument.status (draft to executed).
- Finding: findingState() in lib/findings.ts (open, with client, settled).
- Citation: verified or blocked. A blocked citation can be withdrawn by
  the advocate, with a note; it is never re-labelled verified.
- Ownership: unclaimed, claimed by you, held by another advocate. Claims
  are exclusive, and only the holder sees decision controls.
- What stands between a document and sign-off comes from
  signOffBlockers(). Do not recompute it in a component.
- The client sees no draft body before sign-off, only status and the
  passages behind requests addressed to them.

## Design
- Fill the screen. Pages use the full width they are given, not a narrow
  centred column; spread content into columns and side-by-side panels
  where the screen allows. Reading measures (max-w-measure) still apply
  to running prose.
- Sections are divided by space and tint (parchment panels,
  rounded-card), not by hairline rules between content. A coloured
  margin rule is kept only where it carries status (caution on an
  advocate's request).
- Back goes where the reader came from (components/shared/back-button),
  falling back to the parent route.
- Annotation, not cards. A finding is a note in the margin of a clause,
  not a tile in a dashboard.
- Every finding carries its source, shown at the same moment as the
  concern, never behind a disclosure.
- Motion explains a state transition. No scroll reveals or parallax
  inside the product. prefers-reduced-motion collapses every transition
  to an instant state change.
- Spec: docs/superpowers/specs/2026-09-22-vidhata-frontend-redesign-design.md,
  then round 2 and round 3 in the same folder (2026-09-23-*).

## Commands
npm run dev / npm run build / npm run lint / npm run typecheck
