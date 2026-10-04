# Plan: client-shaped API

Status: phase 1 done as a **proposal** (types and the field matrix test,
4 October 2026). Phase 2 done on the branch `client-shaped-api-phase-2`
(5 October): the shapers and the client reads, built beside the old functions,
which stay until phase 3. Nothing in `app/` or `components/` reads any of it
yet. The types are not agreed with the backend team: nobody has yet asked
whether they have started the document endpoints or which response shapes they
assumed. Decided 4 October 2026: the boundary on what a client may see belongs
in the API and the type system, not in browser narrowing. A larger refactor
than the rest of the batch, so it is its own pass, done before the backend team
starts.

## The problem

Today `getDocument`, `getDocumentVersions` and `listDocuments(orgId)` return the
whole `ContractDocument` to a client: every finding with its rule id, layer and
disposition, every clause, the advocate-added findings, the advocate's decisions
inside snapshots. The rules in docs/api-contract.md section 4 are applied after
that, in the browser, by `lib/findings.ts`, `lib/clientVersions.ts`,
`lib/audit.ts` and `lib/privacy.ts`. One test (`findings.test.ts`, "client
screens") scans source files for a direct read of `doc.findings`. None of that
protects data that has already left the server, and a backend that copied the
mock would copy the leak.

## What the end state is

A client screen cannot be handed a field it may not see, because the type it
receives does not have the field.

- Client-facing API functions return **client-shaped types**, built in the API
  from the rules in section 4, and never the internal `ContractDocument`.
- The internal functions (the advocate's reads and writes, the mock's own
  stores) are not importable from client code, and a lint rule says so.
- The shaping logic lives in one place per concern, in `lib/api`, with the tests
  it already has, moved with it.

## The audit that sets the shape

Client routes and domain components read these fields off a document today
(counted over `app/(client)`, `components/domain`, `components/document`):

| Field | Reads | Becomes |
|---|---|---|
| `id`, `title`, `type`, `status`, `tier`, `version`, `createdAt`, `claimedAt` | many | `ClientDocument`, unchanged |
| `clientName`, `counterpartyName`, `stateOfExecution`, `transactionValue`, `counterpartyIsMsme`, `durationMonths`, `governingLaw`, `keyTerms` | 12 | `ClientDocument.deal`, unchanged |
| `settledAt`, `advocate` | 39 | the sign-off record (`SignOffRecord`): name, Bar enrolment and date **only once signed off**. Before it the client is told "your advocate" and nothing else, in a request and in the trail too (decided 4 October, replacing "the name of the advocate a request is from") |
| `payment` | 2 | `paidAt` only. The amount leaves the document: the consultation page's "Rs X, paid" reads the tier's price through a pricing function, and money lives on invoices |
| `executionSteps` | 8 | after sign-off only; empty before |
| `clauses` | 15 | **the large change**: before sign-off only the clauses behind requests addressed to the client, each with its text, and a count of the rest; after sign-off all, read-only |
| `findings` | 7 | **the other large change**: `ClientFinding` (number, clause reference, description, the advocate's disposition after sign-off, its sources after sign-off). No rule id, no layer, no override note, no `source`, no advocate-added finding before sign-off unless a request is addressed to the client about it |

Nothing in the client code reads `ruleApplied`, `layer`, `overrideNote`,
`resolvedAt`, or the advocate's notes.

**Correction found in phase 1.** The audit above counted reads of `doc.findings`
by name, and missed that the shared workspace receives findings as a prop. A
client reading a settled document also reads each finding's `severity`,
`clauseText`, `remedySuggested`, `source` (for the "added by the advocate" mark)
and its citations (`text`, `status`, `corpusRef`, `withdrawn`), and a request's
`requestedBy`. So `ClientFindingDetail` carries severity, description, remedy,
disposition and citations, and drops `requestedBy` (the advocate's name) and the
withdrawal note. Phase 3 will find anything else the compiler can.

## Phases

Each phase leaves `npm run check` green and the walkthrough passing
(the 14 points plus pay, consultation, delivery, e-sign, executed).

1. **Types, and the field matrix as a test.** Add `ClientDocument`,
   `ClientClause`, `ClientFinding`, `ClientVersionList`, `ClientDiff`, and
   `ClientAuditEntry` to `lib/types.ts`, derived with `Pick`/`Omit` where they
   can be so a new internal field is private by default. A type-level test
   (`expectTypeOf`) holds that none carries a restricted key.
2. **Shapers in the API.** Move `clientVisibleFindings`, `clientVersionList`,
   `clientVersionDiff`, `clientAuditTrail` and the export's shaping from the lib
   helpers into `lib/api/client/*`, called with the internal record and the
   caller's organisation. The helper files keep their pure functions and their
   tests; the API calls them. The advocate-added switch
   (`lib/config/visibility.ts`) is read here.
3. **Client functions.** `getClientDocument(orgId, id)`,
   `listClientDocuments(orgId)`, `getClientVersions`, `getClientDelivery`
   (already shaped), `getClientTrail`. Each takes the organisation, and a
   document that is not that organisation's is the same not-found as a missing
   one (contract Appendix B, item 6). Moving a route over is a small commit
   each: documents list, document page, history, checklist, delivery, summary,
   consultation, chat.
4. **Fence.** Move the internal reads and the advocate writes to
   `lib/api/internal/` (or `lib/api/advocate/`), and add an ESLint
   `no-restricted-imports` rule: nothing under `app/(client)`,
   `components/domain` client components, or `components/marketing` imports
   them. This replaces the source-scan test with something the compiler and the
   linter hold. Keep the scan as a second guard until the rule has been in a
   release.
5. **Leak test over every state.** For each fixture and each generated
   document, in each status, before and after sign-off, serialise every
   client-facing response and assert it contains none of a list of markers:
   rule ids, layer numbers, `overrideNote`, advocate-note text, a disposition
   before sign-off, an advocate-added finding no request is about, a decision
   inside a snapshot, the corpus-review log. Run on the snapshots too. This is
   the test the backend team re-uses against the real API.
6. **Retire.** Delete the browser-side narrowing that is now dead, remove the
   `Gap` notes in the contract, and update CLAUDE.md.

## Proposed types (phase 1, not agreed)

In `lib/types.ts`, tested in `lib/clientTypes.test.ts`. Derived with `Pick`, so a
new internal field is private until someone adds it on purpose.

- `SignOffRecord` (also now `Delivery.signOff`): `advocate`, `enrolment`, `at`.
  The only place a client meets the advocate.
- `ClientDocument`: `id, title, type, status, tier, version, createdAt,
  claimedAt, executedAt`, `deal`, `paidAt`, `signOff`, `clauses` and
  `otherClauseCount`, `findingList`, `executionSteps`. Named `findingList` so the
  guard that fails on `.findings` in client code keeps working until the fence
  replaces it.
- `ClientFinding`: `number`, `clauseReference`, `clauseText`, `request`, and
  `detail` (null before sign-off). No id: the number is the only reference.
- `ClientFindingDetail`: severity, description, remedy, disposition, citations,
  and one optional `advocateAdded?: true`, absent when
  `SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF` is off, so narrowing the setting never
  changes the type.
- `ClientClause`, `ClientChangeRequest`, `ClientCitation`, `ClientDeal`,
  `ClientVersionRow` / `ClientVersionList`, `ClientDiff`, `ClientAuditEntry`
  (which names a finding by `findingNumber`, not by id).
  The version and diff shapes moved here from `lib/clientVersions.ts`, which
  re-exports its old names.

The test walks every client type at any depth and fails the typecheck on a
restricted key (rule id, layer, source, override note, resolution time, who
asked, org, payment, fee, Bar enrolment, advocate notes). It was checked by
adding `ruleApplied` to a client type and watching it fail.

Consequences for copy, to be done in phase 3: "Farhan Sheikh needs your answer"
becomes "Your advocate needs your answer", and the client's trail says
"Advocate" before sign-off.

## Phase 3 order and rules (decided 5 October)

One screen at a time, ordered by risk, each with a browser check before the next
and a commit gated on `npm run check`. The browser check is local, with
`NEXT_PUBLIC_VIDHATA_PREVIEW_MODE=1` in `.env.local`: the variable is off on
Production, and previews are behind Deployment Protection. The deployed check
waits until phase 3 is merged.

1. The document page and its request panel, with `respondToChanges`. The answer
   write takes the organisation and keys each answer by the finding's client
   number, looks the finding up by (organisation, document, number) the way
   `getClientRequest` does, and gives the same refusal for anything that is not a
   request addressed to this client. It lands with this page because it is the
   same flow.
2. The history page.
3. The chat sidebar.
4. The consultation and privacy screens, including `requestDataExport`.

Rules every screen must meet:

- Show `clientNumber`, never `number`: in the trail, in requests, in the
  consultation page. The type has no `number` to show a client, so this is held
  by the compiler as well as by `numbers.test.ts`.
- No advocate's name before sign-off: not in a heading, a toast, a notification
  (C9) or the consultation page header, which reads `doc.advocate` today. Say
  "your advocate".
- A request reads "Your advocate asked for your answer", with nothing about its
  current status. It stays listed until answered, and after sign-off everything
  is shown as resolved (question 7).
- Take the finding list from `findingList`; nothing reads a document's own
  `findings`.
- C9 notifications, D9 and D10 wait until phase 3 is merged, because
  notification text is an easy place to leak a name or a finding, and C9 must be
  built on the client types.

## Phase 2 as built

Under `lib/api/client/`, each with its tests beside it. Each shaper names every
field it hands over, so a field added to an internal type is not handed over
until someone adds it on purpose.

| Module | What it does |
|---|---|
| `shape-findings.ts` | `shapeClientFindings`, `numberedForClient`, `signOffRecord`, `asClientReads`. The one place a finding becomes a `ClientFinding`. Reads the advocate-added switch. |
| `requests.ts` | `getClientRequest(orgId, documentId, number)`: the request addressed to a client, found by its number. Every other case is the same null. |
| `shape-document.ts`, `documents.ts` | `shapeClientDocument`, `shapeClientSummary`; `getClientDocument`, `listClientDocuments`. The list reads a `ClientDocumentSummary`, which carries no clauses, findings or steps. |
| `shape-versions.ts`, `versions.ts` | `shapeClientVersionList`, `shapeClientDiff`; `getClientVersions`, `getClientDiff`. Delegates to `lib/clientVersions.ts`, numbering by stored client number. |
| `shape-trail.ts`, `trail.ts` | `shapeClientTrail`; `getClientTrail`. |
| `markers.ts` | Test support: collects the strings that must never reach a client. |

What was built to the rules in questions 1 to 5:

- **Stored numbers.** Every `Finding` carries `number` (the document's own) and
  `clientNumber` (given when the client first may know of it). Both are given by
  the API: the first pass at hand-off, an advocate-added finding when it is
  added and again when a request is addressed to it or at sign-off. A caller's
  own numbers are ignored. `lib/findingNumbers.test.ts` holds the rule over
  every fixture and snapshot, and `lib/api/finding-numbers.test.ts` holds it
  over the API. `SCHEMA_VERSION` is 3.
- **Why two numbers.** One number would leave a gap in what a client sees
  whenever an advocate-added finding no request is addressed to sits between two
  they can see, and a gap says something was kept from them. `clientNumber`
  counts only what they have been shown, so it has none.
- **Same not-found.** A number never given, a finding kept from the client, one
  with no request to them, another organisation's document, a document that is
  not there and a malformed number are one null. The test fails if the
  organisation check is removed or the lookup uses the document's own number.
- **Sign-off is a recorded fact.** A document that says it is settled without an
  advocate and a date on record is read as not signed off, by every shaper.
  This is the rule `getDelivery` already follows.
- **The leak test** runs every shaper over every fixture, with the advocate-added
  switch on and off, searching for rule ids, override notes, withdrawal notes,
  the organisation id and the advocate's identity. Each shaper was checked by
  adding a leak and watching its test fail.

Things phase 2 found and changed:

- **The old diff numbering gave one finding two numbers.** On the vendor fixture
  the same finding is 01 in one comparison and 02 in another, because the diff
  numbers by position in the drafts it compares. Stored numbers fix it.
  `clientVersionDiff` gained one optional hook, `numberFor`; without it the old
  behaviour and its tests are unchanged.
- **The old client trail told a client what the advocate decided.** Before
  sign-off it showed "Finding settled", "Blocked source withdrawn" and the
  advocate's conflict declaration for a finding with a request addressed to the
  client, and named the advocate in the actor. The shaped trail leaves the
  decisions out until sign-off and says "Advocate". After sign-off it is the old
  trail entry for entry. `AuditEntry` gained an optional `afterSignOff` that the
  old trail ignores.
- **A client's passage is the draft's own wording.** Before sign-off a finding's
  passage is null unless a request is addressed to them about it, so a finding
  the client knows only exists is its number and clause reference.
- **A latent id collision.** A new document's id came from the clock, so two made
  in the same millisecond shared one. Fixed, with a test that fails without it.

Not done in phase 2: the answer write (`respondToChanges`) still takes finding
ids and has no organisation check, and `requestDataExport` still narrows in
`lib/privacy.ts`. Both move in phase 3.

## Leaks fixed (do not restore)

- **The old client activity trail** (`clientAuditTrail`, `lib/audit.ts`) told a
  client, before sign-off, that a finding with a request addressed to them had
  been settled ("Finding settled", "Finding settled with a note"), that a source
  had been withdrawn, and that the advocate had declared no conflict; and it
  named the advocate in the actor ("Name, advocate"). A client is told what is
  raised and never what was decided, and never who holds their document before
  sign-off. `shapeClientTrail` is the correct behaviour: "Advocate", no
  decisions, until sign-off. **The old trail's behaviour must not return.** It
  stays in the code only until phase 3 moves the last screen off it, and it is
  deleted in phase 6. Nothing new may call it.
- **Positional finding numbers** let one finding carry two numbers across
  comparisons, and a client's numbering skip over a finding kept from them. Both
  are closed by stored numbers; a client shaper must never hand over a finding's
  own `number` (`lib/api/client/numbers.test.ts` fails if it does).

## Risks

- **Size.** Eight client routes and a dozen components change. The phases are
  small commits, one route at a time, with the old function kept until the last
  route has moved.
- **Screens that quietly rely on a field.** The compiler finds them: removing a
  field from the type is how a leak is found. That is the point of doing it by
  type.
- **The workspace is shared.** `DocumentWorkspace` serves both portals and takes
  a full document. Either it takes a union with a role, or the client gets a
  thin wrapper. Decide at phase 3; do not widen the client type to fit it.
- **Persisted tab state** holds the internal record. That is fine: the shaping
  happens on the way out of the API. A schema bump is only needed if a stored
  shape changes, and none does.
- **Performance** is not a concern: shaping is a pass over a few dozen clauses.

## Questions for you

Questions 1 to 5 answered 4 October 2026. Questions 6 to 8 are open.

1. **Who is the advocate to a client before sign-off?** Today the name is shown
   once a document is claimed ("Farhan Sheikh needs your answer"). Should the
   Bar enrolment stay hidden until sign-off? The plan assumes yes.
   **Answer: hide the enrolment and the name. The client meets the advocate
   only in the sign-off record.**
2. **The advocate-added switch** (`SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF`, currently
   on). It stays a configuration read in the API. Counsel's call.
   **Answer: keep it a server-side value, default on, one optional field on the
   client type that is absent when it is off.**
3. **The payment amount.** Does a client's document page need it, or only the
   invoice? The plan drops it from `ClientDocument` and leaves it on the invoice.
   **Answer: yes. Billing is a separate function and the pay view reads the fee
   from the tier through a pricing function.**
4. **Order against the backend team.** Phases 1 and 2 can start the day the
   backend team does; 3 and 4 are the part they should see land in the mock
   first.
   **Answer: phase 1 now. If the backend team has started, reconcile the type
   names with them afterwards.**
5. **A finding's handle.** A client answers a request by naming a finding.
   **Answer (4 October): key it by the finding's number, as the client already
   reads it ("Finding 02"). No `id` on `ClientFinding`.** This binds phase 2 and 3:
   - The number is unique within a document and stable across its drafts. Today
     `findingNumbers` numbers by position in `doc.findings`, so phase 2 must
     hold a number to its finding (C4 once gave two findings one number), with
     a test over every fixture and across snapshots.
   - The answer API looks the finding up by (document, number) and checks a
     request was addressed to this client. A finding they were not asked about
     is the same not-found as one that does not exist, so it can be neither
     answered nor probed.
   - Lists key on the number.
6. **Backend team.** Not answered, and the plan cannot answer it. Message to
   send: "We've drafted client-facing response types for documents in
   lib/types.ts (see this plan). Have you started the document endpoints? If so,
   can you share the response shapes you've assumed? If not, please review the
   proposal before you start. The rule is that the server must return
   client-shaped data and never rely on the browser to narrow it. The full rule
   list is in docs/api-contract.md." Their answers go here: _pending_.
7. **A request the advocate has since settled.** The old screens drop a request
   from "waiting on you" once the advocate settles its finding, which tells the
   client a decision was made. **Answer (5 October): keep it listed until the
   client answers.** Hiding it would tell the client a decision was made, which
   breaks the pre-sign-off rule, and the cost is that a client may answer
   something the advocate no longer needs, which is acceptable. The confusion is
   reduced in the wording only: "Your advocate asked for your answer", with no
   hint of current status. After sign-off everything is shown as resolved.
8. **A stricter trail.** **Answer (5 October): intended. The old trail was a
   leak.** See "Leaks fixed" below. Before sign-off the trail shows a generic
   "Advocate" and no decisions; after sign-off it matches the old one entry for
   entry.

Phase 3 check, from the same decision: after it, no client screen shows an
advocate's name before sign-off. That includes toasts, notifications (C9) and
the consultation page header, which reads `doc.advocate` today.

## Definition of done

- No client route or component can import an internal API function (lint).
- Every client-facing response is a client-shaped type, and the type has no
  restricted key (type test).
- The leak test passes over every fixture and every status, before and after
  sign-off, snapshots included.
- A document that is not the caller's organisation's returns the same not-found
  as a missing one, on every client function.
- docs/api-contract.md section 4 describes the API as built, and its Appendix B
  items 6 and 7 are closed.
