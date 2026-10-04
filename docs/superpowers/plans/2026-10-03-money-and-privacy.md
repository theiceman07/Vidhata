# Payment, billing, consultation and privacy controls

Covers C7 (consultation booking and payment), C8 (billing) and C11 (privacy
controls) from `vidhata-frontend-fixes.md`. C7 and C8 share one money model,
and the money model changes when a document becomes visible to advocates, so
that is settled first. C11 is independent of it.

Nothing is built yet. This plan is for review.

## Findings from reading the code

- The tier is already known when screening finishes. `reconcileAnalysis()` in
  `lib/api/documents.ts` calls `assignReviewTier()` the moment analysis
  completes and moves the document straight to `pending_review`, which is the
  advocate queue. There is no step where a client could pay.
- Prices are strings (`"₹4,999"` in `lib/config/pricing.ts`). Billing needs
  numbers, so each price needs a numeric amount beside its label.
- `DocumentStatus` is read in about a dozen places (listed below). Most are
  `if` chains. `StateLabel` is a `Record<LabelState, ...>`, so the compiler
  will name the one place that is easy to miss.
- Nothing stops an unreleased document reaching an advocate today:
  `claimDocument` accepts any status, `/review/[id]` opens any id from the URL
  (drafts and analysing documents included), and the queue hides only `draft`
  and `analysing` by a filter in the page. This is a gap already. Payment makes
  it matter, because "only paid documents reach an advocate" has to hold in
  the API, not just in a filter.
- Consultation: `CONSULTATION` (label and price string) is in the pricing
  config and the escalation prompt shows it, but the button has no handler and
  there is no store, route or record.
- Settings has a row saying "Billing: not enabled in this preview" and nothing
  for privacy. Both the settings page and the escalation prompt still use
  uppercase mono eyebrows, which CLAUDE.md bans. They are fixed when touched.
- The client rail has Documents and Settings only. The final check in the fixes
  list says a client must be able to find the privacy controls without help,
  so they need a rail link of their own.

## Decisions

| Question | Decision |
|---|---|
| New status | `awaiting_payment`, between `analysing` and `pending_review`. Label "Awaiting payment", caution tone, with the word always shown. It is the client's move. |
| When tier and price are known | At the end of screening, as now. Screening assigns the tier, the document goes to `awaiting_payment`, and the client sees the tier and the fixed fee. The client never picks a tier. |
| What `/new` shows | A price range derived from the tier prices ("₹4,999 to ₹24,999"), saying the tier is assigned after screening and the figures are indicative. Derived from config, never typed in twice. |
| When the first-pass snapshot is written | Where it is now, when the first pass finishes. Payment is not a hand-off of a draft, so it writes no version. |
| Paying | `payFee(id)` in `lib/api/documents.ts`, which owns the store. It refuses unless the status is `awaiting_payment`, records a `payment` on the document, and moves it to `pending_review`. |
| The payment step | One button, "Pay (preview)", with a line saying no payment is taken. No card, UPI, expiry or CVV inputs, not even disabled ones. A guard test fails on those words in payment and billing files. |
| Only paid work reaches advocates | Enforced in the API. `claimDocument` refuses anything not in `pending_review` or already the claimant's. A shared `isReleased(doc)` is used by the queue, the claim rule and the review page, which shows "not yet released to the queue" instead of the workspace for an unreleased document. |
| Fee model | Flat only. One fixed fee per document, by tier, and separately the consultation fee. The fee covers every revision round of that document, so a round costs nothing extra. No percentage, share, commission or per-finding figure anywhere. A guard test scans billing and pricing files for those words. |
| Money amounts | Numbers (rupees) in `lib/config/pricing.ts` next to each label, formatted by one `rupees()` helper. The displayed strings are derived from the numbers. |
| GST | The invoice has an optional GSTIN field, kept as typed after trimming. It is not validated against anything and goes nowhere. Amounts are shown before GST, with a line "GST is added at the rate in force". No tax rate or tax amount is computed in the preview, because none has been supplied. |
| Invoices | A reading of payment records, not a second copy: document fees from `ContractDocument.payment` and consultation fees from consultation records. Numbered `VID-2026-0001` in the order paid. |
| Receipts | Document title, tier label, the fixed fee, date, invoice number, GSTIN if given. No finding counts, no advocate name on a document fee, no breakdown that reads as a share of anything. |
| Billing profile | The organisation's billing name and optional GSTIN, kept in memory like everything else in the preview. |
| Consultation: who | The advocate who settled the document, named because they already settled it, and nobody else. No list, no choice, no ranking. Only offered on a signed-off document that has a settling advocate. |
| Consultation: how | Reached from the escalation prompt. A short question, the fee from the pricing config, "Pay (preview)". It writes a `Consultation` record with status `requested`, which the advocate's inbox (D7) will read. Accept and reply are D7, not this batch. |
| Training opt-in | Off by default, revocable, with the time of each change kept. The wording matches `/security`: not used to train models unless the client opts in. |
| Export | A mock JSON file built only from what a client may read (`clientVisibleFindings`, no counts or text before sign-off beyond what the client already sees). Named as a preview export. |
| Delete | A request, not an erasure, in the preview. It says honestly what would be removed and what is kept, from one list in `lib/config/privacy.ts`, with the wording marked for counsel to confirm. No retention period is named. The request can be withdrawn until processed. |
| What delete keeps (proposal) | Removed: the account and organisation profile, billing details, and documents that are not signed off with their drafts. Kept: the sign-off record and audit trail of signed-off documents, which are meant to be immutable (SRD §4.3), and invoices and payment records for accounting. The last is my proposal, not a source's, and is marked for counsel. |
| Navigation | Client rail Account section: Billing, Privacy, Settings. Settings links to both. |
| States | Every list has loading, empty and error, and every new page responds to `?fail=1`. |

## Type changes

```ts
DocumentStatus   += "awaiting_payment"
ContractDocument += payment?: { amount: number; paidAt: string; invoiceNumber: string }
Consultation      = { id, documentId, orgId, advocateName, question, amount,
                      status: "requested" | "accepted" | "replied",
                      requestedAt, invoiceNumber }
Invoice           = { number, issuedAt, kind: "document" | "consultation",
                      description, documentId, amount }   // derived, not stored
BillingProfile    = { name: string; gstin: string | null }
PrivacySettings   = { trainingOptIn: boolean; changedAt: string | null;
                      deletionRequestedAt: string | null }
```

## Every file `awaiting_payment` touches

| File | Change |
|---|---|
| `lib/types.ts` | Add the status and `payment`. |
| `components/document/state-label.tsx` | Add the label. The compiler fails here until it is added. |
| `app/dev/components/page.tsx` | List the new label. |
| `lib/api/documents.ts` | `reconcileAnalysis` ends in `awaiting_payment`. New `payFee`. `claimDocument` refuses unreleased documents. `isReleased` lives beside `getQueuePriority`. |
| `lib/moves.ts` | `groupOf` returns "you" for it. `yourMove` returns "Pay the fee to send it to an advocate". |
| `app/(client)/documents/page.tsx` | The list row shows the move. `since()` and the record counts already include it. |
| `app/(client)/documents/[id]/page.tsx` | A branch before `WithAdvocate` renders the payment panel. Polling is unaffected. |
| `components/document/provenance.tsx` | `lifecycle` and `stageCaption` say "Awaiting payment". No new stage, so the four-stage bar stays. |
| `components/domain/document-context.tsx` | The stations list gets a branch. |
| `lib/audit.ts` | A "Fee paid" event, with no amount in the trail (the amount is on billing). |
| `lib/coverage.ts` | No change. `layersRun` already says all seven ran once screening is done. A test pins it. |
| `app/(lawyer)/queue/page.tsx` | The `visible` filter uses `isReleased`, so unpaid documents are never listed or counted. |
| `app/(lawyer)/review/[id]/page.tsx` | "Not yet released to the queue" for an unreleased document. |
| `lib/mock/documents.mock.ts` | Seed a `payment` on the four released fixtures. |
| `lib/api/documents.test.ts` | The employment fixture now resolves to `awaiting_payment`, not `pending_review`. New tests for `payFee`, the claim refusal and `isReleased`. |
| `lib/coverage.test.ts`, `lib/findings.test.ts` | Pin the coverage case. Add the new client files to the guarded list. |
| `CLAUDE.md` | Document status gains the new state, with the "only paid reaches an advocate" and flat-fee rules. |

## New files

| File | Purpose |
|---|---|
| `lib/config/privacy.ts` | The deletion scope list, marked for counsel. |
| `lib/billing.ts`, `lib/billing.test.ts` | `rupees()`, `invoicesFor()`, the guard that no figure is a percentage or share. |
| `lib/api/billing.ts` | Billing profile and invoice reads. |
| `lib/api/consultations.ts` | Create and list consultations. |
| `lib/api/privacy.ts`, `lib/api/privacy.test.ts` | Settings, export, deletion request. Tests that the export holds nothing a client may not read. |
| `components/domain/payment-panel.tsx` | The fixed fee, the tier, "Pay (preview)". |
| `app/(client)/billing/page.tsx`, `billing/[id]/page.tsx` | Invoices list, billing details, receipt. |
| `app/(client)/documents/[id]/consultation/page.tsx` | The consultation request and its preview payment. |
| `app/(client)/settings/privacy/page.tsx` | Opt-in, export, delete. |

Also edited: `lib/config/pricing.ts` (numeric amounts), `components/domain/intake-wizard.tsx`
(the price range), `components/domain/escalation-prompt.tsx` (a working button
and no uppercase eyebrow), the chat page (passes the consultation link),
`app/(client)/layout.tsx` (rail), `app/(client)/settings/page.tsx` (links, and no
uppercase eyebrows).

## Visibility

Billing and privacy are client screens and read no finding but through
`clientVisibleFindings`. The new client files join the guarded list in
`lib/findings.test.ts`, so a `.findings` read in them fails the suite. Receipts
carry no finding counts. A test builds the export and a receipt for a document
with advocate-added findings and fails if either mentions one.

## Commits

| # | Commit | Touches |
|---|---|---|
| 0 | The status, the money model, and the API rules: numeric prices, `awaiting_payment`, `payFee`, claim refusal, `isReleased`, fixtures, tests, CLAUDE.md | `lib/types.ts`, `lib/config/pricing.ts`, `lib/api/documents.ts`, `lib/billing.ts`, the mocks, the tests, `CLAUDE.md` |
| 1 | Payment on the client side: panel, status label, moves, provenance, context, audit, queue and review guards, `/new` range | everything in the first table, `intake-wizard.tsx` |
| 2 | C8 billing: invoices, receipt, billing details | `lib/api/billing.ts`, the billing routes, rail, settings |
| 3 | C7 consultation | `lib/api/consultations.ts`, the consultation route, escalation prompt, chat page |
| 4 | C11 privacy controls | `lib/api/privacy.ts`, `lib/config/privacy.ts`, the privacy route |

Stop for a browser pass after commit 1. It is the one that changes how a
document moves, so the whole route should be walked once: `/new`, screening,
the price, pay, and the document appearing in the advocate queue, with the
queue showing nothing for an unpaid one.

## Questions for review

1. **GST.** The invoice shows amounts before GST and says GST is added at the rate in force, with no computed tax. Is that right for the preview, or should a rate be supplied for finance to confirm?
2. **A declined consultation.** The fee is taken on request, as in the plan. If the advocate declines, the invoice is marked not charged. Or the fee is taken only when the advocate accepts. Which?
3. **Revisions are in the fee.** A document's fee covers all its revision rounds, up to the cap. Confirm.
4. **What deletion keeps.** The list above is mine, apart from the sign-off record and audit trail, which come from the SRD. Invoices and payment records being kept is a proposal. It ships marked for counsel to confirm.
5. **Not in this batch.** Cancelling an unpaid document, refunds, and the advocate's consultation inbox (D7).

## Decisions after review (3 Oct)

These replace anything above that they contradict.

| Question | Decision |
|---|---|
| GST | Amounts before GST everywhere, with no computed tax: the pricing page, the consultation fee, the pay screen and billing all say "before GST" (`PRICE_BASIS`). GSTIN is optional and unvalidated. A real invoice needs a proper tax breakup: open item for the accountant. |
| Consultation fee | Charged on acceptance, not on request. A request is free and stored as `requested`, saying "Fee payable if the advocate accepts". The charge step arrives with the advocate inbox (D7). There is no "not charged" or refund state. A `Consultation` record carries no payment and no invoice number in this batch. |
| Revisions in the fee | Up to the cap of 3, nothing extra is charged. Past the cap, nothing extra is charged and the case is logged for corpus review as before. |
| What delete keeps | As planned, and the consent and opt-in log is added to the kept records, since it is the proof a revocation happened. Marked for counsel. |
| Unpaid documents | They have no exit yet (no cancel, no refund), so they will pile up. They appear in no advocate-facing read, count or metric. |
| Direct URL to an unpaid document | `/review/[id]` and sign-off read through `getDocumentForReview`, which returns null for an unpaid document exactly as for a missing id, so the page is the same not-found state. Claiming one is refused with the same "Document not found." |
| What the client sees before paying | The assigned tier, the fee, and the deal facts the mock triage rule uses (type, value, MSME counterparty). No "why this tier" drawn from findings: in the real Layer 6 severity feeds the score, so the reason could reveal findings. |
| Payment robustness | `payFee` is idempotent: a document with a payment comes back as it is, so a double press makes one payment. Under `?fail=1` it fails with the document left awaiting payment and nothing recorded, and the client can retry. |
| Invoice numbers | Not stored. `invoicesFor()` numbers an organisation's payments in the order paid, so the number cannot drift from the record. `payment` is therefore `{ amount, paidAt }`. |
| `rupees()` | Lives in `lib/config/pricing.ts` with the amounts, not in `lib/billing.ts`, so the config can derive its own display strings without a cycle. |
| Consultation invoice | The consultation is a legal service by the advocate's entity, and the platform's revenue must stay a flat technology fee (Architecture §8). Issuer and wording for a consultation invoice need counsel. The platform fee and the consultation fee are separate lines with separate labels. |
| Guards | The fee-words and card-words guards (`lib/fees.test.ts`) cover the pricing config, the pricing table and the escalation prompt as well as the payment and billing files. |
| Build order | Commits 0, 1, 2, then a browser pass in both portals: the client walk, then as an advocate, confirming the unpaid document is absent from the queue and a direct URL to it shows not-found. Commits 3 and 4 follow. |

## Counsel and accountant list

- Wording of the consultation invoice and who issues it.
- A proper GST tax breakup on invoices (accountant).
- The deletion scope: what is removed and what is kept, including invoices, payment records, the sign-off record, the audit trail and the consent log.
- The security page and training opt-in wording.

## Open items

- Unpaid documents have no exit: no cancel, no refund.
- The consultation charge step, with the advocate inbox (D7).
