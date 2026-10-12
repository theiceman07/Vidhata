# Vidhata — Senior UI/UX Audit

**Reviewed:** `http://localhost:3000` (Next.js 15 dev build, `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE=1`)
**Reviewer lens:** senior product designer / front-end, 20 yrs — accessibility, interaction, systems, brand
**Method:** headless Chromium (Playwright) at 1440×900 and 390×844, plus 320/360/375 overflow probes.
Findings are backed by **measured DOM evidence** (computed styles, bounding boxes, contrast math, console), not opinion.

> **Important — read this first.** The reviewer model in this session **cannot view images**, so the
> visual opinion below is derived from *measurements and source code*, which is more precise and directly
> fixable. Raw screenshots were still captured for you and are listed in Appendix A (19.1 MB, left in
> temp). If you want a human-eye pass, hand the screenshot folder to a vision-capable model or to a person.

---

## How to use this report

Each finding has: **severity · evidence · exact fix (file:line)**. Work top-down. Anything marked
**P0** blocks mobile accessibility or ships an invalid DOM; **P1** is a real defect or trust/conversion
loss; **P2** is polish that separates "good" from "crafted".

---

## P0 — Fix before anyone uses this on a phone

### P0-1 · Duplicate `id="deal-brief"` (invalid DOM + broken label association)

**Evidence (measured):** on `/` the DOM contains **2× `#deal-brief`** and **2× `label[for="deal-brief"]`**;
`document.getElementById("deal-brief")` returns only the first.
**Cause:** preview mode renders `<DealPrompt>` twice — once in `Hero` and once in the closing section
(`app/page.tsx:57`) — and the id is a hard-coded literal.

**Fix — `components/marketing/deal-prompt.tsx:133`** (use a generated id):

```tsx
import { useEffect, useId, useRef, useState } from "react";
// ...
const fieldId = useId();
// ...
<label htmlFor={fieldId} className="sr-only">Describe the deal</label>
<textarea id={fieldId} /* ... */ />
```

### P0-2 · FAQ accordion gives no open/closed affordance (chevron never rotates)

**Evidence (measured):** the trigger's icon `transform` is `none` both **closed and open**; the icon text
stays `expand_more` (never `expand_less`). The CSS selector targets a child `<svg>`, but `Icon` renders a
`<span class="material-symbols-outlined">`.
**Cause:** `components/ui/accordion.tsx:31` → `[&[data-state=open]>svg]:rotate-180` matches nothing.

**Fix — `components/ui/accordion.tsx`:**

```tsx
// line 31 — add `group`, drop the dead svg selector
className={cn(
  "group flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
  className
)}

// line 37 — rotate the actual icon
<Icon
  name="expand_more"
  size={18}
  className="shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
/>
```

### P0-3 · Touch targets below the 44px minimum (fails on nearly every interactive element)

**Evidence (measured @390px):** footer nav links render **18 px** tall; header "Pricing" **48×26**;
consent buttons **36 px**; login/contact inputs **40 px**; password eye toggle **36×36**; "Forgot
password?" **24 px**. The site's *primary mobile navigation* is the 18px-tall footer links.

**Fixes:**

| Element | File:line | Change |
|---|---|---|
| Footer links | `components/marketing/site-footer.tsx:74` | add `inline-flex min-h-11 items-center` (and reduce `<ul>` `space-y-2` → `space-y-0.5` so the visual rhythm is unchanged) |
| Header "Pricing" | `components/marketing/site-header.tsx:78` | give it the same hit area as "Sign in": `inline-flex h-11 items-center px-4` |
| Consent buttons (sm → 36px) | `components/shared/consent-banner.tsx:58,65` | use default/large size, or add `h-11` |
| Inputs (40px) | `components/ui/input.tsx` (base) | bump `h-10` → `h-11` (fixes login + contact at once) |
| Password toggle | `components/shared/password-input.tsx:28` | `h-9 w-9` → `h-11 w-11` |
| "Forgot password?" | `app/(public)/login/page.tsx:119` | `min-h-6` → `min-h-11` (+ `items-center` already present) |
| Contact submit | `components/marketing/contact-form.tsx:91` | default `h-10` → add `className="h-11"` |

### P0-4 · Scrollbars are hidden on every surface — no scroll cue on 9,000–11,000px pages

**Evidence (measured):** homepage is **9,009 px** tall desktop / **11,377 px** mobile (~13 phone screens).
**Cause:** `app/globals.css:12-17` — `* { scrollbar-width: none }` and `*::-webkit-scrollbar { display:none }`.

More than cosmetic: with no scrollbar and no position indicator, long pages give users no sense of
progress or reach. **Fix:** keep the "chrome-free" look on short marketing bands but restore an indicator
on long/scroll-driven content — either un-hide the scrollbar globally, or (better for the aesthetic) add a
thin fixed progress bar and a visible "scroll" cue. Minimum: don't strip the scrollbar on the document
reading surfaces (`/sample`, `/documents/*`).

---

## P1 — Real defects / trust & conversion loss

### P1-1 · Console warning from the site's own `useScroll` (possible scroll-offset miscalc)

**Evidence (measured):** homepage logs, every load:
`framer-motion/dist/es/utils/warn-once.mjs` →
*"Please ensure that the container has a non-static position … to ensure scroll offset is calculated correctly."*
**Source:** `components/marketing/living-document.tsx:323` — `useScroll({ target: ref, offset: [...] })`.
The pinned section (`h-[240svh]`, line 359) drives the four review stages off `scrollYProgress`; if offsets
are computed wrong the stages can skip or stick. **Fix:** pass an explicit positioned `container` ref (or
ensure the scroll container is `relative`), and verify stage transitions at 100–200% zoom and short
viewports. Also treat any framer-motion console warning as a build failure in CI.

### P1-2 · No social-share image and no Twitter card

**Evidence (measured):** `<head>` has `og:title`, `og:description`, `og:site_name`, `og:type` — but **no
`og:image`** and **no `twitter:*`**. Favicons *are* present (`/icon.svg`, `/apple-icon.png`). 
**Fix — `app/layout.tsx:21`:** add `openGraph.images` (a 1200×630 card of the hero) and
`twitter: { card: "summary_large_image", ... }`. For a product whose differentiator is visual trust, a
blank link preview on WhatsApp/LinkedIn/X is a conversion leak.

### P1-3 · Invisible separators between metadata segments (contrast 1.26:1)

**Evidence (measured):** `span.mx-2.text-line` renders `#E5E5E0` on `#FFFFFF` → **1.26:1**. These dots
`·` join meaningful segments (e.g. "Finding 02 · Open", "Verified · source"). At 1.26:1 they read as noise
or disappear entirely.
**Fix:** either lift to a real token (`text-muted-fg`) or make them explicitly decorative with
`aria-hidden` AND enough contrast to *do their job as a divider* — 1.26:1 fails for both.
Locations: `components/marketing/accountability.tsx:95`, `components/document/dateline.tsx:40`,
`components/marketing/living-document.tsx:187,193,205` (`mx-1.5`), and the same pattern across
`components/document/*`.

### P1-4 · Mobile header exposes only 2 of ~15 destinations, and hides the rest in the footer

**Evidence (measured @390px):** the header pill is `358px` wide; its only children are the logo, the bare
text link "Pricing" (26px tall), and the "Sign in" pill. The other 13 links (How it works, India checks,
Agreements, Sample, Empanelment, Advocate login, Contact, Scope, Security, Terms, Privacy…) exist **only
in the footer**, 8,000+px down. There is no menu button.
**Impact:** a first-time mobile visitor cannot discover the product without scrolling to the very bottom.
**Fix:** either promote 3–4 destinations into the header and add a menu affordance, or make the "Sign in"
pill the anchor of a small mobile sheet. Also make "Pricing" a proper pill so it does not look like plain
text next to "Sign in".

---

## P2 — Craft / consistency

### P2-1 · Two sources of truth for the display size
`tailwind.config.ts:54` defines `display: clamp(44px, 6.2vw, 84px)`, but `hero.tsx:15` hard-codes
`text-[clamp(44px,6.4vw,92px)]` → the H1 (92px) is larger than every other `text-display` H2 (84px).
Pick one. (The H1 being *slightly* larger is defensible — make it an explicit token, e.g. `display-hero`,
so the scale stays honest.)

### P2-2 · Homepage scroll fatigue (mobile especially)
9,009→11,377px; the `LivingDocument` section alone pins for **240svh**. Even with reduced-motion support
(good), consider trimming one scroll-driven band on mobile or adding the progress cue from **P0-4**.

### P2-3 · Footer micro-labels at ~1.7:1
`components/marketing/site-footer.tsx:70,88` use `text-paper/45` and `text-paper/50` on `#141414`
(≈4.6:1 / 4.9:1) and the `·` separators at `text-paper/25` (≈1.7:1). The 4.6:1 group barely passes for
12px text; lift to `text-paper/70` for comfort.

### P2-4 · 404 page has no specific title
Non-existent routes fall back to the site default title. Give `app/not-found.tsx` its own metadata
(e.g. "Page not found · Vidhata") so tabs/history are unambiguous.

---

## What is genuinely good (keep it)

- **Design system is real and restrained.** One accent (`#1B4332`), a documented semantic set
  (`verified/flagged/caution/info`), no elevation — surfaces split by hairlines (`tailwind.config.ts:14-35,93-99`).
  This reads as intentional, not generic.
- **Type system is disciplined.** Brygada 1918 (serif) for headlines + contract text, Hanken Grotesk for
  UI, Apfel Grotezk wordmark only — and fonts actually load (`useScroll` check confirmed the stacks).
- **Reduced motion is handled properly** — Framer via `useReducedMotion`, plus a CSS backstop
  (`globals.css:61-70`), plus the loader has its own still state (`globals.css:232-238`).
- **Focus treatment is global and visible** (`globals.css:34-43`), with field-specific flush rings.
- **Anchor links clear the sticky header** — sections carry `scroll-mt-20` (80px) vs the ~76px floating
  bar. Verified in source, not a bug.
- **No horizontal overflow** at 320/360/375/390/1440 (measured) — the responsive grid holds.
- **Heading order is correct** — one `H1`, ordered `H2→H3` on every page audited.

---

## Appendix A — Captured screenshots (artifacts)

Folder: `C:\Users\arjun\AppData\Local\Temp\opencode\ac-shots\`

- `img\` — 37 PNGs: `<page>-desktop-full.png`, `<page>-desktop-fold.png`, `<page>-mobile-full.png`
  (pages: home, pricing, contracts, scope, security, contact, login, lawyer-login, sample, terms, privacy)
- `report.json` — per-page console errors, failed requests, DOM facts
- `audit\audit.json` — measured contrast, tap-target sizes, heading outline, overflow, duplicate ids

## Appendix B — Measured reference numbers

| Page | Height @1440 | Height @390 | Tap targets <44px |
|---|---:|---:|---:|
| `/` | 9,009 | 11,377 | 18 |
| `/pricing` | 2,988 | 4,186 | 18 |
| `/contracts` | 2,601 | 4,491 | 18 |
| `/scope` | 1,740 | 2,906 | 18 |
| `/security` | 1,871 | 2,457 | 18 |
| `/contact` | 1,298 | 2,082 | 20 |
| `/login` | 900 | 844 | 6 |
| `/lawyer-login` | 900 | 844 | 8 |

Console: 1 warning on `/` (framer-motion, see P1-1). No failed requests. No images without `alt`
(the site uses no `<img>` at all — pure type/CSS, by design).
