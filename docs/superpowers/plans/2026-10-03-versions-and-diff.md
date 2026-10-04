# Versions, diff and advocate-added findings

Covers C1, C3, C4, D3 and D5 from `vidhata-frontend-fixes.md`. C4, D3 and D5
share one data model, so the model is settled here first. C1 and C3 are
independent of it.

## Findings from reading the code

- D3 is half built. The review page has an "Add finding" dialog and
  `addFinding()` exists. An advocate-added finding is marked only by
  `ruleApplied: "MANUAL-ADVOCATE-ADDED"` and has no citations.
- Sign-off already blocks on a blocked citation: `updateFinding`,
  `signOffDocument` and `signOffBlockers` all enforce it.
- There was no citation corpus, only `corpusRef` strings on fixtures.

## Decisions

| Question | Decision |
|---|---|
| Version model | Separate immutable snapshots (`DocumentVersion`). `ContractDocument` stays as it is and is the live head. List and queue endpoints stay light. |
| Snapshot drift | Snapshots are written at hand-off points only: a draft is produced and handed on (first pass done, client round answered, advocate sends a revision back). The head is the working copy and may move ahead of the latest snapshot. Diffs compare snapshots, never the head. The one exception is D5 (`lib/reviewScope.ts`), which shows the head against the draft before the current one. Not the latest snapshot: that equals the head at hand-off, so the comparison would show nothing. Decided during D5 and agreed; do not revert it to match older wording. |
| Created-by | `first_pass`, `client_response`, `advocate_revision`. |
| Clause diff | `added`, `removed`, `changed`, `unchanged`, identified by clause number, with both texts. |
| Finding diff | `new`, `unresolved` (carried over), `resolved`. D5's three states map as: changed = clause `changed`, newly flagged = finding `new`, unresolved = finding `unresolved`. Defined once in `lib/diff.ts`. |
| Finding identity | `findingId` is stable when a finding carries over. A finding already settled in the earlier version is not listed. |
| Resolved has two causes | `resolvedReason`: `settled` (present in the later version, now decided) or `clause_changed` (no longer raised against the revised draft). It is derived inside `diffVersions`, so there is no second copy to drift. |
| `source` on Finding | Required, `"pipeline"` or `"advocate"`. Replaces the `MANUAL-ADVOCATE-ADDED` marker. |
| Blocked citation on an advocate finding | The finding can be saved. The existing rules stop it being settled or signed off until the source is withdrawn with a note. A blocked citation stays on the record, so there is no delete. |
| Pipeline re-run | Each snapshot has `pipelineRunAt`. Fixture citation states are as checked in that version's run. |
| Client visibility | Before sign-off: a version list with counts, and a diff limited to clauses behind requests addressed to them. No other draft text. No advocate-added findings unless a request is addressed to them. After sign-off: full history and diff, read-only. CLAUDE.md states this. |
| Cycle counter | `ContractDocument.revisionCount`: how many times the advocate has sent the document back. Incremented when a document first enters `revision`. |
| C1 draftable types | All four stay draftable, driven by one flag per type, so the list can be narrowed without code changes. |
| C3 coverage | Shows what actually ran on this document, then fixed text for checks, cross-clause checks and the out-of-scope list. |
| Corpus | Labels only, no statute body text: ICA s.27, s.28, s.74; MSMED s.15, s.16; Stamp Act s.35; Registration Act s.17. |

## Type changes (`lib/types.ts`)

```ts
Finding          += source: "pipeline" | "advocate"
ContractDocument += revisionCount: number
DocumentVersion   = { documentId, number, createdAt, createdBy, pipelineRunAt,
                      clauses: Clause[], findings: Finding[] }
// lib/diff.ts: ClauseChange, FindingChange, VersionDiff, diffVersions()
```

## Fixtures

`doc-vendor-revision` carries the history. Its live head is draft 3.

| Draft | createdBy | What it shows |
|---|---|---|
| 1 | first_pass | finding 7 (court named is in another state than delivery) and finding 4 (90-day payment term). Finding 4's citation is blocked: the corpus had no match on this run. |
| 2 | client_response | Clauses 3.2 and 8.1 changed. Finding 7 resolved by the clause change. Finding 4 carried over, and its citation now verifies because the corpus matched on the re-run. Finding 8 is new. |
| 3 (head) | advocate_revision | Clause 6.1 revised. Finding 8 settled by the advocate. Finding 4 carried over, with a request to the client outstanding. Finding 9 is advocate-added with a verified citation. Finding 10 is advocate-added with a blocked placeholder citation that is plainly fake. |

The other three fixtures only gain `source: "pipeline"` and `revisionCount: 0`.
Fixture prose describes contract facts. It does not state what any statute says.

## Commits

| # | Commit | Touches |
|---|---|---|
| 0 | Types, fixtures, diff, Vitest, CLAUDE.md rule | `lib/types.ts`, `lib/diff.ts`, `lib/diff.test.ts`, `lib/mock/versions.mock.ts`, `lib/mock/corpus.mock.ts`, `lib/mock/documents.mock.ts`, `lib/mock/clauses.mock.ts`, `lib/api/documents.ts`, `vitest.config.ts`, `package.json`, `CLAUDE.md` |
| 1 | C1 contract-type picker (independent) | `lib/mock/intake-options.mock.ts`, `components/domain/intake-wizard.tsx` |
| 2 | C3 draft banner and coverage panel (independent) | client document page, new coverage component |
| 3 | D3 citations and `source` | `lib/api/citations.ts`, review page dialog, `documents.ts`, `findings.ts` |
| 4 | C4 client version history and diff | client document page |
| 5 | D5 diff-scoped advocate review | review page, `lib/moves.ts` if the queue needs it |

Stop for review after commit 0, before C1.
