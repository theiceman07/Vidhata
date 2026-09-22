# Vidhata — Frontend Redesign, Round 2

Date: 23 Sep 2026
Status: implemented
Supersedes: parts of 2026-09-22-vidhata-frontend-redesign-design.md, noted below

---

## 1. What this round is

Round 1 built the design system, the document workspace, the queues, the
seal and the landing arc. This round answers a second critique of the
running product. The complaints were about composition rather than
styling: wasted canvas, too many boxes and lines, weak hierarchy, screens
that did not feel like one product, and prototype tells left in the
production surface.

## 2. Decisions taken

### 2.1 The canvas was never the layout's fault

`body` is a flex column, so every section that centred itself with
`mx-auto` was shrink-to-fit rather than filling the width it was given.
That, not a max-width choice, is why the landing page had a narrow column
of content in a wide viewport. Fixed globally in `app/layout.tsx`.

### 2.2 The hero demonstrates rather than describes

Round 1 chose a type-only marquee (decision 5 of the earlier spec). This
round replaces it: the right half now carries a review surface that plays
the arc once on load. The type still leads on the left.

### 2.3 The third pane is contextual

The findings panel used to hold its width whether or not a finding was
selected. It now opens on selection and returns the width to the
document, with prev/next/close controls and a mobile bottom sheet.

### 2.4 One icon family

Google Material Symbols Outlined, subset to the names the product uses
(`components/shared/icon.tsx`). lucide is gone, including from the shadcn
primitives. The escalation prompt's scales icon is gone outright: the
board rules out legal costume.

### 2.5 The seal appears once per surface

CLAUDE.md fixes the seal to sign-off inside the product. The brief asked
for it in the landing hero as well as the accountability section; it is
struck once, at the accountability record, which is the page's
authoritative moment. The hero and the document arc end on a settled
record line instead.

### 2.6 Nothing on the marketing pages is drafted for the marketing pages

The brief's example finding cited "S.12(B)", which does not exist in the
corpus. Every clause, finding and citation on the landing page is read
from `lib/mock`, so the page cannot assert something the product would
not. The document arc previously asserted a statutory minimum for "this
class of tenancy" with no source at all; it now runs on the MSMED
payment-terms finding, which ships with a verified citation.

## 3. Deliberate departures from the brief

- **No second navigation bar.** The brief allows one only where it carries
  something useful. The arc's stage index already says where the reader
  is.
- **No "Findings" or "Organisation" nav items.** The brief's sidebar
  sketch lists them; neither route exists, and inventing empty screens to
  fill a sidebar is the problem the brief is trying to solve.
- **No 4px radius.** The board's three interface radii (6/8/12, plus 50%
  for identity) are unchanged; a fourth would signal nothing.
- **No WebGL or 3D.** Offered as optional by the brief, and nothing in the
  product needs it.

## 4. Known gaps

- `/dev/components` is a developer surface and has not been recomposed.
- Chat, settings and profile were retokened but not recomposed; they are
  small forms and the shell now carries them.
- The build needs more than Node's default heap on Windows
  (`NODE_OPTIONS=--max-old-space-size=4096`). Pre-existing, unrelated to
  layout.

## 5. Definition of finished, re-checked

Against the brief's own list: the landing page uses the viewport, the
sign-in is centred and single-surface, the sidebar collapses and
remembers, the client and advocate queues differ in shape, light grey no
longer dominates, the review screen's panels are contextual, J/K/C work
and are discoverable behind one control, settled documents carry a
provenance chain, the checklist is an execution sheet, the SVG mark is a
real asset and the favicon, icons come from one family, no em dashes
remain in product copy, and development controls are out of the product's
visual layer.
