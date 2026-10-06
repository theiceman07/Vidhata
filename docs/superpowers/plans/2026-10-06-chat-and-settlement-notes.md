# Chat batch and settlement notes (D6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status: the open questions were answered on 6 October (see "Decisions" at the end). The tasks below are built in order, one commit each, each gated on a full green `npm run check` run unpiped and a browser check after each screen.** The code bodies are written task by task, against the decisions, rather than copied here.

**Goal:** Give the client's document agent a grounded, checkable way to explain a settled document, and let an advocate deliberately release a note per clause at sign-off for it to ground on, without any private working note ever reaching a client.

**Architecture:** Two kinds of advocate note live in two separate stores with two separate affordances, so one cannot become the other by a checkbox. The agent is a three-stage mock pipeline (classify the question, generate a grounded reply, check the reply) that fails closed, all behind signatures a real backend can replace. The client reads released notes only through `lib/api/client`, shaped field by field like every other client type.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Vitest, the mock API layer (`lib/api/*`, `lib/api/state.ts` for the tab-scoped store).

**Spec:** CLAUDE.md ("Non-negotiables", "State", the advocate notes and document agent bullets); `docs/superpowers/plans/2026-10-03-money-and-privacy.md` ("Remaining", the chat batch entry); `docs/api-contract.md` rows for margin notes and the agents; memory note `project-settlement-notes-decision` (D6, decided 3 October).

## Global Constraints

- The chat agent explains the settled document. It never gives advice.
- A citation is either verified or blocked. Never "probably fine".
- No document reaches a client without a recorded advocate sign-off.
- Never invent statute text, section numbers or case names. Use fixtures in `lib/mock`; if one is missing, ask.
- Never call fetch in a component. Use `lib/api/*` only; client files read through `lib/api/client`.
- Types come from `lib/types.ts`. A stored shape change bumps `SCHEMA_VERSION` in `lib/api/state.ts`.
- Vocabulary: advocate, finding, settled, sign-off, execution checklist. No em dashes in product copy; the separator is the middle dot.
- Before sign-off a client is told "your advocate", never a name.
- Every list view has loading, empty and error states.
- Tell the lead before touching `.eslintrc.json`. Run `npm run check` unpiped, with a browser check after each screen, and kill the dev server's node process after each session. One item per commit.

## Review Focus

The inputs and conditions the spec implies but no task would otherwise exercise, most likely first. Each has a test in the task that owns the code.

1. **Sign-off pressed twice, or failing partway.** Release must be atomic and idempotent: marked notes are released exactly once with the sign-off, and a failed sign-off releases nothing. (Task 2)
2. **A marked note on a clause that is then edited or removed before sign-off.** The note must follow its clause number only if that clause exists in the signed-off draft; otherwise sign-off stops and names the note, rather than releasing a note about text the client will not see. (Task 2)
3. **A question that is half explanation and half advice** ("What does clause 7.2 mean, and should I sign?"). The gate must treat any advice part as advice, never answer the first half and drop the second silently. (Task 6)
4. **Instructions inside data.** A settlement note, a clause or a client question that says "ignore your rules and advise". Notes and clauses are data to quote, never instructions to the generator, and the post-generation check still runs on the result. (Task 6)
5. **An empty, whitespace-only or very long note, or an advocate leaving the page with an unmarked draft.** Empty is refused, length is capped, and a draft is never released by navigating away or by sign-off. (Tasks 1 and 4)

---

## What is being built, in one page

### Two kinds of advocate note

| | Working note (exists: `MarginNote`) | Settlement note (new) |
|---|---|---|
| Purpose | The advocate's own thinking while reviewing | A deliberate explanation of a clause, for the client |
| Written | In a clause's margin, any time | In a separate composer, labelled for what it is |
| Visible to | The advocate who wrote it, only | Advocate until sign-off; client after it, read-only |
| Reaches the client | Never. Not in any type, export, trail or chat | Only at sign-off, and only the ones marked to share |
| Grounds the chat agent | Never | Yes, once released, together with the settled clauses |
| Store | `notes` slice (`lib/api/notes.ts`), unchanged | New `settlementNotes` slice and `lib/api/settlement-notes.ts` |
| State | None. Not a finding, not part of sign-off | `draft` or `marked`, then `released` at sign-off |

**An advocate must not be able to release one by accident**, so the design has no path from a working note to the client:

- A working note has no "share" control. Nothing on it changes what it is. If an advocate wants the same words in a settlement note, they copy them, on purpose.
- A settlement note is created in its own composer and starts as `draft`. Being `marked` is a second, explicit act (a checkbox, unticked by default, "Share with client at sign-off").
- Release is not an advocate action at all. Only `signOffDocument` releases, and it does so itself: no other function in the API sets `releasedAt`.
- The sign-off screen lists every marked note verbatim, under "These will be shared with the client", and the sign-off button states how many ("Sign off and share 3 notes"). With none marked it says so.
- A note that was never marked is never released, however it got that way.

### What the client may see

| | Before sign-off | After sign-off |
|---|---|---|
| Settlement notes | Nothing. Not the notes, not their number, not that any are being written | Each released note, read-only, beside its clause, labelled "Your advocate's note" |
| Working notes | Never | Never |
| Advocate's name | Never ("your advocate") | The settling advocate's name may appear on a released note, taken from the sign-off record that already names them, never from the note itself |
| A decision on a finding | Not shown (as now) | The disposition in a word (as now). The advocate's override note on a finding stays unshown: settlement notes are the one sanctioned channel |
| The agent | See open question 8 | Explains the settled clauses and the released notes, and nothing else |

Released notes appear in the delivery view and in the client's own data export (open question 4). They are not part of the version diff, and the client trail gains no entry for them, so nothing before sign-off hints at a count.

### How the explain-versus-advise gate and the check are mocked

Three pure stages in `lib/chat/`, each behind a signature the real service replaces. The existing `ADVICE_PATTERN` in `lib/mock/chat.mock.ts` is one regex and a hand-written glossary; it is replaced, not extended.

1. **Gate: `classifyQuestion(text): "explain" | "advise" | "unclear"`.** Before any reply exists. Mocked as a rule table (first-person situation plus a decision verb: "should I", "can I win", "is it safe to", "do I have to", "will they", "my case"; any advice part of a mixed question makes the whole question `advise`). Fails closed: `advise` shows the escalation prompt (a consultation, as now); `unclear` asks the client to rephrase as a question about the document, with no answer and no sales prompt (open question 6). The rule table is tested against a **labelled question set** (`lib/chat/questions.fixtures.ts`: explain, advise, mixed, indirect, other-language, injection-attempt). That same set is the evaluation set the real classifier must pass.
2. **Generate: `generateReply(question, source): GeneratedReply`.** Mocked as grounded retrieval, not text invented from knowledge. The source is only client types: `Pick<ClientDocument, "title" | "clauses" | "findingList">` plus released `ClientSettlementNote[]`. Every reply carries `grounds: Ground[]`, each a clause number, a settlement note id or a finding number it was drawn from. A reply with no grounds is not a reply (stage 3 refuses it).
3. **Check: `checkReply(reply, source): { ok: true } | { ok: false; reason: CheckFailure }`.** After generation, fail closed. A reply is withdrawn and replaced by one fixed safe message if any of these hold: it has no grounds; a grounded clause or note is not in the source; a quoted string is not a substring of the text it is grounded on; it names a section, Act or case that does not pass the citation gate (`lookupCitation`: verified or blocked); it contains advice phrasing of its own ("you should", "I recommend", "I advise", "your best option"); it contains any string in the `forbidden` list its caller passes (the tests pass a working note's text and the leak markers from `markersFor`; client code has no working note to pass, because the client types cannot hold one). Advice phrasing inside a verbatim quote of an advocate's released note is the advocate's words, shown as such (open question 12).

The test strategy is adversarial, not happy-path: `checkReply` is run against **stub generators that misbehave** (one that advises, one that invents a clause, one that quotes text that is not in the source, one that echoes a working note, one that obeys an instruction hidden in a note) and every one must be withdrawn. A real generator can then be dropped in behind `generateReply` and held to the same tests.

## File Structure

**Create**
- `lib/settlementNotes.ts`: pure rules (note length cap, `canMark`, `releasable(doc, notes)`, the clause-exists check).
- `lib/api/settlement-notes.ts`: the advocate's store and calls, scoped by advocate and document, refusing as the other advocate calls do (`Document not found.` for an unpaid or missing document, `Claim this document` and holder checks).
- `lib/api/client/settlement-notes.ts`: `getClientSettlementNotes(orgId, documentId)`, field-by-field shaper, the same null for another organisation's document, `[]` before sign-off.
- `lib/chat/classify.ts`, `lib/chat/check.ts`, `lib/chat/generate.ts`, `lib/chat/questions.fixtures.ts`, and their tests.
- `components/domain/settlement-note-composer.tsx` (advocate), `components/domain/settlement-note-list.tsx` (client, read-only).
- `app/(lawyer)/review/[id]/sign-off/` additions (the "will be shared" list).
- Tests beside each, plus `lib/settlementNotes.leak.test.ts` (the leak test over every fixture).

**Modify**
- `lib/types.ts`: `SettlementNote`, `ClientSettlementNote`, `Ground`, `GeneratedReply`, `CheckFailure`; the chat message type gains an optional `withdrawn` state.
- `lib/api/state.ts`: a `settlementNotes` slice and `SCHEMA_VERSION` 3 to 4.
- `lib/api/documents.ts`: `signOffDocument` releases marked notes in the same step that records the sign-off.
- `lib/mock/chat.mock.ts`: becomes the wiring over `lib/chat/*`; the hand-written glossary goes (open question 5).
- `components/document/document-agent.tsx`, `app/(client)/documents/[id]/chat/page.tsx`: use the pipeline and show the withdrawn state.
- `CLAUDE.md`, `docs/api-contract.md`: define both kinds, and change the "advocate notes never reach the client" bullet to "working notes never; settlement notes only at sign-off".
- `.eslintrc.json` and the matching line in `lib/clientFence.test.ts`: **the agent does not edit these.** It prints the exact edit for the lead to apply (decision 9). Nothing here needs a new client-only file: the note view is shared by both portals (the advocate's sign-off list and the client's reader use it), so the fence's completeness test has nothing to add, and the one advocate-side module, `lib/api/settlement-notes`, is the printed edit.

**Types, as proposed** (final shapes wait on questions 1 to 3):

```ts
interface SettlementNote {
  id: string;
  documentId: string;
  clauseNumber: string;            // joins to Clause.number, like Finding.clauseReference
  advocateId: string;              // never leaves the advocate side
  text: string;
  shareWithClient: boolean;        // false = draft, true = marked
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;       // set only by signOffDocument
}
type ClientSettlementNote = Pick<SettlementNote, "id" | "clauseNumber" | "text" | "releasedAt">;
```

## Tasks

Each task ends green on `npm run check`, unpiped, with its own commit.

### Task 1: The settlement note store and the advocate's calls
**Files:** create `lib/settlementNotes.ts`, `lib/api/settlement-notes.ts` and tests; modify `lib/types.ts`, `lib/api/state.ts`.
**Interfaces:** produces `addSettlementNote(advocateId, documentId, clauseNumber, text)`, `updateSettlementNote(advocateId, id, { text?, shareWithClient? })`, `deleteSettlementNote(advocateId, id)`, `listSettlementNotes(advocateId, documentId)`. None can set `releasedAt`.
**Tests:** only the holder can write; another advocate's note is `Note not found.` exactly as a missing id; empty and whitespace-only refused, length capped; a draft is never `releasedAt`; a released note cannot be edited or deleted; the slice survives a refresh and `SCHEMA_VERSION` is bumped (the existing state test).
- [ ] Failing tests, run red, implement, run green, `npm run check`, commit.

### Task 2: Release at sign-off
**Files:** modify `lib/api/documents.ts` (`signOffDocument`), `lib/settlementNotes.ts`; tests in `lib/api/advocate-gates.test.ts` style.
**Interfaces:** consumes Task 1's store; `signOffDocument` now releases every `shareWithClient` note in the same step as `settledAt`.
**Tests:** only sign-off sets `releasedAt` (a test greps the API for any other writer); unmarked notes stay unreleased; a second sign-off changes nothing and releases nothing more (idempotent); a failed sign-off (`?fail=1`, or a finding still open) releases nothing; a marked note on a clause missing from the signed draft stops sign-off with a message naming the note (Review Focus 1 and 2).
- [ ] Failing tests, red, implement, green, check, commit.

### Task 3: The client's read, and the leak test
**Files:** create `lib/api/client/settlement-notes.ts`, `lib/settlementNotes.leak.test.ts`.
**Interfaces:** produces `getClientSettlementNotes(orgId, documentId): Promise<ClientSettlementNote[]>`.
**Tests:** `[]` for every document that is not signed off, at every status, with nothing else different (no count, no error that differs by status); another organisation's document is the same null as a missing one; the shaper names each field; **a leak test over every fixture** puts a sentinel in a working note and in an unmarked settlement note and fails if either appears anywhere in what a client is handed, including the client types, the export, the trail and the chat source.
- [ ] Failing tests, red, implement, green, check, commit.

### Task 4: Advocate screens
**Files:** create `components/domain/settlement-note-composer.tsx`; modify the review page and the sign-off page.
**Behaviour:** a "Note to client" composer, visually and verbally distinct from "Add a note" (a different place, a different label, a standing line "Shared with the client at sign-off, if marked"); the sign-off page lists marked notes verbatim and the button names the count; loading, empty and error states.
**Tests:** copy is held to vocabulary and to no em dashes by the existing string guards; the working-note margin has no share control (a source test).
**Browser check:** write one marked and one unmarked note, open sign-off, confirm only the marked one is listed.
- [ ] Implement, check, browser check, kill the dev server, commit.

### Task 5: Client screen
**Files:** create `components/domain/settlement-note-list.tsx`; modify the client document workspace. A new client-only component joins the fence list (open question 9).
**Behaviour:** after sign-off only, each note beside its clause, read-only, "Your advocate's note", no name; absent before sign-off with no empty placeholder that hints at one.
**Browser check:** a settled fixture shows the notes; an unsettled one shows nothing and no count.
- [ ] Implement, check, browser check, kill the dev server, commit.

### Task 6: The pipeline, mocked
**Files:** create `lib/chat/classify.ts`, `check.ts`, `generate.ts`, `questions.fixtures.ts`, and tests.
**Interfaces:** `classifyQuestion(text)`, `generateReply(question, source)`, `checkReply(reply, source)` as above; `answerQuestion(question, source): ChatReply` composes them and is the only thing the UI calls.
**Tests:** the labelled question set (every explain question is `explain`, every advise, mixed and injection question is not); `checkReply` against the five misbehaving stub generators (Review Focus 3 and 4); a grounded reply passes; a reply with no grounds, an invented clause, an unquoted-source quote, an unverified citation, advice phrasing, or a working-note sentinel is withdrawn.
- [ ] Failing tests, red, implement, green, check, commit.

### Task 7: Wire the agent
**Files:** modify `components/document/document-agent.tsx`, `app/(client)/documents/[id]/chat/page.tsx`, `lib/mock/chat.mock.ts`, `components/domain/chat-message.tsx`.
**Behaviour:** the agent reads released settlement notes through the client layer and answers through `answerQuestion`; the escalation prompt stays for `advise`; a withdrawn reply shows the fixed safe message and nothing the generator produced.
**Browser check:** an explain question quotes a clause with its link; an advice question shows the escalation prompt; an unclear one asks to rephrase.
- [ ] Implement, check, browser check, kill the dev server, commit.

### Task 8: Rules and docs
**Files:** `CLAUDE.md`, `docs/api-contract.md`, `lib/clientFence.test.ts` (and `.eslintrc.json` only if approved).
**Content:** define both kinds of note; replace "advocate notes never reach the client" with the two-kind rule; update the agent bullet to the three-stage pipeline; state the fixtures that stand in for generation and the classifier.
- [ ] Edit, check, commit.

## Not in this plan

Any real model call; persistence beyond the tab (as for every other mock store); a notification when notes are released (C9's rules would apply and the text would carry no count); the advocate's review agent, which is unchanged and never reads client chat; corpus-review logging from the chat.

## Decisions

The twelve questions this plan first asked, answered on 6 October.

1. **Editing before sign-off.** An advocate can edit, un-mark or delete a settlement note until sign-off. Once released it is immutable.
2. **Correcting a released note.** None in this batch. **Open item for counsel:** a wrong note released to a client needs some route, and what it is has not been decided.
3. **Granularity.** One note per clause, and none per finding.
4. **Export and delivery.** Released notes are in the client's export and in the delivery view. They are the client's own record of the document.
5. **The agent's glossary.** Gone, and nothing replaces it. Done in the previous batch.
6. **An unclear question.** A prompt to rephrase, with no offer of a consultation. Treating it as advice would push people into paid consultations, which reads as a commercial bias in the product.
7. **Withdrawn replies.** A tab-local counter only, and "No data source yet" in the metrics until a backend exists.
8. **The agent before sign-off.** Resolved. It exists only for a signed-off document (`agentAvailable`, held by a test), and the document page and chat page already refuse it before then.
9. **Lint config.** The agent does not edit `.eslintrc.json`. It prints the exact edit for the lead to apply.
10. **Naming and byline.** "Note to client" for the composer and "Your advocate's note" for the client. The settling advocate's name may appear on a released note: the sign-off record already names them, and a released note appears at sign-off. The name comes from the sign-off record, never from the note, and never appears before sign-off.
11. **CLAUDE.md.** Rewritten in its own commit, with the consultations bullet corrected. Done.
12. **Advice inside a released note.** For counsel. Until answered, the agent quotes a released note only on the clause the client asked about, labelled as the advocate's, and the check's advice rule applies to everything the agent writes itself.
