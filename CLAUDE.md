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
- Both portals share components/shared/app-shell.tsx. Role switching is a
  preview-only item inside the identity menu, never a control in the
  product's visual layer.
- The mark lives in components/shared/brand-logo.tsx (BrandMark/BrandLogo)
  and is drawn as a path, so app/icon.svg and app/apple-icon.png can reuse
  the same geometry.
- body is a flex column. A container that centres itself with mx-auto is
  shrink-to-fit there, so it also needs w-full (app/layout.tsx holds the
  rule that does this globally).

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
- Ink #141414, muted-fg #5A5A5A, line #E5E5E0, canvas #FAFAF8,
  paper #FFFFFF, parchment #F8F5EE.
- Three type voices. Newsreader (font-display): clauses, document titles,
  moments of judgment. One display moment per screen. Inter (font-sans):
  navigation, metadata, controls. IBM Plex Mono (font-mono): clause
  numbers, citations, state labels, audit trails.
- Headings never drop below weight 500. Body never exceeds 600. If
  something needs weight, make it Newsreader, not bolder Inter.
- Status colors are semantic only, never decorative: verified #2D6A4F,
  flagged #9B2C2C, caution #B7791F (badge fills only; use caution-fg
  #92600A for text), info #2C5282 (layer badges only).
- Radii carry hierarchy: 6px controls, 8px cards, 12px modals, 50%
  identity only. A single radius everywhere signals nothing.
- Avoid: purple/violet/indigo, gradients, glassmorphism, heavy shadows,
  decorative icon treatments, scales, gavels, sepia parchment graphics.
- The seal appears once per document, at sign-off. That is the only place
  the mark is used inside the product.
- No em dashes in product copy. The separator is the middle dot.

## Design
- Annotation, not cards. A finding is a note in the margin of a clause,
  not a tile in a dashboard.
- Every finding carries its source, shown at the same moment as the
  concern, never behind a disclosure.
- Motion explains a state transition. No scroll reveals or parallax
  inside the product. prefers-reduced-motion collapses every transition
  to an instant state change.
- Spec: docs/superpowers/specs/2026-09-22-vidhata-frontend-redesign-design.md

## Commands
npm run dev / npm run build / npm run lint / npm run typecheck
