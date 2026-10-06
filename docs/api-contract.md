# API contract

What `lib/api/*` promises, and what a real backend must enforce on its own.

The mock layer is the contract. It is a set of async functions over in-memory
stores, and the rules that matter live in them and in the tests that hold them.
This document names each rule once, points at the function that shows it and the
test that holds it, and says plainly where the mock does **not** enforce a rule
and relies on the screen. Where this document and the code disagree, the code
and its tests are the record, and this document is wrong and should be fixed.

Written from the repo at the end of the F pass (4 October 2026), and brought up to date
for the client-shaped API (phases 1 to 4, 5 October 2026): section 4, the client
functions in Appendix A, and Appendix B.

## How to read it

Each rule has three marks:

- **Mock** is the function that carries the rule, as `file` › `function`.
- **Test** is the test that holds it, as `file` › "describe › it", so it can be
  searched for. "No test" means exactly that. Paths are relative to `lib/`, and
  a file under `lib/api/` is written with its `api/` or full path. Three names
  exist in both places (`citations`, `billing`, `privacy`), so those are always
  written in full.
- **Gap** is a rule the mock leaves to the UI. A backend that copies the mock
  copies the gap. The gaps are collected in Appendix B.

## 0. Conventions every function follows

| Convention | What it means for the backend |
|---|---|
| **No identity in the mock.** | No function reads who is calling. `orgId` and `advocateId` are arguments, passed by the screen from a fixture (`MOCK_CLIENT_ORG`, `CURRENT_ADVOCATE`). A real backend derives both from a server-verified session and never takes them from the request. `lib/api/notes.ts` says the same of its own scoping. |
| **A read that finds nothing returns `null`; a write that cannot proceed throws `MockApiError`** with a sentence a person can read. | Map to a 404 or 4xx with the same copy. The copy is part of the contract where a rule below says "the same response". |
| **A failure changes nothing.** Every write checks the failure switch before it writes. | Each write is one transaction. A failed call leaves no partial state, and the client can simply try again. Tests: `execution.test.ts` › "changes nothing when it fails, and works again afterwards"; `documents.test.ts` › "is left awaiting payment when the payment fails…"; `lib/api/privacy.test.ts` › "changes nothing when it fails". |
| **Reads return copies.** | `structuredClone` everywhere. Nothing a caller holds can change the store. Test: `summaries.test.ts` › "hands over a copy, so reading it cannot change the fixture". |
| **Money is a whole number of rupees, before GST.** | `lib/config/pricing.ts` holds every amount. Never a percentage, share or split of legal fees (BCI fee-sharing rules, Architecture §8). Test: `lib/fees.test.ts` › "never state a fee as a percentage or a share", "are flat whole-rupee amounts…". |
| **Times are ISO 8601 strings, UTC.** | Every `…At` field. |
| **Named actors.** | An audit entry names who acted, never "the system" (`lib/audit.ts` › `AuditEntry.actor`). |

State systems stay apart. A document has `status`, a finding has `findingState()`,
a citation is verified or blocked, and a document is claimed or not. Never fold
them into one field (`lib/findings.ts`, header comment).

```
DocumentStatus: draft → analysing → awaiting_payment → pending_review
                → under_review ⇄ revision → settled → executed
```

## 1. Release gating

A document reaches an advocate only after it is screened **and paid for**.

**1.1 Released means past payment.** A document is released when its status is
none of `draft`, `analysing`, `awaiting_payment`.
Mock: `documents.ts` › `isReleased`.
Test: `documents.test.ts` › "releasing a document to the advocate queue › knows which states are released".

**1.2 Every advocate read goes through that gate, and an unreleased document is
exactly a missing one.** The queue (`listDocuments()` with no `orgId`) holds only
released documents. `getDocumentForReview` returns `null` for an unreleased
document and for a made-up id, so an advocate following a link cannot tell the
document exists. It is in no advocate-facing count or metric.
Mock: `documents.ts` › `listDocuments`, `getDocumentForReview`.
Test: `documents.test.ts` › "is in the client's own list but in no advocate-facing read", "looks the same to an advocate following a link as a document that does not exist".
Every advocate **write** goes through the same gate (`documents.ts` › `heldDocument`): an unpaid document is refused as "Document not found." and so is a missing one.
Test: `lib/api/advocate-gates.test.ts` › "an advocate's writes › are refused on an unpaid document exactly as on one that does not exist".

**1.3 A document is not claimable until paid, and the refusal is the one for a
missing id.** `claimDocument` throws "Document not found." for an unreleased
document.
Mock: `documents.ts` › `claimDocument`.
Test: `documents.test.ts` › "cannot be claimed, and the refusal is the one for a document that does not exist".

**1.4 Paying releases it.** `payFee` records one payment at the flat fee for the
tier screening assigned, and moves the document to `pending_review`. It is
refused for a document that is not `awaiting_payment` or has no tier. The fee
covers every revision round.
Mock: `documents.ts` › `payFee`; fee from `TIER_PRICING` in `lib/config/pricing.ts`.
Test: `documents.test.ts` › "is paid once, at its tier's flat fee, however many times Pay is pressed", "is released once paid…", "refuses to take a fee for a document that is not awaiting payment"; `lib/fees.test.ts` › "the fixtures' payments › exist for every released document and no other, at the tier's flat fee".

**1.5 A failed payment leaves the document awaiting payment**, nothing recorded.
Test: `documents.test.ts` › "is left awaiting payment when the payment fails, and the client can try again".

**1.6 The client never picks the tier.** Screening assigns it once the first pass
has run, from the deal facts. The mock's thresholds (`lib/triage.ts` ›
`assignReviewTier`: employment, or value ≥ ₹1 crore, is senior; an MSA, an MSME
counterparty or value ≥ ₹10 lakh is enhanced) are placeholders for the real
triage. Before paying the client sees only the tier, the fee and the deal facts
behind the tier, never a reason drawn from findings.
No test pins the thresholds.

**1.7 No platform money on an advocate screen.** An advocate sees no document
fee, payment record, invoice or split, and sees whether a consultation is paid,
never its fee or time.
Test: `lib/fees.test.ts` › "the advocate's screens › show no document fee, payment record, invoice or split". This test scans the screens' source files. A backend enforces it by not returning those fields to an advocate at all.

**1.8 Claiming.** A claim is exclusive, and the same advocate claiming again
changes nothing. It is refused unless the advocate declares no conflict with
either party (`noConflictWithEitherParty`), and the declaration is recorded
beside the claim (`conflictDeclaredAt`). A name on the advocate's own declared
conflicts that matches a party stops the claim, and cannot be overridden at claim
time.
Mock: `documents.ts` › `claimDocument`; match in `lib/conflicts.ts` › `declaredConflictWith`.
Test: `documents.test.ts` › "claiming a document › …" (four tests); `lib/conflicts.test.ts`.
The name match is a stand-in. Real conflict checks need party and matter data (SRD 4.2).

## 2. The sign-off gates

**2.1 Sign-off.** `signOffDocument` requires a claiming advocate, no finding
still `pending`, and no citation that is blocked and not withdrawn. It sets
`status = "settled"` and `settledAt`, and builds the execution checklist once.
Nothing reaches a client without a recorded advocate sign-off, so `settledAt`
and `advocate` are the record.
It also refuses anyone but the advocate who holds the claim, re-runs the citation gate first (section 3.3), and is idempotent: signing off a document that is already settled changes nothing, and `settledAt` stays.
Mock: `documents.ts` › `signOffDocument`; the same blockers, as the screen reads them, in `lib/findings.ts` › `signOffBlockers`.
Test: `lib/api/advocate-gates.test.ts` › "signing off › …" (four tests: open finding refused, blocked source refused, another advocate refused, recorded once and idempotent); `lib/api/signoff-recheck.test.ts` (the gate runs again at sign-off); `lib/api/checklist.test.ts` (through to the checklist).

**2.2 The summary is unavailable until sign-off, and the gate is in the API.**
`getSettledSummary` returns `{ state: "not_available" }` for any document that is
not `settled` or `executed`, whatever is stored for it, and the answer carries
nothing of the content. A signed-off document with no summary for this draft
returns `{ state: "none" }`. A summary is shown only for the draft it was written
from (`summary.draft === doc.version`).
Mock: `summaries.ts` › `getSettledSummary`, `summaryResultFor` (the one place the gate lives).
Test: `summaries.test.ts` › "is not available before sign-off, and the answer carries nothing of the content", "stays unavailable before sign-off even if a summary is stored for the document", "is not shown against a text that has changed since it was written", "says so when a signed-off document has no summary".
The mock's summaries are fixtures. A test holds every line to the clauses it cites (`lib/mock/summaries.mock.test.ts`). A generated summary must meet the same bar: it explains the document, never the reader's situation.

**2.3 Delivery is unavailable until sign-off.** `getDelivery` returns
`{ state: "not_available" }` unless the status is `settled` or `executed` **and**
an advocate and a `settledAt` are on record. It then returns the sign-off record
(advocate, Bar enrolment, date), the summary or `null`, and checklist progress,
all read from the one document so they cannot disagree. No title, no content,
before that.
Mock: `delivery.ts` › `getDelivery`.
Test: `delivery.test.ts` › "is not available before sign-off, and says nothing else", "is not available for a sign-off with no advocate or date on record", "holds even when the document says it is signed off but is not (the status is the gate)", "is still handed over when there is no summary for this draft…".

**2.4 PDF and Word are not built.** The controls are disabled with "Downloads
aren't enabled in this preview", and no file is created.
Test: `delivery.test.ts` › "offers downloads that do not work, and builds no file".

**2.5 Executing.** Each step records who marked it and when, and can be taken
back, which clears both. The last applicable step confirmed makes the document
`executed` with `executedAt`, once however many times it is confirmed. Taking a
step back returns it to `settled` and clears `executedAt`. A step that does not
apply (for example an e-signature step for a class that cannot be signed
electronically) never holds execution up.
Mock: `documents.ts` › `toggleExecutionStep`, `attachEvidence`.
Test: `execution.test.ts` (nine tests), including "is one record however many times the last step is confirmed".
**Gap:** the mock does not refuse the call on a document that is not signed off. `execution.test.ts` › "does not execute a document that is not signed off" passes only because such a document has no steps yet. Refuse it explicitly.

**2.6 A generated checklist states no figure and no rule.** It says "Stamp duty
depends on the state of execution and the instrument. Your advocate confirms the
amount before you sign." and "Your advocate confirms whether registration
applies." A rupee figure appears only on a fixture, labelled a sample entry. Do
not add a rate table or a registration threshold until the state schedule is
audited (counsel list).
Mock: `documents.ts` › `buildExecutionSteps`; the e-signature step in `lib/config/esign.ts` › `esignatureStep`, from the Problem Statement's excluded classes, always marked as needing legal confirmation, naming no provider.
Test: `checklist.test.ts` › "states no rupee figure for a … in …" (six documents), "cites no section of any Act", "leaves the amount to the advocate, and never rules registration out"; `lib/config/esign.test.ts`.

## 3. The citation gate

A citation is verified or blocked. Never "probably fine".

**3.1 Exact match only.** `lookupCitation` normalises whitespace and letter case
and **nothing else**, then looks the text up as a corpus label or a corpus ref. A
missing comma, a different section or an extra word is a near-miss, and a
near-miss is blocked. There is no fuzzy matching, and there must never be: a
citation wrongly marked verified is the one failure the gate exists to prevent.
Mock: `lib/citations.ts` › `normaliseCitation`, `lookupCitation`.
Test: `lib/citations.test.ts` › "blocks a near-miss, every one of them", "ignores spacing: padding, runs of spaces, tabs, newlines, non-breaking spaces", "normalises whitespace and case and touches nothing else".

**3.2 Two outcomes, with a reason when blocked.** `verified` carries the corpus's
own wording and `corpusRef`. `blocked` carries what was typed (tidied) and a
reason: `empty` or `not_in_corpus`. There is no third state.
Test: `lib/citations.test.ts` › "blocks empty input", "blocks a ref the corpus does not hold".

**3.3 The gate runs again at every hand-off.** Each citation on the record is
resolved against the corpus afresh when a snapshot is written, on the working
copy and in the snapshot alike. A blocked citation becomes verified only by
matching the corpus, never by being relabelled, and a verified one that no longer
matches becomes blocked. A withdrawal survives it.
Mock: `documents.ts` › `recordVersion`; `lib/citations.ts` › `recheckCitation`, `recheckFindings`.
Test: `lib/citations.test.ts` › "running the gate again on the record › …" (five tests); `documents.test.ts` › "runs the citation gate again, so a citation the corpus no longer holds is blocked", "leaves every citation agreeing with a fresh lookup of its own text".
**The gate also runs at sign-off**, on every citation on the record, before the blockers are read. And a finding an advocate adds takes **no** word of the caller's about a citation's standing: `addFinding` computes each status from the lookup, drops any withdrawal the caller sent, and enters the finding open, marked as added by an advocate.
Mock: `documents.ts` › `signOffDocument`, `addFinding`.
Test: `lib/api/signoff-recheck.test.ts` › "runs the gate again, and refuses while a finding relies on a source that has gone"; `lib/api/advocate-gates.test.ts` › "adding a finding › takes no word of the caller's about whether a citation is verified", "enters the record open, marked as added by an advocate, whatever it arrived as".

**3.4 A blocked citation can be withdrawn, never relabelled.** The advocate
withdraws it with a note. The citation stays on the record as blocked, with who,
when and why. Only a blocked citation can be withdrawn. A finding cannot be
settled, and the document cannot be signed off, while one of its citations is
blocked and not withdrawn. A finding with no verified source left can be settled
only with the advocate's reasoning on the record.
Mock: `documents.ts` › `withdrawCitation`, `updateFinding`, `signOffDocument`; `lib/findings.ts` › `blockingCitations`, `settleNeedsNote`.
Both the withdrawal and the settling now refuse a blank note in the API, not only on the screen.
Test: `lib/api/advocate-gates.test.ts` › "withdrawing a source › …" (three tests) and "settling a finding › …" (four tests); `lib/findings.test.ts` and `lib/citations.test.ts` hold the lookups.

**3.5 The attempt log.** Every citation an advocate **types** is recorded: the
exact input before any tidying, the outcome, the corpus ref or reason, the
advocate, the document and the time. Picking a citation from the corpus is not an
attempt, because it is always verified. The pre-gate fabrication rate (FR-14) is
blocked typed attempts over all typed attempts.
Mock: `lib/api/citations.ts` › `checkCitation`, `listCitationAttempts`.
Test: `lib/api/citations.test.ts` (five tests), including "records exactly what was typed, before any tidying".
Persist it (section 9).

**3.6 The corpus is labels, not statute text.** `lib/mock/corpus.mock.ts` holds a
reference and a label for each entry, and no body text. Never invent statute text,
section numbers or case names. A missing fixture is a question for the legal
owner, not a guess.

## 4. Client visibility, enforced server-side

This is the section the backend most needs to own.

> **In the mock, the client API narrows, and hands back client-shaped types.**
> Every read and write a client screen makes is in `lib/api/client/*`. Each takes
> the organisation, and each returns a type from `lib/types.ts` that is built field
> by field and has no place for what a client may not see: `ClientDocument`,
> `ClientDocumentSummary`, `ClientFinding`, `ClientVersionList`, `ClientDiff`,
> `ClientAuditEntry`, `Delivery`, `SettledSummary`, `ClientConsultation` and the
> export `DataExport`. They are never the internal `ContractDocument`. The narrowing
> code (`lib/findings.ts`, `lib/clientVersions.ts`, `lib/audit.ts`, the shapers in
> `lib/api/client`, `lib/privacy.ts`) runs **inside that layer**, over the in-memory
> store, and not in a screen. Those types are the response shapes a real backend
> returns, and it applies every rule here in the response.
>
> What the mock still does not give you: the store holds the full record, and
> `lib/api/documents.ts` still returns it. That is right for the advocate's screens
> and for nobody else's, so no endpoint that returns it may be reachable by a
> client. The client portal does not import it. Two things hold that: a lint rule in
> `.eslintrc.json` that fails on `ContractDocument`, the internal `Finding`,
> `lib/api/documents` and the other modules that hold or read the internal record,
> in `app/(client)` and the components only the client portal uses; and
> `lib/clientFence.test.ts`, which fails if a client-only component is missing from
> the rule's list of files. The rule does not block every route to the record.
> Appendix B item 7 says which are blocked, which are accepted gaps, and which
> `lib/` modules a client file may use.

### What a client may receive

**Before sign-off:**

- The document's status and tier, and that the fee has been paid. The audit trail records that it was paid and never the amount.
- A version list: for each draft its number, who made it ("First pass", "Your answers", "Advocate's revision"), its date, a clause count and a finding count. The finding count covers only findings the client may know about.
- The **text** of the clauses behind requests addressed to them, and the findings those requests are about.
- Every other clause **only counted** as changed or unchanged, with no text and no clause number, because saying where a draft changed says what it contains.
- A diff limited to those passages.
- A finding an advocate added **only through a request addressed to them**. Never otherwise.
- An activity trail that says a draft was revised without saying where, except for a clause a request to them is about.

**After sign-off, read-only:**

- Every clause in full, every finding with the advocate's disposition in plain words, and the full version history and diff.
- Whether findings the advocate added are included is one switch: `lib/config/visibility.ts` › `SHOW_ADVOCATE_ADDED_AFTER_SIGN_OFF` (currently `true`). It is a product decision for counsel to confirm. Read it from configuration, never hard-code it.

**Never, at any time:**

- The advocate's private notes (`MarginNote`, section 9).
- The pipeline's machinery: rule ids and layer numbers, and internal ids. A finding's number to a client (`ClientFinding.number`, "04") is given when the client may first know of it, counts only what the client has been shown so there is never a gap that says something was kept from them, and never changes. The document's own number for a finding is never given, and a client names a finding by their number and by nothing else.
- Decisions inside a snapshot before sign-off. A snapshot written at a send-back holds the advocate's decisions so far. The client's view of it reads the same line, counts and rows whatever the advocate decided.
- The corpus-review log (the revision-limit entry). It is the advocate's working record.
- Another organisation's documents, invoices or consultations.

Mock (the readers to reproduce on the server): `lib/api/client/shape-document.ts`, `shape-findings.ts`, `shape-versions.ts` and `shape-trail.ts`, which call `lib/findings.ts` › `clientVisibleFindings`, `firstPassFindings`; `lib/clientVersions.ts`; `lib/audit.ts` › `clientAuditTrail`; and `lib/privacy.ts` › `buildDataExport`, which is built from `ClientDocument` and `ClientConsultation`, so a finding is the same number in the export as on the screens.
Test: `lib/findings.test.ts` › "what the client may be told of a document's findings › …"; `clientVersions.test.ts` › "before sign-off › …", "after sign-off › …", "a client's view of snapshots that hold decisions › …"; `lib/audit.test.ts`; `lib/privacy.test.ts` › "the export of a document not yet signed off › …", "never carries the advocate's own notes or the pipeline's machinery"; `lib/api/privacy.test.ts` › "the export › numbers and lists findings exactly as the client's own screens do"; and the leak tests over every fixture in `lib/api/client/*.test.ts` (`markers.ts` › `leaked`, `markersFor`), which search what a client is handed for the strings that must never be in it.

### What an advocate may receive

- A document only if it is released (section 1), and only the consultations on documents they settled.
- Whether a consultation is paid, never its fee, its time or any payment detail.
- No document fee, payment record, invoice or split.
- Their own notes only.

### The consultation question

A client's question, and the advocate's answer, appear **only inside the request**.
They appear in no list, page title, tooltip, audit trail, notification, billing
line or metric. The client's own data export carries them, deliberately. A
backend must keep them out of logs, analytics and any event stream as well.
A client reads, lists and pays their requests through `lib/api/client/consultations.ts`, which returns a `ClientConsultation`: the advocate named as the one who settled the document, and none of the advocate's id, the organisation's id or the client's name. Another organisation's request and one never made are the same "Request not found.", and nothing is paid. Test: `lib/api/client/consultations.test.ts`; `consultations.test.ts` › "where the question may not go › …" (four tests). The four scan the mock's source files; the backend equivalent is a review of every place a request body is written.

## 5. The revision cap, and the round and draft counting rule

**5.1 The cap is one value.** `MAX_REVISION_CYCLES` in `lib/config/revisions.ts`
(currently 3), read through `revisionCycle()` in `lib/revisions.ts`. A round is
one send-back, counted when a document first enters `revision`.

**5.2 What the cap stops, and what it never stops.** At the cap, no new round can
be requested, and the API refuses the request with the reason. Asking for more
**in a round already open is still allowed**, because it starts no new round. The
cap **never blocks settling or sign-off**. The round that uses the last one logs
the case for corpus review, once (`corpusReviewLoggedAt`), in the advocate's
trail only and never the client's.
Mock: `documents.ts` › `requestChange`; `lib/revisions.ts` › `revisionCycle`, `revisionBlockedReason`.
Test: `documents.test.ts` › "the revision limit › lets the configured number of rounds be sent, logs the case on the last, then refuses another", "still lets the advocate settle a finding at the limit"; `lib/revisions.test.ts` (nine tests); `lib/audit.test.ts` › "the revision limit in the trail › …".

**5.3 A round is two hand-offs, each a snapshot.** The advocate sends it back
(`requestChange` writes an `advocate_revision` snapshot, carrying every decision
so far and the request) and the client answers (`respondToChanges` writes a
`client_response` snapshot). So a document sent back N times has **1 + 2N
drafts**, one fewer while a round is open (the first draft is the first pass).
"Round N" is `revisionCount + 1`, **never counted from drafts**.

- `requestChange` writes a snapshot only when it **starts** a round (the status was not already `revision`). A second request in the same round is not another hand-off.
- `respondToChanges` writes a snapshot only when no request is still unanswered.

Test: `lib/mock/versions.mock.test.ts` › "rounds and drafts › agree in every fixture that has been sent back". This test holds every fixture to the rule. A backend integration test should hold every document to it the same way.

**5.4 Snapshots are written at hand-off points only.** First pass finished, send-back, client response. `ContractDocument` is the working copy and may be ahead of the latest snapshot, so diffs compare **snapshots**, never the head. The one exception is the advocate's re-review (`lib/reviewScope.ts`), which compares the head with the draft **before the current one**, not the latest snapshot, because the latest equals the head and the comparison would show nothing.
Test: `lib/reviewScope.test.ts` (24 tests); `documents.test.ts` › "the snapshot written when the first pass finishes › …".

**Gap:** `respondToChanges` does not check that the caller owns the document or that the document is in `revision`. Appendix B, item 5.

## 6. Idempotency and atomicity

A double click must make one payment, one request, one state change.

| Operation | Rule | Mock | Test |
|---|---|---|---|
| Pay the document fee | A document that already has a payment comes back as it is. The check precedes the failure path. | `payFee` | `documents.test.ts` › "is paid once…, however many times Pay is pressed" |
| Pay a consultation | A paid request comes back as it is. Money moves only here. | `payConsultation` | `consultations.test.ts` › "paying › moves money only here, once, however many times it is pressed" |
| Request a consultation | The same question for the same document while it is still `requested` returns the one request. A failure creates nothing. | `requestConsultation` | `consultations.test.ts` › "is made once, however many times the button is pressed", "creates nothing when it fails…" |
| Accept, decline, answer | Repeating changes nothing. | `acceptConsultation`, `declineConsultation`, `answerConsultation` | `consultations.test.ts` › "is one state change however many times it is pressed" (accept and decline), "is sent once, and sending again changes nothing" |
| Claim | The same advocate claiming again resets nothing. | `claimDocument` | `documents.test.ts` › "leaves a document alone that is already theirs…" |
| Training opt-in | Setting what it already is logs nothing. | `setTrainingOptIn` | `lib/api/privacy.test.ts` › "logs every change with its time, and a repeat changes nothing" |
| Deletion request | Asking again keeps the first time. A request, never an erasure. | `requestDeletion` | `lib/api/privacy.test.ts` › "is recorded, and the first time is kept when it is asked again" |
| Confirm the last execution step | `executedAt` is set once. | `toggleExecutionStep` | `execution.test.ts` › "is one record however many times the last step is confirmed" |

**The mock's idempotency is single-threaded.** `requestConsultation` finds the
existing request and creates a new one with no `await` between them, so a second
press that arrives next finds the first. That does not survive a real database.
Use an idempotency key supplied by the client (the mock's key is the question
text, which is not a key) and a unique constraint, inside a transaction. The same
goes for `payFee`, `payConsultation` and the invoice sequence (section 7).

## 7. Immutable invoice numbers

**7.1 What the mock does.** An invoice is not stored. The payment a document or a
consultation carries is the record, and `invoicesFor` derives the invoice from it.
Numbers are `VID-<year>-<4 digits>`, in the order paid, restarting each UTC year,
across both kinds of fee (document and consultation) in one sequence.
Mock: `lib/billing.ts` › `invoicesFor`; `lib/api/billing.ts` › `listInvoices`, `getInvoice`.
Test: `lib/billing.test.ts` › "are numbered in the order paid, so a number never changes", "restart their sequence each year", "is invoiced when it is paid, on its own line, numbered with the document fees", "is not invoiced until it is paid, accepted or not".

**7.2 What the backend must do instead.** A derived number is stable only while
payments arrive in time order and none is ever removed. A late-arriving or
backdated payment would renumber every invoice after it. The backend allocates
the number **once, when the payment is made**, stores it immutably against the
payment, serialises the per-year sequence, and **never recomputes it**.

**7.3 What an invoice says.** What was paid for and when. Never a finding, and
never a consultation's question or answer. A document fee and a consultation fee
are separate lines with separate labels. GSTIN is optional, kept as typed and
trimmed, checked against nothing (there is no register to check it against, and a
wrong guess would turn a client away). A blank GSTIN is none. A billing name is
required.
Test: `lib/billing.test.ts` › "say nothing of what the review found", "carries no question and no answer"; `lib/api/billing.test.ts` › "keep a GSTIN as typed, trimmed, and check it against nothing", "need a name to make invoices out to".

**7.4 Open, for counsel and the accountant:** who issues and who receives a
consultation invoice (a consultation is the advocate's legal service, and the
platform's revenue must stay a flat technology fee); the wording of that invoice;
a proper GST breakup on invoices. The preview issues both from one platform series,
which is a stand-in, and nothing in the real build should copy it until counsel
decides.

## 8. The consultation states

```
requested ──accept──▶ accepted ──(client pays)──▶ accepted + paid ──answer──▶ answered
    └──decline──▶ declined
```

`status` is `requested | accepted | declined | answered`. Payment is not a status:
it is `paidAt` on an `accepted` request.

| Step | Who | Allowed when | Effect | Repeat |
|---|---|---|---|---|
| Request | client | the document is `settled` or `executed` and has an advocate | Free. Stored `requested`, no fee, no payment, no answer. The advocate is **read from the document**, never passed in, never chosen. | Same document and question while `requested` returns the same request |
| Accept | the settling advocate | `requested` | Sets the one flat fee, before GST, from `CONSULTATION.amount` (`lib/config/pricing.ts`). Separate from the document fee, never a share of it. | No change |
| Decline | the settling advocate | `requested` | Free and never chargeable. Refused once accepted. | No change |
| Pay | client | `accepted` with a fee | Sets `paidAt`. A failure leaves it accepted and unpaid. Refused for `declined` and for a request nobody accepted. | Returns it as it is |
| Answer | the settling advocate | `accepted` **and** paid | Sets `answered`, the answer and its time. | No change |

Further rules:

- A question is trimmed, required and at most `MAX_QUESTION_LENGTH` (1500). An answer is trimmed, required and at most `MAX_ANSWER_LENGTH` (4000).
- **The client reads the answer only once the fee is paid.** `forClient` strips the answer until `paidAt` is set, whatever is stored.
- **An advocate sees only requests on documents they settled.** Another advocate's request and a made-up id are the same not-found ("Request not found."), on read and on every action.
- An advocate's list omits the question, the answer and the fee. The question appears only inside the request. The advocate sees `paid` as a boolean, never `fee` or `paidAt`.
- Who sets the fee, who invoices it and who receives it is for counsel (section 7.4). The mock sets it from platform config on acceptance, which is a stand-in.

Mock: `lib/api/consultations.ts` (all of it).
Test: `consultations.test.ts` (29 tests), grouped as "requesting a consultation", "the advocate's inbox", "another advocate's request", "accepting", "declining", "paying", "answering", "where the question may not go".
**Gap:** `requestConsultation`, `payConsultation`, `listConsultations` and `listOrgConsultations` take a document or request id with no organisation check on the client side. Appendix B, item 6.

## 9. What the mock fakes that a backend must persist

Everything below lives in memory or in the browser. It is kept in this tab's
`sessionStorage` (section 9.1) so a refresh does not wipe a demo, and it **dies with
the tab**. None of it is a real store.

| What | Where in the mock | What the backend does |
|---|---|---|
| **Documents, snapshots, findings, citations** | `documents.ts` › `store`, `versionStore` (seeded from `lib/mock/*`) | Persist. Snapshots are append-only, written at hand-off points only (section 5.4). |
| **The citation attempt log (FR-14)** | `lib/api/citations.ts` › `attempts` | Persist each attempt as an event. The pre-gate fabrication rate and the blocked-citation log (E1) read it. |
| **Consent log** (training opt-in, with the time of each change) | `privacy.ts` › `states` | Persist, and keep it after a deletion request: it is the proof a revocation happened. Training use starts **off**. |
| **Deletion request** | `privacy.ts` › `requestDeletion` | Persist the request and its first time. What deletion removes and keeps is pending counsel (`lib/config/privacy.ts` › `DELETION_SCOPE`): the sign-off record and audit trail are meant to be immutable (SRD §4.3), and whether a settled document itself is removed is undecided. |
| **Cookie consent** | `localStorage["vidhata-preview-consent"]` (`lib/config/consent.ts`) | Decline is the default and nothing non-essential runs before "accepted". Store the answer server-side if consent must be provable. The banner and its copy are marked for revision when analytics or any other tool is added. |
| **Sessions** | `localStorage["vidhata-preview-role"]`, `{ "role", "at" }` (`lib/session.tsx`, `lib/session-expiry.ts`) | **Presentation only, no authority.** The server returns the same shell for every route. The portal gate and the not-authorised and session-ended screens are mirrors of a decision the backend must make on every request from a verified session: a client asking for an advocate resource, or an advocate asking for a client one, gets the same response whether the target exists or not. The preview session lasts `SESSION_LIFETIME_MS` (a working day). |
| **Advocate margin notes** | the tab state (`lib/api/notes.ts`; `localStorage` before the persistence batch) | Persist scoped by the **authenticated** advocate, never by an id the page supplies. Never visible to a client, not findings, no state, no part of sign-off. Settlement notes (D6) are a different kind, released only at sign-off (see the next row but one). |
| **Payout statement (D10)** | derived, not stored: `consultations.ts` › `getPayoutStatement`, from the consultation store | One line per consultation the advocate **answered**: the document, the day it was answered and the consultation fee before GST. In the preview the fee is the one configured amount (`CONSULTATION` in `lib/config/pricing.ts`), recorded when the request is accepted. **Who sets the fee and who receives it is on the counsel list, and nothing here decides either**: the backend must not read an answer to that from this screen. Scope by the authenticated advocate, so another advocate's request is the same not-found as a missing id. Nothing derived from the platform's document fee, no split, no ranking, rating or comparison. A real payout (settlement, tax, who issues the invoice) is not designed. |
| **Client notifications (C9)** | derived, not stored: `lib/notifications.ts`, read through `lib/api/client/notifications.ts` | Worked out on each visit from the client's document summaries and consultation requests, both as the client reads them, so a sentence cannot carry more than the client types hold: never an advocate's name before sign-off, a count of findings the client was not given, an advocate's decision, any question or answer text, or a clause the client was not asked about. The text holds no number at all. Covers: screened and awaiting the fee, with an advocate, an advocate's request to the client, settled, and a consultation request accepted, declined ("Nothing was charged") or answered. **The preview has no read state: there is no unread count and nothing to dismiss. A backend needs one**, stored per user and per event with a stable event id (the `id` here is stable for the same update), so that a notification can be read, dismissed and counted, and an event is kept after the state that produced it has moved on. **A backend also needs to expire or collapse old notifications.** In the preview a declined consultation request stays in the feed for ever, because the feed is derived from state and the state never leaves "declined"; a stored feed should age such notices out, or fold them into one line, so it does not fill with outcomes nobody needs to be told again. |
| **Settlement notes (D6)** | `settlementNotes` on the document, written by `settlement-notes.ts`, released by `signOffDocument` | A deliberate note from the advocate to the client about one clause, at most one per clause. Written as a draft; marking it to share is a second, explicit act; **only sign-off releases one, and only a marked one, in the same transaction as the sign-off** (the preview does it in one assignment), so no other endpoint may set the release time. Writes are the holder's alone, scoped by the authenticated advocate, with the same not-found as the other advocate writes for an unpaid or missing document. A note on a clause the signed draft lacks stops sign-off and names it. After sign-off a note is immutable. **Open for counsel:** there is no correction path for a wrong note once released, and what there should be is undecided. A client reads only released notes, only after the recorded sign-off, through one shaper that names its fields: before it the list is empty for every document alike, so nothing says that a note exists. Released notes are in the delivery, the client's data export and what the agent may quote. They are not working notes (`notes.ts`), which never leave the advocate portal and have no control that makes one a settlement note. The byline is the sign-off record's, which already names the advocate. |
| **The document agent's three stages** | `lib/chat/*`, wired by `lib/mock/chat.mock.ts` | A gate before (`classifyQuestion`: explain, advise or unclear), a reply drawn only from the settled clauses, their summary and the released notes (`generateReply`, each reply carrying its grounds), and a check after (`checkReply`) that withdraws any reply with no grounds, an invented ground, a misquote, text it may not hold, a departure from its script, advice in its own words, or a law nothing vouches for. **All three are fixtures.** The classifier is a rule table held to `lib/chat/questions.fixtures.ts`, which a real classifier must pass too; the generator and the check are the contract a real model is held to, behind the same signatures. Any advice in a question makes the whole question advice; an unclear question gets a prompt to rephrase and never an offer of a consultation. The advocate's released note is quoted only on the clause asked about, labelled as theirs, and the advice rule is not applied to the quote. **Open for counsel:** whether the agent may quote advice that an advocate wrote inside a released note. Withdrawn replies are counted in the tab only, so the metrics say "No data source yet"; a backend should record them. |
| **Onboarding** | `onboarding.ts`, `advocate.ts` | An invitation is single-use and expires. The password is a stand-in, never stored, so a real identity provider replaces that step. Declared conflicts merge into the one list the claim check reads. Onboarding assigns nothing: advocates claim. Nothing about an advocate is public, ranked, rated or searchable. |
| **Billing profile** | `billing.ts` › `profiles` | Persist per organisation. |
| **Account: profile and team** | `account.ts` › `accounts` (C10) | A name, an email and a list of members (owner, member, invited). A preview invitation sends nothing and every member has the same access. Real organisation membership, roles, who may invite or remove, and protection of the last owner are backend work (section 10.2). |
| **Corpus-review log** | `corpusReviewLoggedAt` on the document | Persist. Advocate-only. |
| **Audit trail** | `lib/audit.ts`, derived and not stored | Either derive it as the mock does or store events. Either way every entry names its actor, and the client's trail is the filtered one (section 4). |
| **Execution evidence** | `attachEvidence` keeps the **file name only** | Real upload and storage. |

**Fixtures that stand in for generation.** None of these is a contract the
backend inherits; each is a thing to build or replace:

- The pipeline: `startAnalysis` and `reconcileAnalysis` (a timer, then a fixed set of findings copied from the MSA fixture), and clause drafting (`buildClauses`).
- Summaries (`lib/mock/summaries.mock.ts`), held to the clauses they cite by test.
- Tier assignment (`lib/triage.ts`, placeholder thresholds).
- The document agent (`lib/chat/*`, wired by `lib/mock/chat.mock.ts`) and the review agent (`lib/mock/review-agent.mock.ts`). The document agent explains the settled text and never advises, through a gate, a grounded reply and a check, all three fixtures (see the state table). The review agent reads the first pass back and never decides.
- `readBrief` (`lib/api/brief.ts`), which reads what a brief states and guesses nothing, the state of execution above all.
- The contact form and the advocate invitation request (`contact.ts`, `advocate-invite.ts`) send nothing.
- The preview banner says what is true of all of it: "Sample data, kept in this browser tab only. Nothing is sent."

### 9.1 The tab state, and what it must never become

`lib/api/state.ts` writes every mock store to one `sessionStorage` key
(`vidhata-preview-state`) after each mock call, and on page hide. It reads it back
when the page loads. Rules, each held by `lib/api/state.test.ts`:

- **Per tab.** `sessionStorage`, not `localStorage`: it dies with the tab and two tabs never share it. "Reset demo data" in the preview banner clears it.
- **Versioned.** The stored state carries `SCHEMA_VERSION` and a fingerprint of the fixtures, the corpus and the prices it was built from. Any mismatch discards **everything**, not a part, because the slices refer to one another.
- **Safe to read.** A value that is not JSON, or not the shape expected, is discarded and the fixtures are used. It never crashes a screen.
- **JSON only.** A time is an ISO string and stays one. No store holds a `Date`.
- **Same rules after a restore.** A restored paid document paid again makes no second payment; a restored consultation request, payment and answer stay one each. `?fail=1` behaves exactly as before.

**A real backend keeps the consultation question and answer out of anything the
client can store.** In the mock they are in the tab state, in plain text, because
the mock is a single tab with no one else to read it. A real client must not keep
them in `localStorage`, `sessionStorage`, IndexedDB or a cookie, nor in any cache
or log the browser keeps beyond the request. The same goes for the settled text
of a document, the advocate's notes, and anything else section 4 restricts: the
tab state is a demo convenience and **not a model for client storage**.

## 10. Required behaviour that no screen exercises yet

**10.1 Triage override logging (SRD FR-15).** When an advocate overrides routing,
that is logged: who, when, from which tier to which, and why. No screen lets an
advocate change a tier today, and none is to be built now. It is required of the
backend. Until it exists, the triage override rate in the E1 metrics page has
"No data source yet".

**10.2 Organisations, roles and members.** The preview has one client
organisation (`MOCK_CLIENT_ORG`) and one advocate (`CURRENT_ADVOCATE`). The C10
profile and the team members list are mock: invite and remove change an
in-memory list and nothing else. Real organisation membership, roles, who may
invite or remove, protection of the last owner, and organisation-level scoping of
every read and write are **backend work**.

**10.3 Corpus effective dates (E2) and corpus-currency lag.** Deferred. The
effective-date ranges come from the legal owner, who has not supplied them. When
they arrive they are added as fixtures. Until then neither the rules list nor the
currency-lag metric has a source.

**10.4 Stamp duty and registration.** The legal owner builds the state stamp-duty
schedule and the registration rules from audited schedules. A generated checklist
states nothing until then (section 2.6).

**10.5 For counsel and the accountant** (also in `docs/superpowers/plans/2026-10-03-money-and-privacy.md`): who issues and receives a consultation invoice, and its wording; a proper GST breakup; the deletion scope and wording; whether a settled document is removed or kept on deletion; the security page and the training opt-in wording; the terms of advocate empanelment, which the onboarding page states none of; the wording of the advocate's sign-off attestation, which no longer cites a Bar Council rule number until counsel confirms which rule, if any, applies; and the cookie banner's "Decline non-essential" and "Accept non-essential" buttons, which imply a choice while nothing non-essential runs.

---

## Appendix A: function reference

Every function the screens call. "Refuses" lists what throws; "null" means the
read returns nothing instead.

### `lib/api/client/*`: what a client screen calls

Every one takes the organisation first, and returns a client type (section 4).
**Another organisation's document and one that is not there are the same answer**
(`null` for a read, "Document not found." for a write), and a request that is not
the organisation's is the same "Request not found." as one never made, so asking
cannot show that something exists. These sit over the functions in the sections
below, which return the full record and are for the advocate's screens and for the
client layer itself.

| Function | Inputs | Returns | Refuses or returns null |
|---|---|---|---|
| `getClientDocument` | `orgId`, `id` | `ClientDocument`, or `null` | |
| `listClientDocuments` | `orgId` | `ClientDocumentSummary[]`, any state | |
| `createClientDraft` | `orgId`, `IntakeInput` | `ClientDocument`, `draft`, the organisation's whatever the company name in the form says | |
| `startClientAnalysis` | `orgId`, `id` | `ClientDocument`, `analysing` | "Document not found."; `startAnalysis`'s own |
| `payClientFee` | `orgId`, `id` | `ClientDocument`, `pending_review`, `paidAt` set and never the amount. Paying twice pays once. | "Document not found."; `payFee`'s own |
| `respondToClientRequests` | `orgId`, `id`, `{ number: answer }` | `ClientDocument`; back to the advocate | "Document not found."; "Request not found." for any number that is not a request addressed to this client, and then **nothing is recorded**, not even answers to real requests |
| `getClientRequest` | `orgId`, `documentId`, `number` | the `ClientFinding` a request is addressed about, or `null` for every other case alike | |
| `toggleClientStep` | `orgId`, `id`, `kind`, `complete` | `ClientDocument`; `executed` when the last applicable step is done. The step names the organisation. | "Document not found."; "The execution checklist is not available yet." without a recorded sign-off |
| `attachClientEvidence` | `orgId`, `id`, `kind`, `fileName \| null` | `ClientDocument` | as above |
| `getClientVersions` | `orgId`, `id` | `ClientVersionList`: the drafts as counts, newest first; never the drafts | `null` |
| `getClientDiff` | `orgId`, `id`, `a`, `b` | `ok` with a `ClientDiff`, or `same_draft` or `unknown_draft` | `null` |
| `getClientTrail` | `orgId`, `id` | `ClientAuditEntry[]` | `null` |
| `getClientDelivery` | `orgId`, `id` | `not_available` or `ready` with the delivery | "Document not found." |
| `getClientSummary` | `orgId`, `id` | `{ title, result }`; `title` is `null` unless the summary is the client's to read | "Document not found." |
| `requestClientConsultation` | `orgId`, `documentId`, `question` | `ClientConsultation` | "Document not found."; not signed off; empty or too long |
| `listClientConsultations` | `orgId`, `documentId` | `ClientConsultation[]`, newest first, the answer only once paid | "Document not found." |
| `payClientConsultation` | `orgId`, `id` | `ClientConsultation` | "Request not found."; declined; not accepted; the payment failure |

Tests: `lib/api/client/documents.test.ts`, `actions.test.ts`, `checklist.test.ts`,
`draft.test.ts`, `versions.test.ts`, `trail.test.ts`, `requests.test.ts`,
`delivery.test.ts`, `consultations.test.ts`, `numbers.test.ts` and
`shape-findings.test.ts`. Each organisation check has a test that fails without it,
and the leak tests search every fixture's output for what must not be in it.

### `lib/api/documents.ts`

The advocate's reads and writes, and the store under the client layer. They return
the full record. A client screen does not call them.

| Function | Inputs | Returns | Refuses or returns null |
|---|---|---|---|
| `isReleased` | `{ status }` | boolean | |
| `getQueuePriority` | document | number (senior 0, enhanced 1, standard 2, untiered last) | |
| `listDocuments` | `orgId?` | documents. With `orgId`: that organisation's, any state. Without: released only (the advocate queue). | |
| `getDocument` | `id` | document or `null` | |
| `getDocumentForReview` | `id` | document, or `null` if missing **or** unreleased | |
| `getDocumentVersions` | `id` | snapshots, oldest first | |
| `createDraftDocument` | `IntakeInput`, `orgId?` | the new document, `draft`, the organisation's. The preview identity when none is given. | |
| `startAnalysis` | `id` | document, `analysing` (a `draft` only) | "Document not found." |
| `payFee` | `id` | document, `pending_review`, `payment` set | not found; "not awaiting payment"; the payment failure |
| `claimDocument` | `id`, advocate, `ConflictDeclaration` | document, `under_review`, `claimedAt`, `conflictDeclaredAt` | already claimed by another; unreleased (as not found); no declaration; declared-conflict match |
| `requestChange` | `docId`, `findingId`, `request`, advocate `{ id, name }` | document, `revision` | past the cap; document or finding not found; unreleased (as not found); not the holder |
| `respondToChanges` | `docId`, `{ findingId: answer }` | document; back to `under_review` or `pending_review` when nothing is left unanswered | not found |
| `withdrawCitation` | `docId`, `findingId`, `citationId`, `note`, advocate `{ id, name }` | document | not found; unreleased; not the holder; blank note; "Only a blocked source can be withdrawn." |
| `updateFinding` | `docId`, `findingId`, `{ disposition, overrideNote }`, `advocateId` | document. Reopening (`pending`) clears the note and the time. | not found; unreleased; not the holder; settling while a source is blocked and not withdrawn; settling with no verified source and no note |
| `addFinding` | `docId`, `Finding`, `advocateId` | document, the finding attached to its clause. Enters open, `source: "advocate"`, each citation's status computed from the lookup. | not found; unreleased; not the holder; a finding id already on the record |
| `signOffDocument` | `docId`, `advocateId` | document, `settled`, `settledAt`, checklist built. Idempotent once settled. The citation gate runs first. | not found; unreleased; not the holder; a finding pending; a citation blocked and not withdrawn |
| `toggleExecutionStep` | `docId`, `kind`, `complete`, `actorName` | document; `executed` when the last applicable step is done | not found |
| `attachEvidence` | `docId`, `kind`, `fileName \| null` | document | not found |

### `lib/api/delivery.ts`, `lib/api/summaries.ts`

| Function | Inputs | Returns | Refuses |
|---|---|---|---|
| `getDelivery` | `documentId` | `not_available` or `ready` with the delivery | "Document not found." |
| `getSettledSummary` | `documentId` | `not_available`, `none` or `ready` | "Document not found." |
| `summaryResultFor` | document in hand | the same three states (the one gate) | |

### `lib/api/consultations.ts`

| Function | Inputs | Returns | Refuses |
|---|---|---|---|
| `requestConsultation` | `documentId`, `question` | the request | not found; not signed off; empty or too long |
| `listConsultations` | `documentId` | the document's requests, newest first (the answer only once paid) | |
| `listOrgConsultations` | `orgId` | the organisation's requests, for its export and invoices | |
| `payConsultation` | `id` | the request | not found; declined; not accepted; the payment failure |
| `listAdvocateConsultations` | `advocateId` | summaries without question, answer or fee | |
| `getAdvocateConsultation` | `advocateId`, `id` | the request with its question, or `null` | |
| `acceptConsultation` | `advocateId`, `id` | the request | "Request not found." (also for another advocate's); declined |
| `declineConsultation` | `advocateId`, `id` | the request | not found; accepted or answered |
| `answerConsultation` | `advocateId`, `id`, `answer` | the request, `answered` | not found; declined; not accepted; unpaid; empty or too long |

### `lib/api/billing.ts`, `lib/api/privacy.ts`, `lib/api/citations.ts`

| Function | Inputs | Returns | Refuses |
|---|---|---|---|
| `listInvoices` | `orgId` | invoices, newest first | "Could not load your invoices." |
| `getInvoice` | `orgId`, `number` | the invoice or `null` | as above |
| `getBillingProfile` | `orgId` | name and GSTIN | |
| `saveBillingProfile` | `orgId`, `{ name, gstin }` | the saved profile | no name |
| `getPrivacy` | `orgId` | training opt-in, consent log, deletion request | |
| `setTrainingOptIn` | `orgId`, `granted` | state; logs only a change | |
| `requestDataExport` | `orgId` | `{ fileName, contents }`, built from `ClientDocument` and `ClientConsultation`, the types the screens read, so a finding is the same number in the file as on a screen | |
| `requestDeletion` | `orgId`, `{ understood: true }` | state; the first time kept | no confirmation |
| `withdrawDeletion` | `orgId` | state | |
| `checkCitation` | `documentId`, `advocateId`, `input` | the lookup; records the attempt | |
| `listCitationAttempts` | none | attempts, oldest first | |

### `lib/api/metrics.ts`

| Function | Inputs | Returns | Refuses |
|---|---|---|---|
| `getMetrics` | none | the override rate, the addition rate, the pre-gate fabrication rate, the blocked-citation log, and `no_source` for the triage override rate and the corpus-currency lag | the failure of either read |

It counts over released documents only (what an advocate may read), reads findings (`disposition`, `source`) and the citation attempt log, and reads nothing about money or a consultation. Test: `lib/api/metrics.test.ts` › "leave a document awaiting payment out of every figure, until it is paid", "what the metrics read › is no fee, no payment, no invoice and no consultation". A figure with nothing behind it is `no_source`, never a number: the backend must not fill the triage override rate until override logging exists (section 10.1), nor the corpus-currency lag until the corpus carries effective dates.

### `lib/api/account.ts`

| Function | Inputs | Returns | Refuses |
|---|---|---|---|
| `getAccount` | `orgId` | the profile and the team | "Account not found." |
| `saveProfile` | `orgId`, `{ name, email }` | the account; the owner's line follows | blank name; not an email address; an address that is someone else's on the team |
| `inviteMember` | `orgId`, `email` | the account. The same address again is the one invitation. | not an email address; an address already on the team |
| `removeMember` | `orgId`, `memberId` | the account. Someone already gone changes nothing. | the owner |

### Advocate and public

| Function | Notes |
|---|---|
| `lib/api/advocate.ts` › `getAdvocateProfile`, `setAdvocateAvailability`, `addDeclaredConflict`, `removeDeclaredConflict`, `recordOnboarding`, `declaredConflictNames` | `declaredConflictNames` is the one list the claim check reads. |
| `lib/api/onboarding.ts` › `getInvite`, `completeOnboarding`, `onboardingProblems` | Single-use, expiring invitations. Minimum password length is a stand-in. |
| `lib/api/advocate-invite.ts` › `requestAdvocateInvite`, `inviteProblems` | Sends nothing. |
| `lib/api/notes.ts` › `listNotes`, `addNote`, `updateNote`, `deleteNote` | Per authenticated advocate, never client-visible. |
| `lib/api/brief.ts` › `readBrief`, `intakeFromReading` | Reads what is stated, guesses nothing. |
| `lib/api/contact.ts` › `sendContactMessage` | Sends nothing. |

---

## Appendix B: rules the mock leaves to the screen

A backend that copies the mock copies each of these. Each must be enforced on the
server. Items marked **closed** were gaps in the first draft of this document and
are now held in the mock and by test; they stay here so the backend team knows
they were once open and why.

1. **Caller identity and release on every advocate write. Closed.** `requestChange`, `updateFinding`, `addFinding`, `withdrawCitation` and `signOffDocument` now take the caller's id, refuse an unreleased document as not found, and refuse anyone who does not hold the claim (`documents.ts` › `heldDocument`). Tests: `advocate-gates.test.ts` › "an advocate's writes › …".
2. **Citation status is trusted on write. Closed.** `addFinding` computes it from the lookup; sign-off re-runs the gate.
3. **A withdrawal needs a note. Closed.**
4. **Settling without a verified source needs a note. Closed.**
5. **`respondToChanges` has no owner or state check. Partly closed.** The client function (`respondToClientRequests`) checks the organisation and that every answer is to a request addressed to the client. The mock still does not refuse an answer when the document is not in `revision`. A backend refuses it when no round is open.
6. **Client reads and writes are not scoped to an organisation. Closed for the client.** Every client read and write is in `lib/api/client/*` and takes the organisation, and another organisation's document, request or invoice is the same not-found as a missing one (Appendix A). The functions below it still take a bare id, which is right for the advocate's screens (gated by release and claim) and for the client layer. A backend derives the organisation from the session and takes it from nowhere else.
7. **Client visibility** (section 4). **Closed in the types, open in the store.** What a client is handed is a client type, built field by field, with a leak test over every fixture. What is left, for the backend and for later:
   - The store holds the full record and `lib/api/documents.ts` returns it. No endpoint that does so may be reachable by a client.
   - **The fence.** A lint rule (`no-restricted-imports`, an error, in `.eslintrc.json`) applies to `app/(client)` and to the 21 components only the client portal uses. `lib/clientFence.test.ts` computes those components from the imports and fails if one is missing from the rule's list, if the list names a file that is gone or that the advocate portal also uses, if the rule is weakened, if a module that holds the internal record is taken off the blocked list, or if a module a client file needs is put on it. It was proved on real files: a forbidden import failed `npm run lint` with the fence's message, and removing it passed.
   - **What the fence blocks.** By alias, by relative path and with or without a file extension: `ContractDocument` and the internal `Finding` from `lib/types` (as `import type`, an inline `type` modifier, renamed, or a namespace import), a re-export of them, and every import of `lib/api/documents`, `lib/mock/documents.mock`, `lib/api/consultations`, `lib/api/delivery`, `lib/api/summaries`, `lib/api/notes`, `lib/api/advocate`, `lib/findings`, `lib/audit`, and the advocate's `lib/api/citations`, `metrics`, `onboarding` and `advocate-invite`. Of 26 routes to the record tried against the committed rule, 21 are caught.
   - **Accepted gaps, left to review.** A dynamic `import()` or `require()` of a blocked module, and an inline type `import("@/lib/types").ContractDocument` or `.Finding`, are not caught. Closing them needs a custom rule, and nobody writes them by accident here. A client component that is on neither list is caught by the completeness test and not by lint.
   - **Which `lib/` modules a client file may use.** The 36 fenced files import only these: the client layer (`lib/api/client/documents`, `versions`, `trail`, `delivery`, `consultations`); the organisation-scoped reads that return their own types (`lib/api/billing`, `account`, `privacy`, `brief`, `lib/billing`); presentation and config that read no record (`lib/clientVersions`, `lib/client-workspace`, `lib/moves`, `lib/coverage`, `lib/term`, `lib/utils`, `lib/session`, `lib/config/*`); `lib/types` for everything except `ContractDocument` and `Finding`; and fixtures that are not documents (`lib/mock/client.mock`, `chat.mock`, `intake-options.mock`). `lib/findings` and `lib/audit` hold the narrowing code the client layer runs, so no client file imports them.
   - **The advocate's modules are on the list too.** `lib/api/citations`, `metrics`, `onboarding` and `advocate-invite` are blocked, though no client file imports them today, because a fence is cheaper to widen before something uses them. The day a client screen needs part of one (a source shown as verified, say), that part is exposed through `lib/api/client` and the module stays blocked. A backend does not rely on any of this: it returns client types and nothing else.
   - The shared document workspace reads a `WorkspaceDocument`, which the advocate's record satisfies and a client's is built to (`lib/client-workspace.ts`). It has no place for the organisation, the advocate's id, the rule or layer behind a finding, the override note, when it was decided, who asked for a change, or who withdrew a source. It builds no trail and works out no numbers itself: each portal gives its own.
   - `lib/privacy.ts` is no longer narrowing code. It builds the export from client types inside `requestDataExport`.
8. **Execution on an unsigned document. Closed for the client.** `toggleClientStep` and `attachClientEvidence` refuse a document with no recorded sign-off. The internal `toggleExecutionStep` and `attachEvidence` still do not, and a backend refuses at the write.
9. **Consultation requests are keyed by question text.** Use a client-supplied idempotency key.
10. **No length cap on change requests, notes or findings.** Consultations have caps; these do not.
11. **Invoice numbers are derived**, not allocated (section 7).
