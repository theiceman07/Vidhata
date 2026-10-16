# AgentClause ("Vidhata") — Frontend handoff (Arjun, FE + AWS)

Repo: D:\agent_clause_fe (Next.js 15 App Router). Live preview: https://vidhata-pi.vercel.app/
Backend (D:\agent_clause_be, FastAPI + Supabase) is being REBUILT from scratch by the backend team. Do not touch or depend on it. Supabase must be in Mumbai (was Seoul); a teammate handles that.

## Storage split
- Supabase = clauses + vectors (pgvector) only.
- Client documents = AWS S3, ap-south-1, bucket `vidhata-dev-files-431618680755`. Presigned POST/GET, 5-min TTL, 25 MB max, PDF/DOCX/PNG/JPEG.
- S3 side is done (IAM least-privilege, CORS, round-trip test). `docs/storage/cors.json` allows localhost:3000 and the Vercel URL; it still has to be re-applied with `aws s3api put-bucket-cors`.

## Contracts (PROVISIONAL until Tejaswi confirms)
- C1 chat request: {document_id, question, language}. Reply: {status: answered|refused|escalated, answer, citations[{clause_reference, quote}], reason, language}.
  - answered needs answer + at least 1 citation.
  - refused/escalated carry no answer/citations and need a reason.
- R1 finding: finding_id, layer 0-6, severity low|medium|high, rule_applied, clause_reference, clause_text (optional), description, remedy_suggested, citations[] each {text, verified, corpus_ref} (verified iff corpus_ref), status pending|confirmed|overridden|added (derived from DB `advocate_action`), override_note (optional). Aligned to SRD FR-15 and the frontend playbook §6. The FE maps it to its own `Finding` in `lib/api/findings.ts`: `added` shows as confirmed and advocate-added.
- Known FE/BE mismatches: doc status vocabulary, citations have no DB column, FE has no real auth yet, R1 carries no finding number (the FE numbers by position until the API gives one).

## Architecture rules
- Swap boundary is `lib/api/*`. Mock layer uses randomDelay / shouldSimulateFailure (`?fail=1` in preview mode).
- Zod for validation. Vitest (node env, `lib/**/*.test.ts`); classic-JSX tests need global React.
- `lib/chat` must not import from `lib/api` (guard test). New session code lives in `lib/chat-session`.
- Client-fence ESLint override list in `.eslintrc.json` must include new fenced components (`lib/clientFence.test.ts` enforces it).

## What was built (all committed)
- `lib/contracts.ts` (+test): zod schemas for C1/R1.
- `lib/storage/upload.ts` (+test): checkFile, uploadDocumentFile (upload-url -> S3 form POST, file last -> confirm), getDownloadLink, StorageError. Not wired into any screen.
- `lib/api/chat.ts` (+test): C1 boundary; mockTransport, unavailableTransport, httpTransport (path `/agents/chat` is a GUESS), askDocumentQuestion, toWireReply/fromWireReply, ChatError.
- `lib/chat-session/thread.ts`, `useDocumentChat.ts`, `render.test.ts`: pure thread state + hook (one question at a time, stale replies dropped after reset).
- `components/domain/chat-status.tsx` (new), `chat-message.tsx` (rewritten: refused style, multi-citation chips), `components/document/document-agent.tsx` and `app/(client)/documents/[id]/chat/page.tsx` (patched to use the hook).
- `lib/types.ts`: ChatAnswerStatus, ChatCitationView, optional status/citations on ChatMessage.
- `docs/tuesday-checklist.md`: my draft completion checklist (the real Wednesday checklist is the team's list of everyone's tasks; still needed).
- `lib/api/findings.ts` (+tests, R1 fixtures in `lib/mock/r1-findings.fixtures.ts`): the R1 -> screen `Finding` mapper.
- `app/dev/*`: galleries (components, findings from R1, chat states). `app/dev/layout.tsx` answers 404 in any production build, so they exist only under `next dev`.
- `npm run check` passes on Windows: 81 test files / 936 tests.

## Open / next
1. Findings display (Tue 20): screen already shows rule ID, severity, clause ref, status. The R1 -> screen `Finding` mapper is `lib/api/findings.ts`; `added` maps to confirmed and advocate-added, missing optional fields get safe defaults.
2. Tuesday dry run against the team's real Wednesday checklist.
3. Waiting on backend rebuild: X1 stub agents, S3 endpoints (upload-url, confirm, download-url using `document_versions.storage_key`), real login, integration.
4. Your to-dos: rotate AWS backend key, re-apply CORS, delete test S3 object, send C1/R1 to Tejaswi, delete old backend folder.

## Prompt to check for bugs (paste into Claude Code)

Review the uncommitted changes in this repo (`git status`, `git diff`, plus untracked files) for bugs and issues. This is a Next.js 15 / TypeScript / zod / vitest project; see HANDOFF.md for context. Do not modify the backend folder.

1. Run `npm run check` (typecheck, lint, tests) and report every failure with its root cause.
2. Read `lib/api/chat.ts`, `lib/chat-session/*`, `lib/contracts.ts`, `lib/storage/upload.ts`, `components/domain/chat-message.tsx`, `chat-status.tsx`, `components/document/document-agent.tsx` and `app/(client)/documents/[id]/chat/page.tsx`. Look for: race conditions (stale replies, double submit, retry after reset), unhandled promise rejections, effect dependency bugs, state updates after unmount, missing error states, and C1/R1 rule gaps in the zod schemas.
3. Check accessibility of the new loading and error UI (roles, focus, keyboard, disabled states) and that no user-facing text leaks internal error details.
4. Check security: no secrets or tokens in client code, `httpTransport` never logs the token, upload validates type/size, no unsanitised HTML.
5. Confirm architecture guards still hold: `lib/chat` does not import `lib/api`, and fenced components are listed in `.eslintrc.json`.
6. Try the chat page in `npm run dev` (docked agent and `/documents/[id]/chat`), including `?fail=1`, and report anything that misbehaves.

Report findings ranked by severity with file:line and a suggested fix. Fix only clear bugs, one small commit per fix; list anything uncertain instead of changing it.
