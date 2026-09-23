# Vidhata · Frontend Redesign, Round 3

Date: 23 Sep 2026
Status: implemented
Builds on: 2026-09-23-vidhata-redesign-round-2.md

---

## 1. What this round is

Round 2 fixed composition. This round answers a design teardown of the
running product whose complaints were mostly about the product model
rather than the styling. The screens were not lying, exactly, but they
were vague: one status label carried three different questions, a
blocked citation had no way forward, "changes requested" had nothing
behind it, and the queue could not be worked at volume.

## 2. Decisions taken

### 2.1 Four state systems, never one label

A document, a finding, a citation and a claim each have their own state,
and a screen shows whichever ones the reader needs rather than folding
them into a single word.

| System | States | Source |
|---|---|---|
| Document | draft, analysing, pending review, under review, revision, settled, executed | `ContractDocument.status` |
| Finding | open, with client, settled | `findingState()` in `lib/findings.ts` |
| Citation | verified, blocked; a blocked citation may also be withdrawn | `Citation.status`, `Citation.withdrawn` |
| Ownership | unclaimed, claimed by you, held by another advocate | `ContractDocument.advocate`, `claimedAt` |

The contradiction the teardown found ("Changes requested" beside "No open
findings") cannot recur: revision is only entered through a
`ChangeRequest` on a finding, and the finding stays open until it is
settled.

### 2.2 A blocked citation has a way forward, and stays blocked

A citation is verified or blocked. Nothing promotes a blocked citation
to verified except a corpus match. The advocate may instead **withdraw**
it: the finding stops relying on it, the reasoning is recorded, and the
citation stays on the record as blocked with the withdrawal note beside
it. A finding with no verified source left can only be settled with a
note. The alternative is to ask the client, which sends the document to
revision.

### 2.3 "Changes requested" is a list of requests

`ChangeRequest` holds the request, who asked, when, and the client's
response. The client's revision screen shows each request on the clause
it concerns, with the passage, the advocate's words and a response
field. The answers go back together, and a complete set of answers makes
the next draft (`version + 1`).

### 2.4 The client never sees an unsettled draft

The non-negotiable is that nothing reaches a client without a recorded
sign-off. While a document is with an advocate, the client sees where it
is, who holds it and what they have answered, but not the draft body.
Only the passage behind a specific request is shown, because the request
cannot be answered without it. The chat agent is gated the same way.

### 2.5 Claims are exclusive, and adjudication needs the claim

Only the advocate holding a document sees decision controls. An unheld
document offers a claim; a document held by someone else says whose it
is. The queue hides documents held by other advocates.

### 2.6 Sign-off lists what is in the way

`signOffBlockers()` returns actionable items ("Finding 03 · source
blocked"), each linking to `/review/[id]?finding=...`. The workspace's
status strip and the sign-off page both use it. The sign-off record
states who signed, their enrolment, the time in IST, the draft, and how
the findings, sources and client requests were resolved.

### 2.7 The execution checklist is a record

Each step shows its owner, the attached proof, who marked it complete and
when, and it can be undone. `x of y complete` is shown once at the top.
Evidence is a file name only in the preview; nothing is uploaded.

### 2.8 A command palette, and a denser queue

Ctrl/⌘K opens a palette with navigation, document commands, every
finding and every clause, including a substring search over clause text
that returns an excerpt. Filtering is substring, not fuzzy, because a
fuzzy match on a contract phrase finds passages that do not contain it.
The advocate queue became a table with filters and counts, search and
sort.

### 2.9 Less mono, less uppercase

`Dateline` no longer forces capitals or wide tracking. Section headings in
the product use Inter at the new `text-label` size. Mono stays for what
the board assigns it: clause numbers, citations, enrolment numbers, state
labels and audit timestamps.

### 2.10 Marketing

- **Header:** the nav reads "India checks". There is one primary action
  (Start a document) and one "Sign in". The client sign-in screen links
  to the advocate sign-in, which the footer and the advocate section also
  link to.
- **Footer and FAQ:** both are compact. Footer links underline on hover
  rather than turning accent.
- **Pricing:** tiers are compared on what differs. What every tier
  includes is stated once. The featured tier is marked by an ink border,
  not an accent-tinted panel.
- **Sign-in screens:** each names its portal and lists what is inside.

## 3. Deliberate departures from the teardown

- **No turnaround numbers or SLAs.** The product states no turnaround
  figure anywhere, and inventing one for a queue deadline would be a
  claim nobody has made. The queue sorts by tier priority and age instead.
- **No AI-only tier.** Every document reaches an advocate. A tier without
  sign-off would contradict the product.
- **No WebGL.** Unchanged from round 2.
- **Findings an advocate adds enter open.** Raising a concern and deciding
  it are two acts, and both are recorded.
- **Requesting a change sends the document to the client at once**, even
  if other findings are still open, so the client can start while the
  advocate continues.

## 4. Known gaps

- The client identity is the organisation (`MOCK_CLIENT_ORG`), so
  execution steps are recorded as completed by the organisation rather
  than a person.
- Evidence attachment records a file name only.
- The chat, settings and profile screens were not recomposed this round.

## 5. Implementation notes

- `tailwind-merge` must be told about the named font sizes, or it drops
  `text-label` when it sits beside a colour class (`lib/utils.ts`).
- The client document route is full-bleed for the settled workspace, so
  its other states bring their own gutter and scroll (`Frame` in
  `app/(client)/documents/[id]/page.tsx`).
- Opening the third pane animates the grid columns over 200ms. A
  selection that opens it waits for that before scrolling, or it lands
  where the clause was before the reflow.
