# Vidhata frontend: what is done, what was checked, and how to connect a backend

Written for the backend team, and for any frontend developer who joins. Step by step.

State of the repo when this was written: 8 October 2026, `main` at `ef30459`. `npm run check` (typecheck, lint, tests) passes with 73 test files and 791 tests.

## How to read this

| If you want to | Read |
|---|---|
| A one-page picture of the whole job | Part 1 and the fast path in Part 5 |
| To know what the frontend already does | Part 2 |
| To know what was verified, and what the check boxes mean | Part 4 |
| To connect a backend | Part 5, in order |
| To turn the public site's prompt bar and sign-in page on or off | Part 7 |
| The exact request and response shapes | `lib/types.ts`, and `docs/api-contract.md` Appendix A |
| The rules the backend must enforce | `docs/backend-handover-checklist.md` |

Three documents hold the detail, and this one ties them together:

- `docs/api-contract.md`: what each `lib/api` function promises, the rule behind it, the mock function and the test that holds it.
- `docs/backend-handover-checklist.md`: one line per rule a backend must enforce itself.
- `docs/superpowers/plans/2026-10-04-client-shaped-api.md`: why the client gets its own response types, and how that was built.

Where this guide and the code disagree, the code and its tests are the record, and this guide is wrong and should be fixed.

---

## Part 1. The picture in one page

**The product.** A client describes a deal. AI drafts a contract from a curated clause corpus. A seven-layer pipeline checks it against Indian statute. An empanelled advocate adjudicates every finding and signs off. The client gets the settled document plus an execution checklist (stamping, registration, e-signature validity).

**The frontend is finished as a prototype and runs entirely without a backend.** Every screen calls an async function in `lib/api/*`. Those functions read and write an in-memory store and wait a random few hundred milliseconds so the screens behave as they would over a network. That store is the mock. It is kept in the browser tab's `sessionStorage` so a refresh keeps a demo.

**The mock is the contract.** The rules that matter (who may see what, what must be paid or signed before the next step, what a double click must not do) are written into the mock functions and held by tests. A real backend has to enforce the same rules itself, because a screen is never a security boundary.

**What integration means.** Replace the body of each `lib/api/*` function with a call to the backend. Keep the function names, the arguments and the return types. The screens do not change. The mock, its fixtures and its tests are then deleted or turned into acceptance tests.

**What must not be copied from the mock.** The mock has no identity (the screen passes `orgId` and `advocateId`), no real persistence, derived invoice numbers, and a status that advances when a document is read. Part 5 says what to do about each.

---

## Part 2. What is done in the frontend

### 2.1 Screens

Everything below exists, works against the mock, and has loading, empty and error states where it lists things.

**Client portal** (15 routes under `app/(client)`):

| Route | What it does |
|---|---|
| `/dashboard` | Greeting and the prompt box, with a brief typed on the landing page carried through sign-in |
| `/documents` | The client's documents, any state, and the prompt box that starts a draft |
| `/new` | The intake wizard (type, parties, terms, review); opens pre-filled when a brief was incomplete |
| `/documents/[id]` | One document: status, the requests addressed to the client, payment, the answers form |
| `/documents/[id]/history` | Versions and the diff, limited before sign-off to the passages the client was asked about |
| `/documents/[id]/delivery` | After sign-off only: the recorded sign-off, the summary, released notes |
| `/documents/[id]/summary` | The summary of the settled clauses |
| `/documents/[id]/checklist` | The execution checklist (stamping, registration, e-signature) |
| `/documents/[id]/chat` | The document agent, which explains the settled text and never advises |
| `/documents/[id]/consultation` | Ask the advocate who settled the document; pay an accepted request |
| `/billing`, `/billing/[id]` | Invoices and the billing profile |
| `/notifications` | Notices worked out from the client's own documents and requests |
| `/settings` | Profile and team |
| `/settings/privacy` | Training opt-in, data export, deletion request |

**Advocate portal** (8 routes under `app/(lawyer)`):

| Route | What it does |
|---|---|
| `/queue` | Released documents only (paid and screened), claim with a conflict declaration |
| `/review/[id]` | The review workspace: clauses, findings with their sources, working notes, the review agent |
| `/review/[id]/sign-off` | Blockers, notes to the client, confirmations, sign-off |
| `/consultations`, `/consultations/[id]` | Requests on documents the advocate settled; accept, decline, answer |
| `/payouts` | The advocate's consultation payout statement |
| `/metrics` | Override rate, addition rate, fabrication rate, blocked-citation log |
| `/profile` | Availability and declared conflicts |

**Public site** (13 routes under `app/(public)`, plus the home page): `/login`, `/advocate-login`, `/advocate-invite`, `/advocate-onboarding/[token]`, `/contact`, `/contracts`, `/pricing`, `/privacy`, `/sample`, `/scope`, `/security`, `/terms`, `/lawyer-login`. Which of these show a sign-in or a prompt bar depends on the preview-mode flag (Part 7).

### 2.2 Behaviour that is built and held by tests

These are rules, not just screens. Each is listed with its rule in the checklist.

- **Release gating.** An advocate never sees a document until it is paid (`isReleased`). An unpaid document and a missing one give the same "Document not found."
- **Sign-off.** Needs the holding advocate, no finding pending and no blocked citation. It records the advocate and the time. Nothing reaches a client without that record.
- **The citation gate.** A citation is verified or blocked, matched exactly, re-run at every hand-off and at sign-off, never relabelled. A blocked one can only be withdrawn, with a note.
- **Client visibility.** The client is handed client types built field by field (`ClientDocument`, `ClientFinding`, and so on), never the internal record. Before sign-off the client sees no draft body, only the passages behind requests addressed to them.
- **Rounds and revisions.** A round is two hand-offs; "Round N" is `revisionCount + 1`. A configured limit stops new rounds and never blocks settling.
- **Consultations.** Requested, accepted, declined, answered; one flat fee set on acceptance; money moves only when the client pays; the answer is read only once paid.
- **Notes.** Working notes are private and, after sign-off, append-only. Settlement notes are written as drafts, marked to share, and released only by sign-off.
- **Idempotency.** Paying, requesting, claiming, deleting and signing off are repeat-safe. A second press on the send, new-draft and wizard buttons is dropped by a re-entry guard.
- **Preconditions on writes.** A client's answer is taken only while the document waits on one. Analysis starts only from a draft. The checklist is worked only on a signed-off document with applicable steps. A bad draft is refused with the intake form's own messages.
- **No amounts the product cannot stand behind.** A generated checklist states no stamp-duty figure and no registration rule. Fees are flat whole-rupee numbers, never a percentage or share.
- **The document agent.** Three mocked stages (a gate before, a reply grounded only in the settled text, a check after) that all fail closed. It exists only for a signed-off document.

### 2.3 What is deliberately fake

Nothing below is a contract the backend inherits. Each is a thing to build or replace.

| Fake | Where | What a backend does |
|---|---|---|
| Sign-in and sessions | `lib/mock/auth.mock.ts`, `lib/session.tsx`, `PortalGate` | Real identity provider, server-verified session on every request |
| The pipeline | `startAnalysis`, `reconcileAnalysis`, `buildClauses` | A real screening job |
| Tier assignment | `lib/triage.ts` (placeholder thresholds) | The real triage |
| Summaries | `lib/mock/summaries.mock.ts` | Generation, held to the clauses it cites |
| The document agent and the review agent | `lib/chat/*`, `lib/mock/chat.mock.ts`, `lib/mock/review-agent.mock.ts` | A model behind the same signatures, held to the same question set |
| Payments | "Pay (preview)" buttons | A real payment provider, with an idempotency key |
| Invoices | `lib/billing.ts` derives them | Allocate the number once, at payment |
| Evidence upload | `attachEvidence` keeps a file name | Real upload and storage |
| Downloads | PDF and Word are disabled controls | Build the files |
| E-signature | "Sign electronically (preview)" takes no signature | A provider, and legal confirmation of which types may be signed electronically |
| Contact and invitation forms | `contact.ts`, `advocate-invite.ts` | Send, to a monitored inbox |
| The citation corpus | `lib/mock/corpus.mock.ts` (labels and references only, no statute text) | The legal owner's audited corpus |

---

## Part 3. How the code is arranged

### 3.1 The one rule that makes integration easy

**A component never calls `fetch`.** Every read and write goes through a function in `lib/api/*`. A lint rule and a test (`lib/clientFence.test.ts`) hold this and a second rule: the client portal may import only the client layer. So the whole backend surface is the exported functions of `lib/api`, and nothing else in the app talks to data.

### 3.2 Three layers

```
screens and components
        |
        v
lib/api/client/*        the CLIENT layer: takes the organisation, returns client types
        |
        v
lib/api/*               the INTERNAL layer: the advocate's reads and writes, and the
        |               store under the client layer; returns the full record
        v
the mock store          lib/api/documents.ts (store), consultations, privacy, ...
(lib/mock/* fixtures, saved by lib/api/state.ts)
```

- **Client layer.** `lib/api/client/*`. Every function takes the organisation first and returns a type from `lib/types.ts` that has no place for what a client may not see. These types are the response shapes a backend returns to a client. This is where the visibility rules (checklist section 2) live today.
- **Internal layer.** `lib/api/documents.ts` and friends. Returns the full `ContractDocument`. It is right for the advocate's screens (gated by release and claim) and for nobody else. No endpoint returning it may be reachable by a client.
- **Store.** In-memory arrays and maps, seeded from `lib/mock/*` and saved to `sessionStorage` by `lib/api/state.ts`.

### 3.3 The files that matter

| Path | What it is |
|---|---|
| `lib/types.ts` | Every shape: `ContractDocument`, `Finding`, `ClientDocument`, `Consultation`, `PrivacyState`, and the rest. **The response shapes live here.** |
| `lib/api/*.ts` | The functions to replace. `docs/api-contract.md` Appendix A lists them all. |
| `lib/api/client/*.ts` | The client layer. `shape-*.ts` hold the narrowing a backend must do itself. |
| `lib/api/delay.ts` | `randomDelay`, `shouldSimulateFailure`, and `MockApiError`, which carries the sentence a person reads. Mock only. |
| `lib/api/state.ts` | Saves the mock to `sessionStorage`. Mock only. |
| `lib/api/testing.ts` | Test helpers that build a document in any state. Mock only. |
| `lib/config/*` | Fees (`pricing.ts`), the revision limit, visibility switch, e-signature classes, consent and privacy wording. Single sources of truth. |
| `lib/mock/*` | Fixtures. Delete or replace when the backend serves the data. |
| `lib/findings.ts`, `lib/clientVersions.ts`, `lib/audit.ts`, `lib/privacy.ts` | The narrowing and derivation code that runs inside the client layer. **A backend reimplements this**; the tests show the intended output. |
| `lib/intakeSchema.ts` | The rules for a new draft. Shared by the form and the API. Keep it on the frontend and repeat it on the server. |
| `lib/noteAccess.ts`, `lib/reentry.ts` | Small pure helpers for the screens. They stay. |
| `components/shared/portal-gate.tsx`, `lib/session.tsx`, `lib/session-expiry.ts` | Presentation-only session. Replaced by the real session. |
| `docs/api-contract.md`, `docs/backend-handover-checklist.md` | The rules. |

### 3.4 Which screen calls which function

This table is generated from the imports in `app/` and `components/`. It is the work list for "does the endpoint I just built unblock a screen?"

| Screen or component | Functions it calls (module) |
|---|---|
| Client `/documents` | `listClientDocuments` |
| Client `/documents/[id]` | `getClientDocument`, `respondToClientRequests`, `startClientAnalysis`, `getClientSettlementNotes`, `getClientTrail` |
| Client `/documents/[id]/checklist` | `getClientDocument`, `toggleClientStep`, `attachClientEvidence`, `getClientTrail` |
| Client `/documents/[id]/consultation` | `listClientConsultations`, `requestClientConsultation`, `payClientConsultation`, `getClientDocument` |
| Client `/documents/[id]/delivery` | `getClientDelivery` |
| Client `/documents/[id]/history` | `getClientDocument`, `getClientVersions` (and `getClientDiff` in `version-history`) |
| Client `/documents/[id]/summary` | `getClientSummary` |
| Client `/documents/[id]/chat` and the document agent | `getClientDocument`, `getClientSummary`, `getClientSettlementNotes` |
| Client `/notifications` | `getClientNotifications` |
| Client `/billing`, `/billing/[id]` | `listInvoices`, `getInvoice`, `getBillingProfile`, `saveBillingProfile` |
| Client `/settings` | `getAccount`, `saveProfile`, `inviteMember`, `removeMember` |
| Client `/settings/privacy` | `getPrivacy`, `setTrainingOptIn`, `requestDataExport`, `requestDeletion`, `withdrawDeletion` |
| Intake wizard and deal box | `createClientDraft`, `readBrief` (and `intakeFromReading`, which is pure) |
| Payment panel | `payClientFee` |
| Advocate `/queue` | `listDocuments`, `claimDocument`, `getQueuePriority`, `getAdvocateProfile` |
| Advocate `/review/[id]` | `getDocumentForReview`, `getDocumentVersions`, `claimDocument`, `requestChange`, `updateFinding`, `addFinding`, `withdrawCitation`, `addNote`, `updateNote`, `deleteNote`, `listNotes`, `getAdvocateProfile` |
| Add-finding dialog, citation dialog | `checkCitation`, `getCitationSource` |
| Advocate `/review/[id]/sign-off` | `getDocumentForReview`, `signOffDocument`, `listSettlementNotes`, and the notes panel's `addSettlementNote`, `updateSettlementNote`, `deleteSettlementNote` |
| Advocate `/consultations`, `/consultations/[id]` | `listAdvocateConsultations`, `getAdvocateConsultation`, `acceptConsultation`, `declineConsultation`, `answerConsultation` |
| Advocate `/payouts` | `getPayoutStatement` |
| Advocate `/metrics` | `getMetrics` |
| Advocate `/profile` | `getAdvocateProfile`, `setAdvocateAvailability`, `addDeclaredConflict`, `removeDeclaredConflict` |
| Advocate onboarding | `getInvite`, `completeOnboarding`, `onboardingProblems` |
| Contact and invitation forms | `sendContactMessage`, `requestAdvocateInvite`, `inviteProblems` |
| Preview banner | `resetDemoData` (mock only) |

---

## Part 4. What was checked, and what the check boxes mean

### 4.1 The check boxes

`docs/backend-handover-checklist.md` has **115 boxes**, one per rule a backend must enforce. They are in eight sections.

**The boxes in sections 1 to 7 are deliberately not ticked.** Each is an obligation of the backend, and the backend has not been built, so nothing can honestly be ticked. What *is* done for each is the mock behaviour and its test, which the line names (`Mock:` and `Test:`). Section 8 is different: its boxes are about the mock, so they are ticked when fixed.

| Section | Rules | Ticked | What "done" means for the frontend |
|---|---|---|---|
| 1. Access and organisation scoping | 14 | 0 | The mock layer refuses cross-organisation reads and writes, with tests |
| 2. Client visibility | 14 | 0 | Client types are built field by field; leak tests run over every fixture |
| 3. Release gating (payment and sign-off) | 20 | 0 | Paid gates the queue; sign-off gates delivery; the gates are in the API |
| 4. The citation gate | 9 | 0 | Exact match, re-run at each hand-off, withdrawn never relabelled |
| 5. Notes and consultations | 16 | 0 | Working notes, settlement notes and consultation states with their rules |
| 6. Billing and idempotency | 14 | 0 | Repeat-safe operations and invoice rules |
| 7. What the mock fakes that a backend must persist | 20 | 0 | The list of things to persist |
| 8. State changes a backend must guard | 8 | **6** | Six fixed and ticked; two open on purpose |

A rough count from the checklist text: 7 of the 115 lines say "Test: none". The others name a test that holds the rule in the mock.

**The two open boxes in section 8:**

1. Analysis must advance on a timer or a job, never on a read. The mock advances a document's status when it is read.
2. A deletion request needs a processed state, after which withdrawal is refused. The preview has none. This one is for counsel.

### 4.2 The tests

`npm run test` runs 73 files and 791 tests. They are the evidence for the "Test:" lines. The ones a backend team should read first:

| Area | Test files |
|---|---|
| Release gating and sign-off | `lib/api/documents.test.ts`, `lib/api/advocate-gates.test.ts`, `lib/api/signoff-recheck.test.ts`, `lib/api/delivery.test.ts`, `lib/api/summaries.test.ts` |
| Client visibility | `lib/api/client/*.test.ts`, `lib/findings.test.ts`, `lib/clientVersions.test.ts`, `lib/audit.test.ts`, `lib/privacy.test.ts`, `lib/notifications.test.ts` |
| Citations | `lib/citations.test.ts`, `lib/api/citations.test.ts` |
| Consultations and money | `lib/api/consultations.test.ts`, `lib/api/payouts.test.ts`, `lib/billing.test.ts`, `lib/fees.test.ts` |
| Notes | `lib/api/notes.test.ts`, `lib/noteAccess.test.ts`, `lib/api/settlement-notes.test.ts`, `lib/api/settlement-release.test.ts`, `lib/settlementNotes.leak.test.ts` |
| Preconditions on client writes | `lib/api/client/respond-guard.test.ts`, `lib/api/client/start-analysis.test.ts`, `lib/api/execution-guard.test.ts`, `lib/api/client/draft.test.ts`, `lib/api/privacy.test.ts` |
| Execution checklist | `lib/api/execution.test.ts`, `lib/api/client/checklist.test.ts`, `lib/api/checklist.test.ts` |
| The document agent | `lib/chat/*.test.ts`, `lib/chatAccess.test.ts`, `lib/mock/chat.mock.test.ts` |
| The fence | `lib/clientFence.test.ts` |
| Screens' double presses | `lib/reentry.test.ts` |
| Persistence of the demo | `lib/api/state.test.ts` |

**Read the test titles, not just the files.** A title is a sentence about behaviour ("is the same refusal for another organisation's document as for one that is not there"). Those sentences are the acceptance criteria for the backend.

### 4.3 What was checked in a browser

Some behaviour cannot be unit tested here because there is no component test setup. These were checked by hand, against a local dev server, and are recorded in the pull requests:

- Advocate notes: the controls are disabled with the reason on an unclaimed document and on one held by another advocate; adding, editing and removing work for the holder; after sign-off a note can be added but not changed.
- Client "send answers": one toast, correct state; a rapid double press gives one toast and no error.
- New draft: two quick presses on the deal box and on the wizard's final submit each make exactly one draft.
- Execution checklist: confirming the last step marks the document executed and Undo takes it back.
- Training opt-in: the toggle goes off, on, off.
- The public site: the landing page and sign-in showed the "preview, accounts aren't open yet" state when preview mode was off (screenshots on 8 October 2026).

**Not exercised in a browser or a test:** the note composer staying open when the server refuses a note (the screen cannot reach a refusal with the controls disabled). It is covered by reading the code only.

### 4.4 Open items that are not code

These block or shape the backend, and none of them is a coding task:

- Counsel's review of the wording (consultation fee arrangement, deletion wording, invoice tax breakup, the security page, the cookie banner buttons).
- Counsel's answers: may an advocate change working notes after sign-off (append-only is the default); is there a correction path for a released settlement note; may the agent quote advice written inside one; what a deletion request's "processed" state is.
- The legal owner's effective dates for the corpus (E2), the state stamp-duty schedule and the registration rules.
- A monitored inbox for the contact page.
- Whether the repository should stay public.
- Who made commit `1ba9b62`, and whether the config-protection hook is on at project level.

---

## Part 5. How to connect the backend, step by step

### The fast path (read this, then do the detailed steps)

1. Decide authentication and the HTTP conventions (Step 1).
2. Add one HTTP file, `lib/api/http.ts` (Step 2).
3. Swap the **client layer** first, read functions before write functions (Step 3).
4. Swap the advocate side and the standalone modules (Step 4).
5. Port the test titles into backend integration tests as you go (Step 5).
6. Persist what the mock fakes (Step 6).
7. Remove the mock and turn preview mode off (Steps 7 and 8).
8. Tick the integration list in Step 9.

### Step 0. Before you write anything

1. Read `docs/api-contract.md` sections 0 to 10 and Appendix B once, start to end.
2. Read `docs/backend-handover-checklist.md`. Treat it as your backlog.
3. Run the frontend: `npm install`, then `npm run dev`. Open the client and advocate portals with the preview workspace (Part 7) and click through a document from draft to executed. Everything you are about to build is visible there.
4. Run `npm run check` and confirm it passes before you change anything. It is your baseline.
5. Tell the frontend team two things: have the document endpoints been started, and which response shapes were assumed. Their answer decides whether `lib/types.ts` changes.

### Step 1. Decide the conventions (write them down once)

Decide these before any function is swapped. Each one is a place the mock cannot tell you the answer.

| Decision | Why it matters here |
|---|---|
| **Authentication** (provider, cookie or token) | The mock has no identity. `orgId` and `advocateId` are arguments today. The backend derives both from the verified session and never reads them from a request body. |
| **Errors** | The screens show `err.message` to a person. The contract says some refusals must be the *same response* (an unpaid document and a missing one; another organisation's document and a missing one). Pick an error shape that carries a readable sentence, and keep those sentences. |
| **Idempotency** | Pay, request a consultation, create a draft, request deletion and sign-off must be repeat-safe. Decide the header (for example `Idempotency-Key`) and where the frontend gets the key. The mock keys a consultation by its question text; do not copy that. |
| **Times and money** | Times are ISO 8601 UTC strings. Money is a whole number of rupees, before GST. |
| **Base URL** | One environment variable, for example `NEXT_PUBLIC_API_BASE_URL`. The name is a suggestion. |
| **Versioning** | Whether `lib/types.ts` changes in step with the API, and how the frontend learns a change. |

### Step 2. Add one HTTP file

Create `lib/api/http.ts`. It is the only place that calls `fetch`. Everything else calls it.

What it must do:

- Send the session credentials the backend expects.
- Turn a non-2xx answer into a thrown `Error` whose `message` is the sentence a person reads. The screens already catch `err instanceof Error ? err.message : "..."`, so a plain `Error` works. Keep `MockApiError` until the mock is deleted, then rename it.
- Accept an optional idempotency key and send it.
- Return parsed JSON typed with the types in `lib/types.ts`.
- Never put personal or sensitive data in a URL or query string.

Do **not** add `fetch` anywhere else. The lint fence will not stop you in `lib/api`, but `lib/clientFence.test.ts` and review should.

### Step 3. Swap the client layer, one module at a time

The client layer is the best place to start because its return types are already the backend's response shapes.

**The pattern for any function.** Keep the name, the arguments and the return type. Replace the body.

Before (mock):

```ts
export async function payClientFee(orgId: string, id: string): Promise<ClientDocument> {
  await ownDocument(orgId, id);
  return shapeClientDocument(await payFee(id));
}
```

After (real). The organisation now comes from the session, so the argument is ignored while you migrate and removed at the end:

```ts
export async function payClientFee(_orgId: string, id: string): Promise<ClientDocument> {
  return http.post<ClientDocument>(`/documents/${id}/payment`, undefined, { idempotencyKey: `pay-${id}` });
}
```

The path above is a suggestion, not an agreed endpoint. What is not negotiable is the behaviour: the checklist line and the test named for that function.

**Order, with what each module must enforce.** For each function: build the endpoint, replace the body, run the screens that call it (Part 3.4), and port the named tests (Step 5).

| # | Module | Functions | Rules to enforce (checklist section) |
|---|---|---|---|
| 1 | `client/documents` reads | `listClientDocuments`, `getClientDocument` | Own organisation only; another organisation's is the same not-found as missing (1); a client type, never the internal record (2) |
| 2 | `client/versions`, `client/trail` | `getClientVersions`, `getClientDiff`, `getClientTrail` | Before sign-off: counts only, no clause text outside requests addressed to the client; the trail names no advocate decision (2) |
| 3 | `client/delivery`, summaries | `getClientDelivery`, `getClientSummary`, `getClientSettlementNotes` | "Not available" and nothing else until a recorded sign-off; released notes only (2, 3, 5) |
| 4 | `client/documents` writes | `createClientDraft`, `startClientAnalysis`, `payClientFee`, `respondToClientRequests` | Draft validated against the intake rules; analysis starts from `draft` only; payment idempotent and at the tier's flat fee; an answer taken only while the document waits on one (3, 6, 8) |
| 5 | `client/documents` checklist | `toggleClientStep`, `attachClientEvidence` | Recorded sign-off needed; no steps or an unknown step refused (3, 8) |
| 6 | `client/consultations` | `requestClientConsultation`, `listClientConsultations`, `listClientOrgConsultations`, `payClientConsultation` | Settled document with an advocate; the advocate read from the document, never chosen; money moves only on pay; the answer only once paid (5, 6) |
| 7 | `client/notifications` | `getClientNotifications` | Built only from what the client types hold; needs stored read state (2, 7) |
| 8 | `billing` | `listInvoices`, `getInvoice`, `getBillingProfile`, `saveBillingProfile` | Invoice number allocated once at payment, never recomputed; name required, GSTIN kept as typed (6) |
| 9 | `privacy` | `getPrivacy`, `setTrainingOptIn`, `requestDataExport`, `requestDeletion`, `withdrawDeletion` | Boolean consent logged only on change; the consent log is kept after a deletion request; export built from client types (2, 6, 7) |
| 10 | `account` | `getAccount`, `saveProfile`, `inviteMember`, `removeMember` | Roles, who may invite or remove, the last owner protected (1) |
| 11 | `brief`, `contact` | `readBrief`, `sendContactMessage` | `readBrief` reads what is stated and guesses nothing (the state of execution above all); contact goes to a monitored inbox |

### Step 4. Swap the advocate side and the standalone modules

| # | Module | Functions | Rules to enforce |
|---|---|---|---|
| 12 | `documents` (advocate) | `listDocuments`, `getDocumentForReview`, `getDocument`, `getDocumentVersions` | The queue holds released documents only; an unreleased document is exactly a missing one (3) |
| 13 | `documents` (writes) | `claimDocument`, `requestChange`, `updateFinding`, `addFinding`, `withdrawCitation`, `signOffDocument` | Holder only; claim needs a conflict declaration and is exclusive; the citation gate runs at hand-off and at sign-off; the revision limit; sign-off releases marked notes in the same transaction (1, 3, 4) |
| 14 | `citations` | `checkCitation`, `listCitationAttempts`, `getCitationSource` | Exact match only; every typed attempt is stored as an event (4, 7) |
| 15 | `notes`, `settlement-notes` | `listNotes`, `addNote`, `updateNote`, `deleteNote`, and the four settlement-note functions | Same gate as other advocate writes; working notes append-only after sign-off; only sign-off sets a release time (5) |
| 16 | `consultations` (advocate) | `listAdvocateConsultations`, `getAdvocateConsultation`, `acceptConsultation`, `declineConsultation`, `answerConsultation`, `getPayoutStatement` | Only requests on documents the advocate settled; the advocate sees paid or not, never the fee, time or payment detail (1, 5) |
| 17 | `advocate`, `onboarding`, `advocate-invite` | profile, conflicts, `getInvite`, `completeOnboarding`, `requestAdvocateInvite` | Single-use expiring invitations; the password is a stand-in, so a real identity provider replaces it; nothing about an advocate is public, ranked or searchable (1, 7) |
| 18 | `metrics` | `getMetrics` | Released documents only; a figure with no source is "No data source yet", never a number (4) |

**Two things the mock does that a backend must not.**

- **A read changes state.** `reconcileAnalysis` moves `analysing` to `awaiting_payment` and assigns the tier whenever a document is read. A backend runs screening as a job; a read changes nothing (checklist section 8, open).
- **Invoice numbers are derived.** `lib/billing.ts` computes them from payments in time order. A backdated payment would renumber every later invoice. Allocate once, at payment, and store it (checklist section 6).

**What moves to the server and what stays.** The narrowing code (`lib/findings.ts`, `lib/clientVersions.ts`, `lib/audit.ts`, `lib/privacy.ts`, and the `shape-*` files) is what makes a response client-safe. The backend does that work and returns the client types. The frontend keeps only the pure helpers that read a type it was handed (`lib/noteAccess.ts`, `lib/reentry.ts`, `lib/intakeSchema.ts`, `lib/coverage.ts`, `lib/term.ts`, and the like).

### Step 5. Use the tests as the specification

There are two ways to use the 791 tests.

1. **As a reading list.** For every function you build, find its `Test:` line in the checklist, open that test, and read the title and the assertions. Each title is one behaviour the backend must show.
2. **As an integration suite.** Write the same behaviours as integration tests against the real endpoints. The helpers in `lib/api/testing.ts` (`screenedDocument`, `releasedDocument`, `claimedDocument`, `signedOffDocument`, `settle`, `refusal`) show how a test puts a document into a state and checks a refusal. A backend suite needs the equivalent: create a document in each state through the real API, then assert the same refusals and the same unchanged state.

The frontend's own tests run against the mock and keep running until the mock is deleted. There is no suite today that runs unchanged against a real backend. Building one is part of the work, and `lib/api/testing.ts` is where to start.

**A rule worth keeping in every backend test:** a refused call must leave the state unchanged and must work again afterwards. Most of the mock's "changes nothing when it fails" tests are that.

### Step 6. Persist what the mock fakes

Checklist section 7 lists these. In short, a real store is needed for:

- Documents, findings, citations, and **append-only** snapshots written at hand-off points only.
- The citation attempt log (every typed attempt, as an event). The fabrication-rate metric reads it.
- The consent log, with the time of each change, kept even after a deletion request.
- Deletion requests, with their first time.
- Cookie consent, if it must be provable.
- Advocate working notes and settlement notes, scoped by the authenticated advocate.
- The corpus-review log (advocate side only) and the audit trail (every entry names its actor).
- Billing profiles and accounts, per organisation.
- Notification read state, per user and per event.
- Advocate invitations, single-use and expiring.
- Triage override logging (required, and no screen exercises it yet).

**Never store on the client:** a consultation question or answer, settled text, or an advocate's notes, in `localStorage`, `sessionStorage`, IndexedDB, a cookie or any cache that outlives the request. The mock does so only because it is a single tab with nobody else to read it.

### Step 7. Remove the mock

Do this last, once every function in the table above is swapped and the screens work.

Delete or replace:

- `lib/api/state.ts` and its test, `lib/api/delay.ts` (keep an error class), and `lib/api/testing.ts` once nothing uses it.
- `lib/mock/*`, except fixtures that become real configuration (for example the citation corpus, which must come from the legal owner).
- `components/shared/preview-banner.tsx` and the "Use the preview workspace" buttons.
- `lib/mock/auth.mock.ts` and the credential comparison in the sign-in pages.
- `lib/session.tsx`'s role in `localStorage`, replaced by the real session; `PortalGate` then reads the verified session.
- The `?fail=1` failure injection in `lib/api/delay.ts`.
- The `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE` flag, everywhere it is read (Part 7).
- `app/dev/components`, the developer component page.

Then run `npm run check`. Any test that fails because it imported a deleted mock either becomes a backend integration test (Step 5) or is deleted with a note saying why.

### Step 8. Turn preview mode off, and keep it off

The flag is read at build time in five places (Part 7). In production with real accounts it must be unset, and its code removed in Step 7. `SECURITY-PREVIEW.md` lists what must exist before any real data is used: server-side identity, authorization on every request keyed off a verified session, server-enforced organisation scoping, real persistence, and a multi-tenant isolation test.

### Step 9. The integration tick-list

None of these is ticked, because none has been done. Copy this into the integration PR and tick as you go.

**Foundations**
- [ ] Authentication and the session are server-verified, and the organisation and the advocate come from it, never from a request.
- [ ] `lib/api/http.ts` exists and is the only caller of `fetch`.
- [ ] Error sentences are carried to the screen, and the "same response" refusals are identical.
- [ ] Idempotency keys are sent on pay, request, create-draft, deletion and sign-off.

**Client layer** (Part 5, Step 3)
- [ ] Modules 1 to 11 are swapped, and each screen in Part 3.4 works against the real endpoints.
- [ ] A client can never receive the internal record, a rule id, a layer number, an advocate's decision or note before sign-off.
- [ ] Another organisation's document, request or invoice is the same not-found as a missing one, on read and on write.

**Advocate side** (Step 4)
- [ ] Modules 12 to 18 are swapped.
- [ ] An unpaid document is invisible to advocates: no queue entry, no link, no count, no metric.
- [ ] The citation gate runs at every hand-off and at sign-off.
- [ ] Sign-off releases the marked notes in the same transaction.

**Behaviour the mock gets wrong on purpose** (Step 4)
- [ ] Analysis advances on a job, and a read changes nothing.
- [ ] Invoice numbers are allocated once at payment and stored.
- [ ] A deletion request has a processed state, after which withdrawal is refused (after counsel answers).

**Persistence** (Step 6)
- [ ] Every item in checklist section 7 is stored.
- [ ] Nothing a client may not keep is in browser storage.

**Cleanup and release** (Steps 7 and 8)
- [ ] The mock layer, the preview banner, the mock login and the preview flag are removed.
- [ ] `npm run check` passes.
- [ ] A multi-tenant isolation test and an access-control test with no stored role both pass.
- [ ] Counsel has reviewed the open wording, and the legal owner has supplied the corpus dates, the stamp-duty schedule and the registration rules.

---

## Part 6. Conventions you will meet in the code

- **Vocabulary in screens:** "advocate" not "lawyer" in client copy; "finding" not "issue" or "error"; "settled" not "finalised"; "sign-off" not "approval"; "execution checklist" not "next steps".
- **No em dashes in product copy.** The separator is the middle dot.
- **Types come from `lib/types.ts`.** Do not redeclare a shape inline.
- **Four state systems, never folded into one label:** the document's status, a finding's state, a citation (verified or blocked), and ownership (unclaimed, claimed by you, held by another advocate).
- **What stands between a document and sign-off** comes from `signOffBlockers()`. Do not recompute it in a component.
- **Server Components by default;** `"use client"` only for interactivity (Next.js 15 App Router).
- **Every list view has loading, empty and error states.**
- **Commands:** `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run check` for all three of the last. Run `npm run check` on its own so its exit code is the real result.

---

## Part 7. The public site: the prompt bar and the sign-in page

The public site and the preview workspace are the same build. One switch, read when the site is built, decides which one a visitor sees.

### 7.1 The switch

`NEXT_PUBLIC_VIDHATA_PREVIEW_MODE`. The code compares it to the string `"1"`. Anything else, or unset, means off.

It is read in these places:

| File | With it **on** | With it **off** |
|---|---|---|
| `components/marketing/public-entry.tsx` (the landing page's main call to action) | The **prompt bar** (the deal box with the "Draft a document" button) | The button "See a sample document" and a link "The agreements Vidhata drafts" |
| `app/(public)/login/page.tsx` | A username and password form, and "Use the preview workspace" | "Accounts aren't open yet. Vidhata is in preview." and "Go to home" |
| `app/(public)/advocate-login/page.tsx` | The same, for advocates | The same unavailable message |
| `app/(public)/advocate-onboarding/[token]/page.tsx` | The onboarding flow | The unavailable message |
| `lib/api/delay.ts` | `?fail=1` on any page makes every mock call fail (for testing the error states) | No failure injection |

### 7.2 What the production site shows today

As of 8 October 2026 the site at `vidhata-pi.vercel.app` has the switch **off**:

- The landing page shows the headline "AI drafts. Advocates decide.", a one-line description, the button **See a sample document**, and the link **The agreements Vidhata drafts**. The navigation holds Pricing and Sign in.
- `/login` shows "Welcome back.", the Client and Advocate tabs, "Accounts aren't open yet. Vidhata is in preview." and **Go to home**.

### 7.3 How to bring the prompt bar and the sign-in page back on the production site

This is a Vercel setting, not a code change. The value is baked into the build, so changing it needs a new build.

1. Open **Vercel**, then the project, then **Settings**, then **Environment Variables**.
2. Add a variable named `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE` with the value `1`. Tick **Production**. Tick **Preview** as well if previews should match.
3. Go to **Deployments**. On the latest Production deployment, open the menu and choose **Redeploy**. **Untick "Use existing Build Cache"**, because the old build has the old value inlined.
4. Wait for the Production row to show **Ready**.
5. Check in a private window:
   - The landing page shows the prompt bar with the **Draft a document** button, and no "See a sample document" button.
   - `/login` and `/advocate-login` show the sign-in form and **Use the preview workspace**.
   - Pressing **Use the preview workspace** opens the portal with a banner: "Preview. Sample data, kept in this browser tab only. Nothing is sent."

The mock credentials are `admin` and `admin` (`lib/mock/auth.mock.ts`). They are in a public repository whether or not the switch is on.

### 7.4 What turning it on does and does not mean

Read this before you do it, then decide. It is your decision to make.

- **It is sample data only.** The documents, advocates, findings and prices are fixtures. Everything a visitor does is kept in their browser tab and discarded when the tab closes. Nothing is sent anywhere.
- **It is not access control.** Anyone with the link can enter both portals. `SECURITY-PREVIEW.md` says this plainly and says not to point a preview build at real client, contract or personal data.
- **It enables failure injection.** `?fail=1` makes every mock call fail on any page, which a visitor could trigger.
- **The wording on those pages has not been reviewed by counsel** (the security page, the cookie banner buttons, the terms). With the switch off, fewer people read a sign-in flow that still points at it.
- **`CLAUDE.md` describes the public site as switch-off.** If the site is going to stay on, update that line so the next developer is not surprised.
- **Vercel Deployment Protection** can keep previews private while production is public. Check it is on for previews.

### 7.5 How to turn it off again

Delete the variable, or set it to anything other than `1`, and redeploy with the build cache unticked. The landing page returns to "See a sample document" and `/login` to "Accounts aren't open yet."

When real accounts exist (Part 5, Step 7), remove the flag and the code that reads it, so the production build cannot show the mock login at all.

---

## Appendix A. Where each rule is written down

| You want | Open |
|---|---|
| The rule behind a function, with its mock and test | `docs/api-contract.md` sections 1 to 10 |
| Every function's inputs, outputs and refusals | `docs/api-contract.md` Appendix A |
| What the mock leaves to the screen | `docs/api-contract.md` Appendix B |
| The backend's to-do list, one line per rule | `docs/backend-handover-checklist.md` |
| Why the client has its own types and how that was built | `docs/superpowers/plans/2026-10-04-client-shaped-api.md` |
| What the preview is and is not | `SECURITY-PREVIEW.md` |
| Design and brand rules | `CLAUDE.md`, and `docs/superpowers/specs/` |

## Appendix B. Questions to put to the frontend team on day one

1. Which response shapes did you assume for the document endpoints, and did you start them?
2. Where does the session live, and how does the frontend learn it has ended?
3. How are idempotency keys supplied on a create?
4. Is the error body a sentence, or a code the frontend must translate? (The contract needs some sentences to stay identical.)
5. Which of the open items in Part 4.4 are answered?
