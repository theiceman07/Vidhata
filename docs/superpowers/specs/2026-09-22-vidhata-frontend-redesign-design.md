# Vidhata — Frontend Redesign Design

Date: 22 Sep 2026
Status: approved, pending implementation plan
Supersedes: the brand section of CLAUDE.md (warm rust / Cormorant Infant)

---

## 1. Problem

The product has the right features. The client dashboard, intake wizard,
seven-layer pipeline, advocate queue, adjudication, sign-off, chat and
execution checklist all exist and work. What it does not have is an
interaction model that matches what it is.

Today every surface renders as a card in a SaaS dashboard. A card is a
generic container. A contract is a structured object with clauses, and a
finding is a note in the margin of one of them. The gap between those two
facts is the redesign.

The change is not decoration. It is:

> From a SaaS dashboard that manages documents
> to a legal workspace where documents are read, annotated, evidenced,
> reviewed and settled.

Every screen must make one sentence visible:

> AI does the first pass. An advocate gives it authority.

## 2. Decisions taken

Five forks were settled before design:

1. Brand Board V2.0 supersedes the current palette and type. CLAUDE.md's
   brand section is rewritten as part of this work so future sessions do
   not drift back to warm rust.
2. `ContractDocument` gains `clauses: Clause[]`. Without a document body
   there is no document workspace. The addition is documented for backend.
3. Scope is the whole app, product surfaces first.
4. Motion budget is generous: Lenis inertial scroll plus Framer Motion,
   with a canvas texture layer on the landing hero.
5. The landing hero is two beats: a type-only marquee, then the living
   document arc on scroll.

## 3. Design system

### 3.1 Colour

    accent      #1B4332      hover #265E4A
    ink         #141414
    line        #E5E5E0
    canvas      #FAFAF8
    paper       #FFFFFF
    parchment   #F8F5EE

    verified    #2D6A4F      citation resolved, advocate approved
    flagged     #9B2C2C      high-severity finding, blocked citation
    caution     #B7791F      badge fills only
    caution-fg  #92600A      caution as text (5.2:1)
    info        #2C5282      layer badges only, never decorative

One accent, earned. Colour appears where a decision has been made and
nowhere else. The semantic set carries citation and review status and is
never used decoratively. No gradients, no second brand colour.

`caution-fg` already exists in the repo as a contrast fix; the board
independently specifies the same value, so the token survives unchanged.

### 3.2 Type

    Newsreader      clauses, document titles, moments of judgment
    Inter           navigation, metadata, controls
    IBM Plex Mono   clause numbers, citations, state labels, audit

    display  Newsreader 500  one display moment per screen
    h1       32 / 600        h2  24 / 500      h3  18 / 500
    body     15 / 400        metadata 13 / 400
    notation 13 / 400        mono

Line height: 1.6 body, 1.3 headings, 1.5 notation. Headings never below
weight 500; body never above 600. If something needs weight, it becomes
Newsreader rather than heavier Inter.

The serif is reserved for legal substance. It is not a display font used
for atmosphere.

### 3.3 Spacing and radius

    4px base
    space-8   inline notation
    space-16  field and card gaps
    space-24  card padding
    space-32  desktop page padding
    space-48  around a decision

    radius  6 controls - 8 cards - 12 modals - 50% identity only

Radii carry hierarchy. A single radius everywhere means nothing signals
which surface carries a decision.

### 3.4 Surfaces

Use paper, hairlines, document margins and open annotation zones. Avoid
floating cards everywhere, heavy shadows, glassmorphism, gradients, blobs.

Four document marks:

    ink rule      opens a zone where a judgment is recorded
    hairline      separates information of equal weight
    finding bar   a machine-raised concern, attached to its clause
    margin mark   a human has touched this passage

## 4. Interaction signatures

Three details should make the product recognisable with the logo removed.

### 4.1 The dateline

Illoca's signature is a coordinate readout that always tells you where you
are. Vidhata's translation reads position in the document, updating live
on scroll and selection:

    LEASE AGREEMENT - DRAFT 03 - CLAUSE 7.1 P2 - FINDING 04 - AWAITING ADVOCATE

Set in IBM Plex Mono, pinned to the workspace chrome. On marketing it
becomes a scroll dateline anchored at the left margin.

### 4.2 The settle

The defining transition. A state change on the record, not a toast:

    amber rule wipes to green                       240ms
      -> finding collapses to a one-line settled record
      -> audit line types in, mono
      -> open counter decrements
      -> when the last finding settles, sign-off becomes available

The finding is never deleted. A legal decision remains part of the record.
Settling is undoable from the toast, preserving the behaviour already in
the review page.

### 4.3 The seal

Appears exactly once per document, at sign-off, and nowhere else inside
the product. It draws itself as an SVG stroke and embosses. The restraint
is what gives it weight.

### 4.4 Supporting rules

Evidence is adjacent, never modal. Selecting a finding opens its source in
the third pane. A finding without a citation is an opinion, so source and
concern appear at the same moment, never behind a disclosure.

## 5. Information architecture

    Public     /  -  /pricing  -  /contact  -  /terms  -  /privacy
               /login  -  /advocate-login

    Client     /documents            work queue
               /new                  intake
               /documents/[id]       document workspace
               /documents/[id]/checklist
               /documents/[id]/chat
               /settings

    Advocate   /queue                review queue
               /review/[id]          review workspace
               /review/[id]/sign-off
               /profile

    States     loading - empty - error - 404 - permission denied - no-source

`/dashboard` redirects to `/documents`; `/lawyer-login` redirects to
`/advocate-login`. Route group folder names `(client)` and `(lawyer)` are
internal and stay as they are; all user-visible copy says advocate.

The work queue is not a KPI dashboard. It answers one question: what
requires a decision?

## 6. The document workspace

The screen that defines the product. Three panes, one component tree,
gated by role.

    +--------------+------------------------------+-----------------+
    | CLAUSES      | CONTRACT                     | FINDING         |
    |              |                              |                 |
    | mono numbers | Newsreader on paper          | concern         |
    | Newsreader   | clause numbers in the gutter | SOURCE adjacent |
    | headings     | findings as margin           | raised by       |
    | margin marks | annotations, not cards       | resolved by     |
    |              |                              |                 |
    | FINDINGS     |                              | [SETTLE]        |
    | 2 open       |                              | [KEEP OPEN]     |
    +--------------+------------------------------+-----------------+

Left pane indexes clauses and counts open findings. Centre pane is the
contract set as a document. Right pane is the selected finding with its
evidence.

### 6.1 Role gating

Per Dashboard_Data_Spec.md, the advocate sees `ruleApplied`, `overrideNote`
and the pipeline layer breakdown. The client sees citation status only,
never the underlying rule machinery. One component tree, one `role` prop.

### 6.2 Responsive

Panes stack on mobile. The clause index collapses to a sheet; the finding
opens as a bottom sheet pinned beneath its clause. The document is never
lost in order to inspect a source.

## 7. Component hierarchy

Primitives are built around product objects:

    Document
     +-- Clause
     |    +-- Finding
     |    |    +-- Citation
     |    +-- Advocate Note
     +-- State
     +-- Audit Trail

Not `Card -> Icon -> Heading -> Description -> Button`. That second
hierarchy is how generic dashboards emerge.

New `components/document/`: DocumentSurface, ClauseIndex, Clause,
FindingBar, FindingDetail, MarginMark, CitationBlock, AdvocateNote,
AuditTrail, Seal, StateLabel, Dateline.

`components/domain/finding-card.tsx` is replaced by FindingBar plus
FindingDetail. Vidhata vocabulary continues to live only in these domain
components, per CLAUDE.md.

## 8. Data model change

    interface Clause {
      id: string
      number: string        // "7.1"
      heading: string       // "Termination"
      body: string          // full prose
      findingIds: string[]  // Finding.findingId
      revisedAt: string | null
    }

    interface ContractDocument {
      ...existing fields unchanged
      clauses: Clause[]
    }

`Finding.clauseReference` continues to carry "Clause 7.1" and is the join
key to `Clause.number`. No existing field changes shape, so the queue and
dashboard bindings in Dashboard_Data_Spec.md remain valid.

Backend note: clauses are a detail-page concern only. List views must not
return them, consistent with the spec's server-side aggregation decision.

Clause prose is drafted contract language written into the fixtures. It is
not statute text. Every citation remains one of the four already present in
`lib/mock/documents.mock.ts`; no new statute, section number or case name
is invented anywhere in this work.

## 9. Motion

Lenis provides inertial scroll on marketing surfaces and the document body.
Framer Motion carries state transitions.

    clause select     120ms
    finding open      180ms
    settle            240ms
    seal draw         600ms

Inside the product, motion only ever explains a state transition. No scroll
reveals, no parallax, no sparkles, no confetti. Marketing surfaces carry
scroll choreography; product surfaces do not.

`prefers-reduced-motion` collapses every transition above to an instant
state change and disables all marketing scroll effects. This is a hard
requirement, not a nicety.

## 10. Landing page

Two beats.

Beat one is a type-only marquee hero: one thought set big, a mono dateline
at the left margin, no imagery. The type is the design. The marquee must
complete within the first viewport.

Beat two is the living document. Real contract text in the DOM, Newsreader
on paper. On scroll the four-stage arc plays out on that actual text:

    as drafted
      -> finding bar slides into the margin, passage underlines amber
      -> advocate note appears, wording revises in place
      -> the seal stamps

A canvas layer provides paper fibre and the seal emboss only. Text remains
real, selectable, sharp and accessible. The hero is the product thesis
rather than decoration around it. The arc resolves within roughly two
screens of scroll.

Remaining sections follow the four-stage arc, numbered, with generous
vertical rhythm. Section spacing uses one rhythm throughout:
`clamp(72px, 10vw, 140px)`.

## 11. Product language

Enforced across every surface:

    Error detected        -> Finding identified
    Lawyer approval       -> Advocate sign-off
    AI confidence         -> Citation verified
    Fix issue             -> Review finding
    Final document        -> Settled document
    Next steps            -> Execution checklist
    Active documents      -> Awaiting advocate review
    Last updated          -> Last reviewed

State the fact, then the owner. Never claim unearned certainty: a citation
is verified or it is not, and confidence percentages are never published to
clients. Tone is calm, precise, slightly formal. No em dashes in product
copy; separators are the middle dot.

## 12. Definition of finished

A screen is finished when:

- the current document is obvious
- the user's responsibility is obvious
- the state is obvious
- the evidence is reachable
- the next decision is obvious
- the audit trail is preserved
- it works at desktop and mobile
- focus and keyboard states are designed
- loading, empty and error states are designed
- motion explains a state transition
- no decorative element exists without a product reason

## 13. Non-goals

- No backend. `lib/api/*` stays the only data boundary; no component calls
  fetch.
- No new statute text, section numbers or case names.
- No changes to the pipeline's seven-layer model or its timing.
- No document reaches a client without a recorded advocate sign-off; the
  redesign does not relax this.
- No unrelated refactoring outside the surfaces listed above.

## 14. Risks

The type swap touches every screen at once, so the retokening step must
land and typecheck before any screen work begins. Adding `clauses[]` means
every fixture needs prose written for it, which is the largest single
content task in the build. The landing hero's two beats risk a tall page;
the marquee must complete within the first viewport and the document arc
must not require more than roughly two screens of scroll to resolve.
