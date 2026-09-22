# Vidhata Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Vidhata frontend from a card-based SaaS dashboard into a document-first legal workspace, per Brand Board V2.0.

**Architecture:** Retoken first so every screen shares the new design system, then build document primitives around the real product objects (Document → Clause → Finding → Citation), then compose those primitives into a three-pane workspace shared by both portals and gated by role, then rebuild the queues and marketing surfaces on top.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind, shadcn/ui, Framer Motion (installed), Lenis (to add), Newsreader + Inter + IBM Plex Mono via `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-09-22-vidhata-frontend-redesign-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No test framework exists in this repo.** There is no vitest/jest/playwright dependency and zero `*.test.*` files. Do not add one — it is out of scope. The verification gate for every task is: `npm run typecheck` (clean), `npm run lint` (clean), and where the task changes rendering, a browser check at 1440px and 390px widths.
- **Never call `fetch` in a component.** `lib/api/*` is the only data boundary.
- **Types come from `lib/types.ts`.** Do not redeclare shapes inline.
- **Tailwind tokens only.** No raw hex in JSX or CSS outside `tailwind.config.ts`.
- **Server Components by default.** `"use client"` only for interactivity.
- **Vidhata vocabulary appears only in `components/domain` and `components/document`.**
- **Copy rules:** advocate not lawyer; finding not issue/error; settled not finalised; sign-off not approval; execution checklist not next steps. No em dashes in any user-visible copy; the separator is the middle dot.
- **Never invent statute text, section numbers or case names.** The only citations that may appear anywhere are the four already in `lib/mock/documents.mock.ts`: Indian Contract Act 1872 s.27; MSMED Act 2006 s.15 (used twice); and the deliberately blocked "Purported precedent on foreign-seated domestic arbitration". Clause *prose* is drafted contract language and is fine to write.
- **A citation is either verified or blocked.** Never "probably fine". No confidence percentages are ever shown to a client.
- **No document reaches a client without a recorded advocate sign-off.**
- **Every list view needs loading, empty and error states.**
- **`prefers-reduced-motion` collapses every transition to an instant state change** and disables all marketing scroll effects. This is a hard requirement in every task that adds motion.
- **Colour tokens:** accent `#1B4332` / accent-hover `#265E4A`, ink `#141414`, line `#E5E5E0`, canvas `#FAFAF8`, paper `#FFFFFF`, parchment `#F8F5EE`, verified `#2D6A4F`, flagged `#9B2C2C`, caution `#B7791F` (badge fills only), caution-fg `#92600A` (caution as text), info `#2C5282` (layer badges only).
- **Motion durations:** clause select 120ms, finding open 180ms, settle 240ms, seal draw 600ms.

---

## File Structure

**Create:**
- `lib/motion.ts` — duration and easing constants, single source for all motion timing
- `lib/findings.ts` — derived finding state (`open` / `settled`) from `Finding.disposition`
- `lib/audit.ts` — derives an audit trail from a document; no new stored data
- `components/providers/smooth-scroll.tsx` — Lenis provider, marketing surfaces only
- `components/document/state-label.tsx` — mono uppercase workflow state
- `components/document/dateline.tsx` — the position readout
- `components/document/margin-mark.tsx` — gutter triangle, "a human has touched this"
- `components/document/citation-block.tsx` — statute, provision, raised by, resolved by
- `components/document/clause-block.tsx` — one clause with its findings in the margin
- `components/document/clause-index.tsx` — left pane
- `components/document/document-surface.tsx` — centre pane
- `components/document/finding-bar.tsx` — the machine-raised concern attached to its clause
- `components/document/finding-detail.tsx` — right pane, finding + evidence + actions
- `components/document/seal.tsx` — the self-drawing seal, sign-off only
- `components/document/audit-trail.tsx` — the retained record
- `components/document/workspace.tsx` — the three-pane shell
- `app/(client)/settings/page.tsx` — new page
- `app/(client)/documents/page.tsx` — client work queue (moved from dashboard)

**Modify:**
- `tailwind.config.ts` — full retoken
- `app/globals.css` — base layer, print rules keep working
- `app/layout.tsx` — font swap
- `CLAUDE.md` — brand section rewrite
- `lib/types.ts` — add `Clause`, add `ContractDocument.clauses`
- `lib/mock/documents.mock.ts` — clause prose for all four fixtures, em dash removal
- all route pages and `components/domain/*`, `components/marketing/*`, `components/shared/*`

**Delete:**
- `components/domain/finding-card.tsx` — replaced by `finding-bar.tsx` + `finding-detail.tsx`

---

## Task 1: Retoken to Brand Board V2.0

The type swap touches every screen at once, so this must land and typecheck before any screen work begins.

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx:2` (font imports), `app/layout.tsx:7-19` (font config), `app/layout.tsx:45-48` (html className)
- Modify: `app/globals.css`
- Modify: `CLAUDE.md` (Brand section)

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind tokens `bg-paper bg-canvas bg-parchment bg-accent text-ink border-line text-verified text-flagged text-caution-fg bg-caution text-info`; font utilities `font-display` (Newsreader), `font-sans` (Inter), `font-mono` (IBM Plex Mono); radii `rounded-control` (6px), `rounded-card` (8px), `rounded-modal` (12px); CSS vars `--font-newsreader`, `--font-inter`, `--font-mono`.

- [ ] **Step 1: Replace the colour and font blocks in `tailwind.config.ts`**

```ts
colors: {
  accent: { DEFAULT: '#1B4332', hover: '#265E4A', fg: '#FFFFFF' },
  ink: '#141414',
  'muted-fg': '#5A5A5A',
  line: '#E5E5E0',
  canvas: '#FAFAF8',
  paper: '#FFFFFF',
  parchment: '#F8F5EE',
  verified: '#2D6A4F',
  flagged: '#9B2C2C',
  // caution at #B7791F measures 3.7:1 — badge fills only. As text it
  // deepens to #92600A (5.2:1). Board V2.0 specifies both values.
  caution: { DEFAULT: '#B7791F', fg: '#92600A' },
  info: '#2C5282',
},
fontFamily: {
  display: ['var(--font-newsreader)', 'Georgia', 'serif'],
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
},
```

Keep `brand` as an alias of `accent` only if a grep shows `bg-brand` still in use; otherwise remove it and fix the call sites in this task.

- [ ] **Step 2: Update the type scale in `tailwind.config.ts`**

```ts
fontSize: {
  display: ['clamp(56px, 9vw, 88px)', { lineHeight: '1.05', fontWeight: '500' }],
  h1: ['32px', { lineHeight: '1.3', fontWeight: '600' }],
  h2: ['24px', { lineHeight: '1.3', fontWeight: '500' }],
  h3: ['18px', { lineHeight: '1.4', fontWeight: '500' }],
  body: ['15px', { lineHeight: '1.6', fontWeight: '400' }],
  meta: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
  notation: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
},
letterSpacing: { notation: '0.08em' },
boxShadow: { card: '0 1px 2px rgba(20,20,20,0.04)' },
```

Board rule: headings never below weight 500, body never above 600.

- [ ] **Step 3: Swap fonts in `app/layout.tsx`**

```tsx
import { Newsreader, Inter, IBM_Plex_Mono } from "next/font/google";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
```

Then set the `<html>` className to include all three font variables plus `h-full antialiased`.

- [ ] **Step 4: Update `app/globals.css` base layer**

```css
@layer base {
  body { @apply bg-canvas text-ink font-sans text-body; }
  ::selection { @apply bg-accent/12 text-ink; }
  :focus-visible { @apply outline-none ring-2 ring-accent ring-offset-2 ring-offset-paper; }
}
```

Leave the existing `@media print` block intact — it is load-bearing for the execution checklist's print-to-PDF route. Change only its hardcoded `color: #2d2c2a` to `#141414`.

- [ ] **Step 5: Rewrite the Brand section of `CLAUDE.md`**

Replace the existing Brand block with:

```markdown
## Brand
- Product name: Vidhata. "AI drafts. Advocates decide."
- One accent, earned: accent #1B4332 (hover #265E4A). Colour appears
  where a decision has been made and nowhere else.
- Ink #141414, line #E5E5E0, canvas #FAFAF8, paper #FFFFFF,
  parchment #F8F5EE.
- Three type voices. Newsreader: clauses, document titles, moments of
  judgment (one display moment per screen). Inter: navigation, metadata,
  controls. IBM Plex Mono: clause numbers, citations, state labels, audit.
- Status colours are semantic only, never decorative: verified #2D6A4F,
  flagged #9B2C2C, caution #B7791F (badge fills; #92600A as text),
  info #2C5282 (layer badges only).
- Radii carry hierarchy: 6px controls, 8px cards, 12px modals, 50%
  identity only.
- Avoid: purple/violet/indigo, a single radius everywhere, decorative
  icon treatments, gradients, glassmorphism, scales, gavels, parchment
  graphics.
- The seal appears once per document, at sign-off. It is the only place
  the mark is used inside the product.
- No em dashes in product copy. The separator is the middle dot.
```

- [ ] **Step 6: Fix every call site the retoken broke**

```bash
grep -rnE "text-brand|bg-brand|border-brand|ring-brand|#[0-9a-fA-F]{6}" app components --include=*.tsx
```

Every hit must become a token. Expect hits in `components/shared/brand-logo.tsx`, the marketing components, and the auth layouts.

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all three clean.
Then `npm run dev` and load `/`, `/login`, `/dashboard`. Expected: green accent, serif headlines, no rust, no Cormorant, nothing unreadable. Colour is allowed to look sparse at this stage — screens are rebuilt later.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx CLAUDE.md app components
git commit -m "Retoken to Brand Board V2.0"
```

---

## Task 2: Add the Clause model and write clause prose

Without a document body there is no document workspace. This is the largest content task in the build.

**Files:**
- Modify: `lib/types.ts` (add `Clause`, add `ContractDocument.clauses`)
- Modify: `lib/mock/documents.mock.ts` (clause arrays for all four fixtures, em dash removal)
- Modify: `lib/api/documents.ts:172-208` (`createDraftDocument` must produce clauses)
- Modify: `Dashboard_Data_Spec.md` (document the addition for backend)

**Interfaces:**
- Consumes: Task 1's tokens (not directly used here).
- Produces: `Clause { id: string; number: string; heading: string; body: string; findingIds: string[]; revisedAt: string | null }`, and `ContractDocument.clauses: Clause[]`. `Finding.clauseReference` ("Clause 7.2") remains the join key to `Clause.number` ("7.2").

- [ ] **Step 1: Add the type to `lib/types.ts`**

```ts
export interface Clause {
  id: string;
  number: string; // "7.1" — joins to Finding.clauseReference ("Clause 7.1")
  heading: string; // "Termination"
  body: string; // full prose, paragraphs separated by \n\n
  findingIds: string[]; // Finding.findingId values raised against this clause
  revisedAt: string | null; // ISO, set when an advocate revises the wording
}
```

Add `clauses: Clause[];` to `ContractDocument`, directly above `findings`.

- [ ] **Step 2: Add a join helper to `lib/types.ts`**

```ts
export function clauseNumberFromReference(reference: string): string {
  return reference.replace(/^Clause\s+/i, "").trim();
}
```

- [ ] **Step 3: Write clause arrays into all four fixtures**

Every fixture needs `clauses`. The clause numbers carrying findings are fixed by existing data and must match exactly:

| Fixture | Findings on |
|---|---|
| `doc-nda-settled` | none |
| `doc-msa-pending` | 7.2, 4.1, 11.4 |
| `doc-employment-analysing` | none |
| `doc-vendor-revision` | 5.3 |

Write 8 to 14 clauses per document in plain contract English. Real prose, not lorem. Numbering must be internally consistent and ascending. Example shape for `doc-msa-pending`:

```ts
clauses: [
  {
    id: "cl-msa-1",
    number: "1.1",
    heading: "Definitions",
    body: 'In this Agreement, "Services" means the services described in Schedule A, and "Deliverables" means any output produced by the Supplier in the course of providing the Services.',
    findingIds: [],
    revisedAt: null,
  },
  {
    id: "cl-msa-7",
    number: "4.1",
    heading: "Payment terms",
    body: "The Client shall pay each undisputed invoice within ninety (90) days of receipt.",
    findingIds: ["find-2"],
    revisedAt: null,
  },
  {
    id: "cl-msa-11",
    number: "7.2",
    heading: "Non-compete",
    body: "The Supplier shall not, for a period of three (3) years following termination, provide services of a similar kind to any person carrying on a business competing with the Client anywhere in India.",
    findingIds: ["find-1"],
    revisedAt: null,
  },
  {
    id: "cl-msa-15",
    number: "11.4",
    heading: "Dispute resolution",
    body: "Any dispute arising out of this Agreement shall be referred to arbitration seated in Singapore, conducted in the English language.",
    findingIds: ["find-3"],
    revisedAt: null,
  },
],
```

The `body` of a finding-bearing clause must contain the text that `Finding.clauseText` quotes, so the highlight in Task 7 can locate it. Check each existing `clauseText` value and make the clause body a superset of it.

- [ ] **Step 4: Remove em dashes from fixture titles**

Board rule, and these strings are user-visible. Replace the em dash with the middle dot in all four titles:

```
"Mutual NDA — Kavach Robotics"
"Master Services Agreement — Sundargarh Logistics"
"Employment Agreement — Senior Engineer"
"Vendor Agreement — Packaging Supply"
```

Then sweep the rest of the repo:

```bash
grep -rn "—" app components lib --include=*.tsx --include=*.ts
```

Code comments may keep em dashes. User-visible strings may not.

- [ ] **Step 5: Make `createDraftDocument` produce clauses**

In `lib/api/documents.ts`, the new-document path must return a `clauses` array or the workspace renders empty for anything created through intake. Add a `buildClauses(input)` helper beside the existing `buildExecutionSteps`, returning a standard 8-clause skeleton per contract type with intake values interpolated (parties, state of execution, duration, governing law).

- [ ] **Step 6: Document the addition in `Dashboard_Data_Spec.md`**

Append to Integration Notes:

```markdown
### Addition · 22 Sep 2026 · clauses

`ContractDocument` gains `clauses: Clause[]`:

    Clause { id, number, heading, body, findingIds[], revisedAt }

`Finding.clauseReference` ("Clause 7.1") remains the join key to
`Clause.number` ("7.1"). No existing field changes shape, so every
binding described above stays valid.

Clauses are a detail-page concern only. List and queue endpoints must
not return them, consistent with the server-side aggregation decision
above.
```

- [ ] **Step 7: Verify**

Run: `npm run typecheck`
Expected: clean. If a consumer breaks, it is because a mock object is missing `clauses` — add it rather than making the field optional. The field must be required so backend cannot omit it on the detail endpoint.

- [ ] **Step 8: Commit**

```bash
git add lib Dashboard_Data_Spec.md
git commit -m "Add Clause model and clause prose to fixtures"
```

---

## Task 3: Motion foundation

**Files:**
- Create: `lib/motion.ts`
- Create: `components/providers/smooth-scroll.tsx`
- Modify: `package.json` (add `lenis`)

**Interfaces:**
- Consumes: nothing.
- Produces: `DURATION` (seconds, for Framer Motion), `EASE`, and `<SmoothScroll>`. Every later task imports timings from `lib/motion.ts` and never hardcodes a duration.

- [ ] **Step 1: Install Lenis**

```bash
npm install lenis
```

- [ ] **Step 2: Create `lib/motion.ts`**

```ts
// Single source for motion timing. Spec 9: inside the product, motion
// only ever explains a state transition. Values are seconds because
// Framer Motion takes seconds; the spec states them in milliseconds.
export const DURATION = {
  clauseSelect: 0.12,
  findingOpen: 0.18,
  settle: 0.24,
  sealDraw: 0.6,
} as const;

export const EASE = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
} as const;
```

- [ ] **Step 3: Create `components/providers/smooth-scroll.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "framer-motion";

// Marketing surfaces only. The document workspace uses native scroll so
// that clause anchoring and the dateline readout stay exact.
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. `SmoothScroll` is not mounted yet — it is wired in Task 14.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/motion.ts components/providers
git commit -m "Add motion foundation"
```

---

## Task 4: Notation primitives — StateLabel, Dateline, MarginMark

The mono voice. These three carry every state and position readout in the product.

**Files:**
- Create: `components/document/state-label.tsx`
- Create: `components/document/dateline.tsx`
- Create: `components/document/margin-mark.tsx`
- Create: `lib/findings.ts`

**Interfaces:**
- Consumes: Task 1 tokens, Task 2 `Clause`.
- Produces:
  - `findingState(f: Finding): "open" | "settled"` — `pending` maps to `open`; `confirmed` and `overridden` both map to `settled`.
  - `openFindingCount(doc: ContractDocument): number`
  - `<StateLabel state={DocumentStatus | "open" | "settled"} tone?: "solid" | "outline" />`
  - `<Dateline segments={string[]} className?: string />` — joins with the middle dot, mono, uppercase, tracking-notation.
  - `<MarginMark kind="machine" | "human" />`

- [ ] **Step 1: Create `lib/findings.ts`**

```ts
import type { ContractDocument, Finding } from "@/lib/types";

export type FindingState = "open" | "settled";

// Board V2.0 speaks in OPEN and SETTLED. Both "confirmed" and
// "overridden" are advocate decisions, so both are settled — an
// overridden finding is settled *with* a note, not still open.
export function findingState(finding: Finding): FindingState {
  return finding.disposition === "pending" ? "open" : "settled";
}

export function openFindingCount(doc: ContractDocument): number {
  return doc.findings.filter((f) => findingState(f) === "open").length;
}
```

- [ ] **Step 2: Create `components/document/state-label.tsx`**

Workflow state, not decoration. Mono, uppercase, letterspaced. Map every `DocumentStatus` to board language:

```tsx
const LABEL = {
  draft:          { text: "DRAFT",             className: "text-muted-fg border-line" },
  analysing:      { text: "AI FIRST PASS",     className: "text-info border-info/30" },
  pending_review: { text: "AWAITING ADVOCATE", className: "text-caution-fg border-caution/40" },
  under_review:   { text: "ADVOCATE REVIEW",   className: "text-caution-fg border-caution/40" },
  revision:       { text: "AWAITING SOURCE",   className: "text-flagged border-flagged/30" },
  settled:        { text: "SETTLED",           className: "text-verified border-verified/30" },
  executed:       { text: "EXECUTED",          className: "text-verified border-verified/30" },
  open:           { text: "OPEN",              className: "text-caution-fg border-caution/40" },
} as const;
```

Render as `<span className="font-mono text-notation tracking-notation uppercase border px-2 py-0.5 rounded-control">`. Solid tone fills with the semantic colour for the one authoritative moment (sign-off); outline is the default everywhere else.

- [ ] **Step 3: Create `components/document/dateline.tsx`**

The position readout. Illoca's coordinate tracker, translated.

```tsx
export function Dateline({ segments, className }: { segments: string[]; className?: string }) {
  return (
    <p className={cn("font-mono text-notation tracking-notation uppercase text-muted-fg", className)}>
      {segments.filter(Boolean).join(" · ")}
    </p>
  );
}
```

It takes pre-built segments so callers control what is shown; the workspace passes live position in Task 8.

- [ ] **Step 4: Create `components/document/margin-mark.tsx`**

A thin triangle in the gutter. `machine` is caution-coloured (a concern was raised); `human` is accent-coloured (an advocate has touched this passage). 6px, `aria-hidden`, with the meaning carried by adjacent text rather than the mark alone.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

Render all three in `app/dev/components/page.tsx` and load `/dev/components`. Expected: mono uppercase labels in the right semantic colours, no colour used decoratively.

- [ ] **Step 6: Commit**

```bash
git add lib/findings.ts components/document app/dev/components/page.tsx
git commit -m "Add notation primitives: StateLabel, Dateline, MarginMark"
```

---

## Task 5: CitationBlock — evidence, never behind a disclosure

A finding without a citation is an opinion. The source appears at the same moment as the concern.

**Files:**
- Create: `components/document/citation-block.tsx`
- Delete: `components/domain/citation-badge.tsx` (after fixing its call sites)

**Interfaces:**
- Consumes: Task 4 `StateLabel`.
- Produces: `<CitationBlock citations={Citation[]} raisedBy={string} resolvedBy={string | null} />`

- [ ] **Step 1: Build the component**

A definition list, not a card. Hairline-separated rows, mono labels in the left column, values in Inter:

```
STATUTE      Tamil Nadu Shops & Establishments Act
PROVISION    Section 12(b)
RAISED BY    AI first pass · 22 Sep 2026
RESOLVED BY  A. Kumar, advocate · pending
```

`Citation.text` already carries the full reference (for example `"Indian Contract Act, 1872, s.27"`). Split on the last comma to separate statute from provision; if there is no comma, render the whole string as STATUTE and omit the PROVISION row. Do not synthesise a provision that is not in the fixture.

- [ ] **Step 2: Handle the blocked case**

`Citation.status === "blocked"` means `corpusRef` is null. Render the row in `text-flagged` with a `StateLabel` reading `CITATION BLOCKED`, and the line: "This source could not be verified against the corpus. The finding cannot be settled until it is." Never soften this into "probably fine".

This is the spec's no-source state. `doc-msa-pending`'s `find-3` (cite-3) is the fixture that exercises it.

- [ ] **Step 3: Replace call sites and delete the old badge**

```bash
grep -rn "citation-badge\|CitationBadge" app components
```

Replace each with `CitationBlock`, then delete `components/domain/citation-badge.tsx`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean, and no remaining reference to `CitationBadge`.

- [ ] **Step 5: Commit**

```bash
git add components app
git rm components/domain/citation-badge.tsx
git commit -m "Add CitationBlock, replacing the citation badge"
```

---

## Task 6: FindingBar and FindingDetail — annotation, not cards

Replaces the card hierarchy with the product hierarchy. This task owns the settle transition, the most important interaction in the product.

**Files:**
- Create: `components/document/finding-bar.tsx`
- Create: `components/document/finding-detail.tsx`

**Interfaces:**
- Consumes: Task 3 `DURATION`/`EASE`, Task 4 `StateLabel`/`findingState`, Task 5 `CitationBlock`.
- Produces:
  - `<FindingBar finding={Finding} selected={boolean} onSelect={() => void} />`
  - `<FindingDetail finding={Finding} role={"client" | "advocate"} onSettle={(note: string | null) => void} onKeepOpen={() => void} />`

- [ ] **Step 1: Build `FindingBar`**

A 2px left rule in the severity colour with the concern beside it. Not a tile, not a card, no shadow, no surrounding border:

```tsx
<button
  onClick={onSelect}
  aria-current={selected}
  className={cn(
    "block w-full border-l-2 pl-4 py-3 text-left transition-colors",
    state === "settled" ? "border-verified" : SEVERITY_BORDER[finding.severity],
    selected && "bg-parchment",
  )}
>
  <span className="font-mono text-notation tracking-notation uppercase text-muted-fg">
    FINDING {number} · {state === "settled" ? "SETTLED" : "OPEN"}
  </span>
  <p className="mt-1 text-body">{finding.description}</p>
</button>
```

`SEVERITY_BORDER`: high `border-flagged`, medium `border-caution`, low `border-info`.

When settled, the bar collapses to a single line. The finding is never removed — a legal decision stays part of the record.

- [ ] **Step 2: Build `FindingDetail` with role gating**

Advocate sees `ruleApplied`, `overrideNote` and the layer badge. Client sees neither. Per `Dashboard_Data_Spec.md` this is not cosmetic — the client stays at the "what is happening with my document" level:

```tsx
{role === "advocate" && (
  <Dateline segments={["RULE", finding.ruleApplied, `LAYER ${finding.layer}`]} />
)}
```

The client view has no SETTLE control at all. Only an advocate adjudicates.

- [ ] **Step 3: Implement the settle transition**

Per spec 4.2, in order: the rule wipes from caution to verified over `DURATION.settle`, the finding collapses to its one-line settled form, the audit line types in (mono), and the open counter decrements.

```tsx
<motion.span
  animate={{ backgroundColor: settled ? VERIFIED : CAUTION }}
  transition={{ duration: reduced ? 0 : DURATION.settle, ease: EASE.standard }}
/>
```

Under `useReducedMotion()` every one of these is an instant state change — no wipe, no typing.

Block settling when any citation on the finding is blocked. The control is disabled with the reason stated in text beside it, not only in a tooltip.

- [ ] **Step 4: Keep the existing undo behaviour**

`app/(lawyer)/review/[id]/page.tsx` already makes every confirm undoable from the toast (QA 4.3 / 5.2), including the single-keystroke `C` shortcut. That behaviour is preserved — `onSettle` is wired to the same `updateFinding` call in Task 9. Do not regress it.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

Render both in `/dev/components` against `doc-msa-pending`'s three findings. Expected: high/medium/low read as flagged/caution/info rules; `find-3` cannot be settled and says why; settling `find-1` wipes to green and collapses without the finding disappearing.

- [ ] **Step 6: Commit**

```bash
git add components/document
git commit -m "Add FindingBar and FindingDetail with the settle transition"
```

---

## Task 7: ClauseBlock, ClauseIndex and DocumentSurface

The document itself.

**Files:**
- Create: `components/document/clause-block.tsx`
- Create: `components/document/clause-index.tsx`
- Create: `components/document/document-surface.tsx`
- Modify: `components/domain/clause-viewer.tsx` (delete if unused after this task)

**Interfaces:**
- Consumes: Tasks 4 to 6.
- Produces:
  - `<ClauseBlock clause={Clause} findings={Finding[]} selectedFindingId={string | null} onSelectFinding={(id: string) => void} />`
  - `<ClauseIndex clauses={Clause[]} findings={Finding[]} activeClauseId={string | null} onSelect={(clauseId: string) => void} />`
  - `<DocumentSurface doc={ContractDocument} role={"client" | "advocate"} selectedFindingId={string | null} onSelectFinding={(id: string) => void} onActiveClauseChange={(clauseId: string) => void} />`

- [ ] **Step 1: Build `ClauseBlock`**

Clause number in the gutter in mono; heading in Newsreader; body in Newsreader at `text-body` with relaxed leading, because the clause is the part with legal consequence. Findings render as margin annotations directly beneath the body, inside the clause's own left rule — not in a separate column.

Split `body` on `\n\n` into paragraphs. Highlight the span matching any finding's `clauseText` with `bg-caution/15` and a 1px underline; if no exact match is found, render the paragraph unhighlighted rather than guessing.

A `MarginMark kind="human"` appears in the gutter when `clause.revisedAt !== null`.

- [ ] **Step 2: Build `ClauseIndex`**

Mono numbers, Newsreader headings, a margin mark against any clause carrying an open finding, and an open-findings count at the foot. `aria-current="true"` on the active clause. Keyboard: up/down arrows move selection, Enter scrolls the clause into view.

- [ ] **Step 3: Build `DocumentSurface` with scroll spy**

Renders the clauses on `bg-paper` inside a `max-w-[68ch]` measure with document margins. An `IntersectionObserver` reports the topmost visible clause through `onActiveClauseChange` — this feeds the live dateline in Task 8.

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      const top = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) onActiveClauseChange(top.target.id.replace("clause-", ""));
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  // observe every [data-clause] node, disconnect on cleanup
}, [onActiveClauseChange]);
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

In `/dev/components`, render `DocumentSurface` against `doc-msa-pending`. Expected: a readable contract in Newsreader; clause numbers in mono in the gutter; findings as margin annotations under clauses 7.2, 4.1 and 11.4; scrolling updates the active clause.

- [ ] **Step 5: Commit**

```bash
git add components
git commit -m "Add ClauseBlock, ClauseIndex and DocumentSurface"
```

---

## Task 8: The three-pane workspace

The screen that defines Vidhata.

**Files:**
- Create: `components/document/workspace.tsx`

**Interfaces:**
- Consumes: Tasks 4 to 7.
- Produces: `<DocumentWorkspace doc={ContractDocument} role={"client" | "advocate"} onSettle={(findingId: string, note: string | null) => Promise<void>} onKeepOpen={(findingId: string) => Promise<void>} />`

- [ ] **Step 1: Build the desktop layout**

```
grid grid-cols-[minmax(200px,240px)_minmax(0,1fr)_minmax(320px,380px)]
```

Left and right panes are independently scrollable and sticky; the centre pane owns page scroll. Full height minus the chrome.

- [ ] **Step 2: Wire the live dateline**

The chrome strip carries the readout, rebuilt from live state on every clause and finding change:

```tsx
<Dateline segments={[
  doc.title,
  `DRAFT ${draftNumber}`,
  activeClause ? `CLAUSE ${activeClause.number}` : null,
  selectedFinding ? `FINDING ${findingNumber(selectedFinding)}` : null,
  STATE_TEXT[doc.status],
].filter(Boolean) as string[]} />
```

This is the product's signature detail. It must update as the centre pane scrolls, not only on click.

- [ ] **Step 3: Selecting a finding scrolls its clause into view**

Selection in any pane drives all three. Selecting a finding in the right pane scrolls the centre pane to its clause and highlights it in the index; selecting a clause in the index scrolls the centre pane. Use `scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" })`.

- [ ] **Step 4: Build the mobile layout**

Below `lg`, panes stack. The clause index collapses behind a "Clauses" control that opens a sheet. The finding opens as a bottom sheet pinned beneath its clause so the document is never lost in order to inspect a source. Reuse `components/ui/dialog.tsx` with bottom positioning rather than adding a sheet dependency.

- [ ] **Step 5: Keyboard and focus**

`J`/`K` move between findings, `Enter` opens the selected one, `Escape` closes the mobile sheet. Focus is visible on every pane (Task 1 ships the `:focus-visible` ring). Preserve the existing `C`-to-confirm shortcut from the review page.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: clean.

Browser at 1440px: three panes, dateline updating live on scroll. At 390px: stacked, sheets working, no horizontal scroll. Tab through: every control reachable, ring visible.

- [ ] **Step 7: Commit**

```bash
git add components/document/workspace.tsx
git commit -m "Add the three-pane document workspace"
```

---

## Task 9: Advocate review route on the workspace

**Files:**
- Modify: `app/(lawyer)/review/[id]/page.tsx` (445 lines — this task replaces most of it)

**Interfaces:**
- Consumes: Task 8 `DocumentWorkspace`.
- Produces: nothing new.

- [ ] **Step 1: Replace the two-pane body with `DocumentWorkspace role="advocate"`**

Keep, unchanged: the `load` callback, `updateFinding` / `addFinding` calls, the undo toast, the `C` shortcut, and the add-finding dialog. Replace the `FindingCard` list and its surrounding layout.

- [ ] **Step 2: Wire `onSettle` and `onKeepOpen`**

`onSettle(findingId, note)` calls `updateFinding(doc.id, findingId, { disposition: note ? "overridden" : "confirmed", overrideNote: note })`. `onKeepOpen` sets `disposition: "pending"`. Both set state from the returned document so the open counter stays truthful.

- [ ] **Step 3: Preserve loading and error states**

The existing `LoadState` machine and `ErrorState` stay. Replace the skeleton with a three-pane skeleton matching the new layout.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

Browser: `/review/doc-msa-pending`. Settle `find-1` — green wipe, collapse to one line, counter 3 to 2, toast with undo. Undo restores it. `find-3` cannot be settled and says why.

- [ ] **Step 5: Commit**

```bash
git add "app/(lawyer)/review/[id]/page.tsx"
git commit -m "Move advocate review onto the document workspace"
```

---

## Task 10: Client document route on the workspace

**Files:**
- Modify: `app/(client)/documents/[id]/page.tsx`
- Delete: `components/domain/finding-card.tsx`

**Interfaces:**
- Consumes: Task 8.
- Produces: nothing new.

- [ ] **Step 1: Render `DocumentWorkspace role="client"`**

Read-only: no settle control, no rule IDs, no override notes, no layer badges. The client sees the clause, the finding, and whether its citation is verified or blocked.

- [ ] **Step 2: Keep the pipeline view for the analysing state**

When `doc.status === "analysing"`, `pipeline-progress.tsx` still owns the screen — there is no settled document to read yet. The existing durable-timer reconciliation (`analysisCompletesAt`, QA 4.5) must not regress.

- [ ] **Step 3: Delete the finding card**

```bash
grep -rn "finding-card\|FindingCard" app components
```

Expected: no hits. Then `git rm components/domain/finding-card.tsx`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: clean.

Browser: `/documents/doc-msa-pending` shows no SETTLE control and no `ICA-S27-NONCOMPETE-V2` anywhere. `/documents/doc-employment-analysing` still runs the pipeline and survives a reload mid-run.

- [ ] **Step 5: Commit**

```bash
git add "app/(client)/documents/[id]/page.tsx"
git rm components/domain/finding-card.tsx
git commit -m "Move the client document view onto the workspace"
```

---

## Task 11: The work queues

Not a KPI dashboard. The queue answers one question: what requires a decision?

**Files:**
- Create: `app/(client)/documents/page.tsx`
- Modify: `app/(client)/dashboard/page.tsx` (becomes a redirect)
- Modify: `app/(lawyer)/queue/page.tsx`
- Modify: `components/shared/client-shell-nav.tsx`, `components/shared/lawyer-shell-nav.tsx`

**Interfaces:**
- Consumes: Tasks 4 to 6.
- Produces: nothing new.

- [ ] **Step 1: Build the client work queue**

Open with the question, not a stat row:

```
GOOD AFTERNOON.

3 DOCUMENTS NEED YOUR REVIEW.

Master Services Agreement · Sundargarh Logistics
Draft 02 · 2 open findings                          AWAITING ADVOCATE

Vendor Agreement · Packaging Supply
Draft 01 · 1 citation unresolved                    AWAITING SOURCE
```

Rows separated by hairlines, not cards. Newsreader title, mono metadata, `StateLabel` at the right. The greeting is the one display moment on the screen. Documents needing action sort first.

Bind to the fields named in `Dashboard_Data_Spec.md`: `title`, `type`, `status`, `tier`, `counterpartyName`, `createdAt`, `settledAt`.

- [ ] **Step 2: Add the redirect**

`app/(client)/dashboard/page.tsx` becomes:

```tsx
import { redirect } from "next/navigation";

export default function DashboardRedirect() {
  redirect("/documents");
}
```

- [ ] **Step 3: Rebuild the advocate queue**

Per `Dashboard_Data_Spec.md` this is a queue, not a personal document list. Keep the existing tier-priority sort (`getQueuePriority`, QA 7.3) — it backs the pricing page's priority-turnaround claim. Show finding count with severity breakdown, time in queue, and Claim / Continue review. Keep `clientName` and `tier`.

- [ ] **Step 4: Loading, empty and error states**

Required on both. Empty is a quiet legal workbench, not an illustration with marketing copy: "No documents awaiting review." plus the one action that makes sense.

- [ ] **Step 5: Update navigation labels**

Navigation speaks the work, not the software: Documents / Findings / Review / Settled. No "Dashboard".

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: clean. `/dashboard` redirects to `/documents`. Both queues render loading, empty and error states.

- [ ] **Step 7: Commit**

```bash
git add app components
git commit -m "Rebuild both work queues"
```

---

## Task 12: Sign-off and the seal

Human review must be the most visually authoritative moment in the interface.

**Files:**
- Create: `components/document/seal.tsx`
- Create: `components/document/audit-trail.tsx`
- Create: `lib/audit.ts`
- Modify: `app/(lawyer)/review/[id]/sign-off/page.tsx`

**Interfaces:**
- Consumes: Tasks 4 to 6.
- Produces:
  - `buildAuditTrail(doc: ContractDocument): AuditEntry[]` where `AuditEntry { at: string; actor: string; action: string; ref: string | null }`
  - `<Seal advocate={{ name: string; bar: string }} signedAt={string} />`
  - `<AuditTrail entries={AuditEntry[]} />`

- [ ] **Step 1: Derive the audit trail**

No new stored data. Build entries from what already exists: document created (`createdAt`), AI first pass completed, each finding raised and its disposition, and sign-off (`settledAt`, `advocate`). Sort ascending by timestamp.

- [ ] **Step 2: Build the seal**

A framed serif `V`, engraved-plate style, drawn with `stroke-dashoffset` over `DURATION.sealDraw`, then embossed. Never inside a tinted or rounded container. Under reduced motion it renders complete with no draw.

This is the only place the mark appears inside the product. Do not use it anywhere else.

- [ ] **Step 3: Build the sign-off screen**

```
DOCUMENT READY
Mutual NDA · Kavach Robotics                    SETTLED

check  AI first pass completed
check  6 citations checked against source
check  4 findings settled, 0 open

ADVOCATE
Rhea Kapoor
BAR COUNCIL NO. D/1842/2016 · EMPANELLED
SIGNED OFF · 22 SEP 2026 · 16:40 IST
```

Counts come from real data, never hardcoded. `space-48` around the decision. The advocate's name is Newsreader — it is the moment that matters.

- [ ] **Step 4: Gate sign-off**

Disabled while any finding is open or any citation is blocked, with the reason in text. No document reaches a client without a recorded advocate sign-off.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

Browser: sign-off is disabled on `doc-msa-pending` until all three findings are settled — and `find-3` cannot be settled at all, so the blocked-citation path is demonstrably enforced. On `doc-nda-settled` the seal draws once and the audit trail lists real timestamps.

- [ ] **Step 6: Commit**

```bash
git add components lib/audit.ts "app/(lawyer)/review/[id]/sign-off/page.tsx"
git commit -m "Add the seal, audit trail and sign-off screen"
```

---

## Task 13: Remaining product surfaces

**Files:**
- Modify: `app/(client)/new/page.tsx`, `components/domain/intake-wizard.tsx`
- Modify: `app/(client)/documents/[id]/checklist/page.tsx`, `components/domain/execution-checklist.tsx`
- Modify: `app/(client)/documents/[id]/chat/page.tsx`, `components/domain/chat-message.tsx`, `components/domain/escalation-prompt.tsx`
- Modify: `components/domain/pipeline-progress.tsx`, `document-status-trail.tsx`, `layer-badge.tsx`, `severity-pill.tsx`, `status-badge.tsx`
- Create: `app/(client)/settings/page.tsx`
- Modify: `app/(lawyer)/profile/page.tsx`

**Interfaces:**
- Consumes: Tasks 4 to 6.
- Produces: nothing new.

- [ ] **Step 1: Retoken the intake wizard**

Keep every step, field and validation. It is a drafting brief being taken, so it reads as a form on paper: hairline-separated fields, mono step numbers, Newsreader step headings, generous space around the submit decision.

- [ ] **Step 2: Retoken the execution checklist**

Keep the print-to-PDF route working (`@media print` in `globals.css`, QA 2.4). Heading stays "Execution checklist", never "Next steps".

- [ ] **Step 3: Retoken chat**

The agent explains the settled document. It never gives advice. Keep `escalation-prompt.tsx` behaviour intact. Cited clause references render in mono and link to the clause in the workspace.

- [ ] **Step 4: Fold the old badges into StateLabel**

`status-badge.tsx` and `severity-pill.tsx` overlap `StateLabel`. Replace their call sites with `StateLabel` and delete both. Keep `layer-badge.tsx` — it is advocate-only and uses `info`, which is reserved for exactly this.

- [ ] **Step 5: Build the client settings page**

New. Organisation name, contact, notification preference, sign out. Uses `useSession().signOut` (QA 10.5 / 3.4 — sign-out must remain reachable outside the dev role switcher).

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: clean. Walk `/new` end to end and confirm a document is created with clauses. Print-preview the checklist and confirm it is still legible.

- [ ] **Step 7: Commit**

```bash
git add app components
git commit -m "Retoken intake, checklist, chat and profile; add client settings"
```

---

## Task 14: The landing page

Two beats: a type-only marquee, then the living document.

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/marketing/hero.tsx`
- Create: `components/marketing/living-document.tsx`
- Create: `components/marketing/paper-texture.tsx`
- Modify: `components/marketing/how-it-works.tsx`, `feature-grid.tsx`, `india-checks.tsx`, `faq.tsx`, `site-footer.tsx`, `logo-cloud.tsx`

**Interfaces:**
- Consumes: Task 3 `SmoothScroll`/`DURATION`, Task 4 `Dateline`, Task 12 `Seal`.
- Produces: nothing new.

- [ ] **Step 1: Mount `SmoothScroll`**

Wrap the public layout only. The workspace keeps native scroll.

- [ ] **Step 2: Build the marquee hero**

One thought set big, a mono dateline at the left margin, no imagery. The type is the design.

```
22 SEP 2026 · NEW DELHI

AI drafts.
Advocates decide.

Contracts drafted in minutes, settled by a named advocate.

[ Start a document ]   Watch a review
```

`text-display` is `clamp(56px, 9vw, 88px)` Newsreader 500. Borrow one editorial detail: set a connective word in Newsreader *italic* so the headline has a whispered cadence rather than uniform weight.

The hero must complete inside the first viewport at 1280x800. An oversized headline eating the viewport is the most common failure here — check it.

- [ ] **Step 3: Build the living document**

Beat two. Real contract text in the DOM, Newsreader on paper. Drive the four stages from scroll progress with `useScroll` + `useTransform` over a pinned section:

```
stage 1  as drafted       plain clause text
stage 2  finding raised   finding bar slides in from the margin,
                          the passage underlines in caution
stage 3  advocate note    margin mark appears, the wording revises
                          in place: fifteen days becomes thirty days
stage 4  settled          the rule turns verified, the seal stamps
```

Use clause prose written for this section — contract language, not statute. The revision must be a real text change the reader can watch, not a fade.

Under reduced motion the section renders as four static stages stacked vertically with their labels. No pinning, no scroll hijack.

Resolve within roughly two screens of scroll.

- [ ] **Step 4: Build the paper texture layer**

Canvas, `aria-hidden`, `pointer-events-none`. Fibre grain and the seal emboss only. No gradients, no blobs. Draw once to an offscreen canvas and scale; do not animate per frame. Skip entirely under reduced motion.

- [ ] **Step 5: Rebuild the remaining sections**

Follow the four-stage arc, numbered, one rhythm at every seam: `clamp(72px, 10vw, 140px)`. Copy in a centred max-width column with at least 24px side gutters. Give the container `padding-inline` only — a padding shorthand on the container silently zeroes the section rhythm.

Delete `logo-cloud.tsx` unless it carries real named customers. Invented logos are exactly the "good practice" decoration the board says to remove.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: clean.

Browser at 1440px and 390px: hero complete in the first viewport, no horizontal scroll, the arc readable. Toggle `prefers-reduced-motion` in DevTools and reload: no pinning, no canvas, all four stages readable as static content.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx components/marketing
git commit -m "Rebuild the landing page: marquee hero and living document"
```

---

## Task 15: Auth, public pages and system states

**Files:**
- Modify: `app/(public)/login/page.tsx`, `lawyer-login/page.tsx` and both layouts
- Create: `app/(public)/advocate-login/page.tsx` and layout
- Modify: `components/shared/auth-split-layout.tsx`, `brand-logo.tsx`, `empty-state.tsx`, `error-state.tsx`
- Modify: `app/not-found.tsx`, `app/error.tsx`
- Modify: `app/(public)/pricing/page.tsx`, `contact`, `terms`, `privacy`
- Modify: `app/sitemap.ts`

**Interfaces:**
- Consumes: Task 4.
- Produces: nothing new.

- [ ] **Step 1: Rename the advocate login route**

`/lawyer-login` becomes `/advocate-login`; the old path redirects. The existing admin/admin demo gating and its copy are preserved. Update `app/sitemap.ts`.

- [ ] **Step 2: Retoken the auth screens**

`auth-split-layout.tsx` becomes paper and accent. Board rule: client and advocate are told apart by the badge beside the mark, never by a colour variant. Fix this if the two portals currently differ by colour.

- [ ] **Step 3: Rebuild the system states**

404, error, permission denied, empty, loading. Quiet legal workbench, not illustrations. State the fact, then the owner. Never "something went wrong".

- [ ] **Step 4: Retoken the public pages**

Pricing, contact, terms, privacy. The pricing page's priority-turnaround claim must continue to match the tier sort in `getQueuePriority`.

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: clean. `/lawyer-login` redirects. Every public route renders at 390px with no horizontal scroll.

- [ ] **Step 6: Commit**

```bash
git add app components
git commit -m "Retoken auth and public pages; rename /lawyer-login"
```

---

## Task 16: Final sweep against the definition of finished

**Files:** any, as the sweep finds them.

- [ ] **Step 1: Copy sweep**

```bash
grep -rniE "lawyer|issue|error detected|finalis|approval|next steps|confidence" app components --include=*.tsx
grep -rn "—" app components --include=*.tsx
```

Every user-visible hit must use board vocabulary. Route group folder names `(lawyer)` and internal identifiers may stay.

- [ ] **Step 2: Token sweep**

```bash
grep -rnE "#[0-9a-fA-F]{6}" app components --include=*.tsx --include=*.css
```

Expected: no hits outside `tailwind.config.ts` and the `@media print` block.

- [ ] **Step 3: Decoration sweep**

For every remaining visual element, ask why Vidhata needs it. If the answer is that it is good practice, remove it. Check specifically for: cards that should be hairline rows, the mark appearing anywhere other than sign-off, colour used decoratively, and any icon filling empty space.

- [ ] **Step 4: Accessibility and keyboard pass**

Tab every screen: focus visible everywhere, no traps, sheets return focus on close. Check contrast on `caution-fg` text and every `StateLabel` variant. Confirm no meaning is carried by colour alone — every semantic colour is paired with a text label.

- [ ] **Step 5: Reduced-motion pass**

With `prefers-reduced-motion: reduce`: no Lenis, no canvas, no pinned hero, no wipe on settle, no seal draw. Every screen still fully usable and every stage of the landing arc still readable.

- [ ] **Step 6: Responsive pass**

Every route at 390px, 768px, 1440px. No horizontal scroll anywhere. The workspace stacks correctly and the document is never lost behind a source.

- [ ] **Step 7: Full verification**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Final sweep: vocabulary, tokens, accessibility, reduced motion"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| 3.1 Colour, 3.2 Type, 3.3 Spacing and radius | 1 |
| 3.4 Surfaces, four document marks | 4, 7 |
| 4.1 The dateline | 4, 8 |
| 4.2 The settle | 6 |
| 4.3 The seal | 12 |
| 4.4 Evidence adjacent, never modal | 5, 8 |
| 5 Information architecture | 11, 13, 15 |
| 6 The document workspace | 7, 8, 9, 10 |
| 6.1 Role gating | 6, 10 |
| 6.2 Responsive | 8, 16 |
| 7 Component hierarchy | 4, 5, 6, 7, 10, 13 |
| 8 Data model change | 2 |
| 9 Motion | 3, 6, 14, 16 |
| 10 Landing page | 14 |
| 11 Product language | 2, 11, 16 |
| 12 Definition of finished | 16 |
| 13 Non-goals | Global Constraints |
| 14 Risks | 1 (retoken first), 2 (prose), 14 (hero height) |
