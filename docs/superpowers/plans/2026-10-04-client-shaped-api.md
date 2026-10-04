# Plan: client-shaped API

Status: phase 1 done as a **proposal** (types and the field matrix test, 4 October
2026); phases 2 to 6 not started. The types are not agreed with the backend
team: nobody has yet asked whether they have started the document endpoints or
which response shapes they assumed. Decided 4 October 2026: the boundary on what a
client may see belongs in the API and the type system, not in browser
narrowing. A larger refactor than the rest of the batch, so it is its own pass,
done before the backend team starts.

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

Questions 1 to 5 answered 4 October 2026. Question 6 is open.

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
