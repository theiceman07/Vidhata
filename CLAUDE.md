# Vidhata Web

AI-drafted, lawyer-verified contracts for Indian startups and MSMEs.
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

## Vocabulary (use these exact words in UI copy)
- advocate, not lawyer, in client-facing copy
- finding, not issue or error
- settled, not finalised
- sign-off, not approval
- execution checklist, not next steps

## Brand
- Product name: Vidhata.
- Primary color: brand (#875F45, warm rust). Ink #2D2C2A, canvas #E2DED2,
  line #C9BCA9, muted-fg #544C37.
- Display typeface: Cormorant Infant (serif, headlines only).
  Body typeface: Outfit (sans, everything else).
- Status colors are semantic only, never decorative: verified (green),
  flagged (red), caution (amber), info (blue).

## Commands
npm run dev / npm run build / npm run lint / npm run typecheck
