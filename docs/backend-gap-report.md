# Backend gap report

What the backend actually offers today, set against what the frontend assumes.

- **Backend read:** `D:\agent_clause_be`, branch `arjun`, head `2fa5a15`, read-only. Read: `backend/app` (main, config, db, auth, documents, findings, lawyer_queue, users, drafting, clauses) and `supabase/migrations` 01 to 14.
- **Frontend read:** `lib/contracts.ts` (R1, C1), `lib/types.ts`, `lib/api/findings.ts`, `lib/api/chat.ts`, `lib/api/documents.ts` (mock), `lib/storage/upload.ts`, `docs/api-contract.md`, `docs/storage/`, and the login pages and session code.
- **Status:** no code was changed to produce this. Every claim about the backend is from reading its source. Nothing was run against a live database or Supabase project.
- **Tags** used in the gap tables: **FE change** (we adapt to what exists), **BE change** (the backend adds something), **Decision** (a product or contract choice has to be made first).

## Summary

1. The backend is a thin state machine, a lawyer queue and a findings adjudication API. It has **no** upload or storage endpoints, **no** chat endpoint, **no** payment, **no** client-facing findings, **no** drafting HTTP route, and **no** pipeline trigger.
2. The R1 finding contract we wrote does not match what the backend sends. The wire names differ (`id`, `advocate_action`, `advocate_notes`), `critical` severity exists only on the backend, `layer` can be `null` on the backend, and there are no `citations`, no `clause_text` and no `override_note` as such.
3. One mismatch makes the whole findings screen fail: a lawyer-added finding comes back with `layer: null`, and `mapReviewFindings` throws for the entire list when any one finding fails R1 (`lib/api/findings.ts:79-86`, `lib/contracts.ts:36`).
4. Document states do not map one to one. Two frontend states have no backend home (`awaiting_payment`, `executed`), and `under_review` is not a backend state (it is `pending_lawyer_review` with `assigned_lawyer_id` set).
5. `delivered` can never be reached through the API, because the only transition into it is system-only and no route acts as `system`. The same is true of every other system transition, so a document cannot leave `drafted` via the API either.
6. No user can create a document by default. `POST /documents` accepts only `live` contract types, and the migrations set none to `live` (four are `in_build`).
7. Authentication is a Supabase JWT in `Authorization: Bearer`. The frontend has no Supabase client and no real login. The login pages are a preview-mode mock.

---

## 1. Endpoint inventory

Router mounting is in `backend/app/main.py`. The `drafting` and `clauses` packages are **not** mounted as routers. They are library code only (section 1.6).

Roles are the JWT `user_role` claim: `startup_user` or `lawyer`. "Any" means any authenticated user with a `user_role` claim. Errors are FastAPI's `{"detail": "..."}`. Validation failures (422 from Pydantic) have `detail` as a **list**, not a string.

### 1.1 Users and health

| Method | Path | Auth / role | Request | Response |
|---|---|---|---|---|
| GET | `/health` | none | none | `{"status": "ok"}` |
| GET | `/me` | any | none | `{"token": {id, email, role, org_id}, "profile": {id, email, full_name, role, org_id} \| null}` |
| GET | `/lawyer/ping` | `lawyer` | none | `{"ok": true, "lawyer_id": "<uuid>"}` |

There is no route to create an organisation, link a profile to an organisation, change a role, or update a profile. A new sign-up gets a `profiles` row from a trigger with `role = 'startup_user'` and `org_id = null` (migration 02).

### 1.2 Documents

| Method | Path | Auth / role | Request | Response |
|---|---|---|---|---|
| POST | `/documents` | `startup_user` | `{doc_type: str, state_of_execution?: str, transaction_value?: decimal >= 0}` | 201, the `documents` row. 400 if the user has no `org_id`. 422 if `doc_type` is unknown or its status is not in `SELECTABLE_CONTRACT_STATUSES` (default `["live"]`). |
| GET | `/documents` | any | none | Array of `documents` rows. A `startup_user` gets their org's documents (newest first). Any other role gets documents where `assigned_lawyer_id` is them. |
| GET | `/documents/{doc_id}` | any | none | One `documents` row. 404 for missing **and** not visible (a startup user outside the org, a lawyer who has not claimed it). |
| POST | `/documents/{doc_id}/transition` | any, then per-transition (1.2a) | `{to_state: DocState, note?: str}` | The updated `documents` row. 404 not visible, 409 illegal move or a gate failed, 403 wrong role. |

The `documents` row (all columns, `select *`, nothing filtered by role): `id, org_id, created_by, doc_type, state, state_of_execution, transaction_value, triage_tier, assigned_lawyer_id, draft_for_settlement, created_at, updated_at, queued_at`. A client therefore sees `assigned_lawyer_id` and `triage_tier`.

**1.2a Transition table** (`documents/states.py`). Any pair not listed is a 409.

| From | To | Who |
|---|---|---|
| `drafted` | `under_ai_review` | system |
| `under_ai_review` | `pending_lawyer_review` | system (sets `queued_at`) |
| `pending_lawyer_review` | `lawyer_commented` | lawyer |
| `pending_lawyer_review` | `lawyer_approved` | lawyer (sign-off, see below) |
| `lawyer_commented` | `revision_in_progress` | startup_user or system |
| `revision_in_progress` | `under_ai_review` | system |
| `lawyer_approved` | `delivered` | system |

`documents/service.py` builds the actor from the JWT (`Actor.from_user`), so `actor.kind` is only ever `startup_user` or `lawyer`. **No route produces `system`.** Every system-only transition is unreachable over HTTP, including the first two, so a document created through the API stays `drafted`.

Sign-off (`to_state = lawyer_approved`): blocked (409) while any `high` or `critical` finding on the **latest version** has `advocate_action is null`. Low and medium findings do not block. It then sets `lawyer_assignments.signed_off_at`, and sets `draft_for_settlement = false`. `delivered` requires a signed-off assignment.

### 1.3 Lawyer queue

All routes: `lawyer` only.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/queue?limit=50` (1 to 100) | none | Array of `{id, doc_type, state_of_execution, transaction_value, triage_tier, queued_at, org_id, org_name}`. Only `pending_lawyer_review` and unassigned, oldest first, minus orgs this lawyer declared a conflict with. |
| POST | `/queue/{doc_id}/claim` | no body | The updated `documents` row. 409 if no longer available or a conflict is declared. Creates a `lawyer_assignments` row. Does **not** change `state`. |
| POST | `/queue/{doc_id}/release` | no body | `{"ok": true}`. Only while `pending_lawyer_review` and the caller holds it. |
| POST | `/queue/{doc_id}/declare-conflict` | `{reason?: str}` | `{"ok": true}`. Records a conflict against the document's **organisation**, and releases the document if held. |

### 1.4 Findings

All routes: `lawyer` only. Findings are never returned to a `startup_user`, and RLS (`findings_read`) also limits reads to lawyers.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/documents/{doc_id}/findings?layer=0..6&severity=...` | none | Array of finding rows plus `version_no`, **latest version only**, ordered critical, high, medium, low then layer then time. 404 unless the lawyer holds the document. |
| POST | `/findings/{finding_id}/adjudicate` | `{action: "confirm" \| "override", notes?: str}` | The updated finding row. 409 unless the document is `pending_lawyer_review`. 422 if `override` has no non-blank `notes`. Repeatable (a finding can go from confirm to override). |
| POST | `/documents/{doc_id}/findings` | `{severity, description, clause_reference?, rule_applied?, remedy_suggested?, notes?}` | 201, the new finding row. `layer = null`, `advocate_action = 'add'`. 409 if not `pending_lawyer_review` or the document has no version. |

Finding row columns: `id, document_id, document_version_id, layer (nullable), severity, clause_reference, description, rule_applied, remedy_suggested, advocate_action, advocate_notes, adjudicated_by, adjudicated_at, created_at`, and `version_no` on the list. `severity` is `low | medium | high | critical`. `advocate_action` is `null | confirm | override | add`.

The pipeline's `create_findings()` (`findings/service.py`) is a Python function, "not exposed as an API route". The pipeline layers that would call it are not in the repository.

### 1.5 What does not exist

No routes for: upload, confirm or download of files; chat; payment, fees or invoices; client findings, requests or responses; version lists or diffs; the audit trail; summaries; consultations; settlement or working notes; notifications; account, team or billing; consent or deletion; advocate onboarding or invites; metrics; citation checks.

### 1.6 Drafting (library only, no HTTP)

| Module | What it offers | Route? |
|---|---|---|
| `drafting/retrieval.py` | `retrieve_clauses(conn, clause_type, contract_type, query, k, verified_only, ...)` returns `RetrievalResult {clauses[], unembedded_matches, warnings[]}` | none |
| `drafting/adaptation.py` | `adapt_clause(clause, DealFacts)` returns `AdaptedClause` with `status`, `edits_applied`, `edits_rejected`, `diff`, `diff_only_facts`, `unresolved_placeholders`, `warnings` | none |
| `drafting/schemas.py` | `DealFacts {contract_type, party_a, party_b, effective_date?, governing_law?, jurisdiction_city?, terms: dict[str,str]}` | none |
| `clauses/*`, `gemini.py` | clause loader, Gemini embedding and JSON generation | none |

The latest commit message (`2fa5a15`) says D6 to D8 were removed, so assembly, citation lookup and the verified-only guard are not present. `clauses` has `verification_status` (`staging` or `verified`) and `statute_refs`, but no citation lookup exists.

---

## 2. Our assumptions vs reality

### 2.1 Findings (R1 against `FindingIn`, the findings table and the findings routes)

Our R1 is `reviewFindingSchema` in `lib/contracts.ts`. "Backend" below is the list/adjudicate/add response, since `FindingIn` (`findings/schemas.py`) is the pipeline's input and is not a response shape.

`FindingIn` fields: `layer 0..6, severity, clause_reference?, description, rule_applied?, remedy_suggested?`. It has no id, citations, clause text or status.

| R1 field (ours) | Backend reality | Match? | Resolution |
|---|---|---|---|
| `finding_id` (uuid) | Column `id`. Sent as `id`. `finding_id` is never sent. | **No** (name) | FE change: read `id`. |
| `layer` (int 0..6, required) | Column is nullable since migration 10. A lawyer-added finding has `layer = null`. | **No** (nullability) | FE change: accept `null`. It is a real break: one added finding fails R1 and the mapper throws for the whole list. `PipelineLayer` in `lib/types.ts` is `0..6`, so the screens need a value for "no layer" (the advocate-added source already exists). |
| `severity` (`low\|medium\|high`) | `low\|medium\|high\|critical`, in the DB check, `Severity` literal and sort order. | **No** | FE change plus Decision. Add `critical` to `SEVERITIES`, `Severity`, and every severity table, colour, sort and filter. Decision: whether `critical` is shown as its own level or folded into `high`. Folding hides a real distinction the backend uses for sign-off blocking. |
| `rule_applied` (string, nullable) | Same name, nullable text. | Yes | None. |
| `clause_reference` (nullable) | Same name, nullable free text. No format is enforced. | Yes (shape) | FE: the clause join depends on a `"Clause 7.2"` format (`clauseNumberFromReference`). Confirm the pipeline emits that format. |
| `clause_text` (quoted span, nullable) | Not stored or returned. | **Missing** | R1 already defaults it to `null`, so nothing breaks, but the margin quote is empty. BE change if the quoted span matters, or the FE derives it from the document's clauses (which also do not exist, see 3.1). |
| `description` | Same. | Yes | None. |
| `remedy_suggested` | Same, nullable. | Yes | None. |
| `citations[]` `{text, verified, corpus_ref}` | **No column, table or field anywhere.** No citation lookup in the backend (D7 removed). | **Missing** | BE change plus Decision. The whole citation gate (verified or blocked, withdraw with note, sign-off blocker, re-check at hand-off) has nothing behind it. The frontend would receive no `citations`, which the mapper accepts (default `[]`), but then no finding can ever show a source and the "settle without a verified source needs a note" rule fires on every finding. |
| `status` (`pending\|confirmed\|overridden\|added`) | Not sent as `status`. Derived from `advocate_action`: `null`, `confirm`, `override`, `add`. | **No** (name and values) | FE change: map `null` to `pending`, `confirm` to `confirmed`, `override` to `overridden`, `add` to `added`. |
| `override_note` | Column `advocate_notes`. It holds the note for **any** action (confirm, override, add), not only overrides. | **No** (name, meaning) | FE change: read `advocate_notes`. Decision: our UI shows the note as the "override" reasoning. For `confirm` and `add` the note is something else. Map it to `overrideNote` only when the action is `override`, and decide whether the others get a label. |
| (not in R1) `resolvedAt` | `adjudicated_at` | Available | FE change: use it. `toScreenFinding` hard-codes `null`. |
| (not in R1) who decided | `adjudicated_by` (uuid, no name) | Available | Decision: the screens show an advocate name. The backend returns an id only. |
| (not in R1) version | `document_version_id`, `version_no` (list only) | Extra | FE ignores them today (zod strips unknown keys). Needed for any version or diff feature. |
| finding number (`number`, `clientNumber`) | Not stored. | **Missing** | The mapper numbers by list position, which breaks as soon as the list is filtered or the latest version changes. BE change if numbers must be stable across drafts (api-contract section 4). |

Write side:

| What we do | Backend reality | Resolution |
|---|---|---|
| `updateFinding` sets disposition `confirmed`, `overridden`, **or back to `pending`** (reopen). | Adjudicate accepts only `confirm` or `override`. No way to set `advocate_action` back to null. | Decision / BE change: reopen is not supported. Either drop reopen in the FE or add it. |
| `updateFinding` refuses to settle when a citation is blocked, or when no source remains and no note is given. | Backend knows nothing of citations. It requires a note for `override` only. | Depends on the citation decision above. |
| `addFinding` sends a full `Finding` (own `findingId`, `clauseText`, `citations`, `layer`, `source`). | `LawyerFindingIn` takes only `severity, description, clause_reference, rule_applied, remedy_suggested, notes`. The id is server-generated. | FE change: send the smaller body, take the id from the response. `clauseText` and `citations` have nowhere to go. |
| Every finding must be settled before sign-off. | Only `high` and `critical` findings without an `advocate_action` block sign-off. | Decision: which rule wins. The backend rule is looser than ours. |
| Changing a request to the client (`requestChange`, per finding, with text) and the client's `respondToChanges`. | No per-finding change request, no client response, no client-facing findings. `lawyer_commented` and `revision_in_progress` are bare state moves. The `note` on `/transition` goes to the audit log only. | BE change plus Decision. The whole revision loop (api-contract section 5) has no data model. |
| Client reads findings in a client-shaped view (`ClientFinding`). | Findings are lawyer-only at both the route and the RLS policy. | BE change: a client findings view with the visibility rules from api-contract section 4. |

### 2.2 Document status vocabulary (frontend `DocumentStatus` against `states.py`)

| Frontend status | Backend equivalent | Notes |
|---|---|---|
| `draft` | `drafted` | Direct. |
| `analysing` | `under_ai_review` | Direct. Reachable only by a system actor, so unreachable today. |
| `awaiting_payment` | **none** | The backend goes `under_ai_review` to `pending_lawyer_review` directly. There is no payment table, column, route or state. BE change or Decision: either payment becomes a backend concern, or the frontend drops this state. |
| `pending_review` | `pending_lawyer_review` with `assigned_lawyer_id is null` | Direct, but "unassigned" is part of the meaning. |
| `under_review` | `pending_lawyer_review` with `assigned_lawyer_id is not null` | **Not a state.** Claiming does not change `state`. The FE must derive it from the assignment. |
| `revision` | `lawyer_commented` **and** `revision_in_progress` | Two backend states for one of ours. `lawyer_commented` is "lawyer has sent comments, client has not acted". `revision_in_progress` is "client or system has started the revision". Decision: do we need to tell them apart on a screen. |
| `settled` | `lawyer_approved` (sign-off) and `delivered` | `lawyer_approved` is sign-off. `delivered` is release to the client. Our `settled` means signed off **and** visible to the client. Decision: which backend state unlocks the client's view (summary, chat, execution checklist). Safest reading is `delivered`, but see below. |
| `executed` | **none** | No state for the client confirming stamping and signature. `negotiation_in_progress` exists but is marked "Path 2, future: no transitions yet". BE change or Decision. |
| (none) | `negotiation_in_progress` | Unused. The FE can ignore it, but the type must not crash on an unknown value. |

Other things the transition design implies:

- **`delivered` is unreachable.** `lawyer_approved` to `delivered` is system-only, and no route runs as system. Until the backend adds a system path (an internal job, a service-role route, or letting the lawyer's sign-off also deliver), the client cannot see a signed-off document. Needs a BE change.
- **Document identity.** A backend document has no `title`, party names, `governing_law`, `duration_months`, MSME flag, or key terms. Our `ContractDocument` and intake wizard collect all of these. They have no column. `POST /documents` takes only `doc_type`, `state_of_execution`, `transaction_value`. BE change: add columns or a facts table (the drafting `DealFacts` schema already has parties, governing law and terms).
- **Contract type codes.** Frontend `type` is `nda | vendor | msa | employment`. Backend codes are `nda`, `vendor_supplier`, `msa`, `employment_contract` (19 types in migration 03). FE change: map codes. Only `nda`, `vendor_supplier`, `founders_agreement` and `sha` are `in_build`, and **none is `live`**, so `POST /documents` returns 422 "is not supported yet" unless the environment sets `SELECTABLE_CONTRACT_STATUSES` to include `in_build`. msa and employment are `planned`, so they cannot be created at all.
- **Tier.** Backend `triage_tier` is `standard | enhanced | senior_counsel`. Ours is `standard | enhanced | senior`. FE change. Nothing in the backend sets `triage_tier`, so it is always null.
- **Version and revision count.** There is no `version` or `revisionCount` on the document. Derive from `document_versions` (no route reads them).

### 2.3 Chat (`/agents/chat` and C1)

| Frontend assumes | Backend reality | Tag |
|---|---|---|
| `POST {apiBase}/agents/chat`, Bearer token, body `{document_id, question, language}`. Reply is C1: `{status: answered\|refused\|escalated, answer, citations[{clause_reference, quote}], reason, language}`. (`lib/api/chat.ts`, `lib/contracts.ts`) | **No route, no `agents` package.** The only model code is `app/gemini.py` (`generate_json`, embeddings), used by drafting. | BE change |
| `lib/contracts.ts` says it "mirrors backend/app/contracts/review.py and chat.py". | Neither file exists. There is no `app/contracts` directory. R1 and C1 are defined only on the frontend. | Decision: R1 and C1 are not agreed contracts yet. The header says PROVISIONAL, and the backend has not adopted them. |
| The path is already marked "a guess until that exists" in `chat.ts`. | Confirmed. | BE change, or FE adopts whatever path is built. |
| Chat available only for a signed-off document, drawn from settled clauses, summary and released notes (`lib/chatAccess.ts`). | The backend has no clauses of a document, no summary, no released notes. | BE change: these inputs have to exist first. |
| Language field in the request. | Not applicable yet. | Decision. |

The backend does have the pieces a chat route would use: JWT auth with a role and org, `get_document` visibility (404 for other orgs), a Gemini client, and an `audit_logs` table.

### 2.4 Upload (`upload-url`, `confirm`, `download-url` and `document_versions.storage_key`)

What the frontend calls (`lib/storage/upload.ts`, all with `Authorization: Bearer`):

| Call | Request | Expected response |
|---|---|---|
| `POST /documents/{id}/files/upload-url` | `{filename, content_type, size}` | `{key, url (https), fields{}}`, a presigned S3 POST |
| browser `POST` to `url` | multipart with `fields` then `file` | S3 answers; 413 means too large |
| `POST /documents/{id}/files/confirm` | `{key}` | `{version_no}` |
| `GET /documents/{id}/files/download-url?version_no=N` | none | `{url (https), expires_in, version_no}` |

Reality:

- **None of the three routes exist.** The header of `upload.ts` points to `backend/app/storage/router.py`, which is not in the repository. `requirements.txt` has no `boto3`, and `config.py` has no bucket, region or credential settings.
- A reference presign helper does exist, but in **this** repo: `docs/storage/s3_presign.py` (with `provision-s3.sh`, `cors.json`, IAM and bucket policies). It was written for the backend to adopt and has not been.
- `document_versions` has `id, document_id, version_no (> 0), storage_key (text, NOT NULL), created_at`, unique on `(document_id, version_no)`, no UPDATE allowed (trigger). `storage_key` is described as "S3/R2 or Supabase Storage object key, never file bytes". This fits our `key` and `version_no` well.
- The table has **no** filename, content type, size, checksum, uploader, or "created by" (our `VersionCreatedBy`: `first_pass`, `advocate_revision`, `client_response`). BE change if those are needed. The upload response contains none of them.
- `document_versions` has an RLS read policy and no write route. Nothing creates a version, and `findings.document_version_id` is `NOT NULL`. **So no finding can exist and `POST /documents/{id}/findings` returns 409 "Document has no version yet" until some code inserts a first version.** That is a pipeline dependency, not just an upload one.
- `confirm` would have to: check the key belongs to this org and document, check the object exists in S3, allocate the next `version_no` safely (the unique constraint would force a retry under a race), and write the audit log. The frontend sends only `{key}`.
- **Decision (a mismatch inside the frontend):** `upload.ts` registers every upload as a **document version**, but the thing the UI uploads today is *execution evidence* (the stamp-duty certificate, mocked by `attachEvidence`). Evidence is not a new draft of the contract. If `confirm` always inserts into `document_versions`, evidence uploads would appear as contract drafts and shift version numbers. Evidence needs its own table or a `kind` on the upload.
- The frontend allows PDF, DOCX, PNG and JPEG up to 25 MB (`checkFile`). The backend has no matching limit yet.

### 2.5 Auth (what the frontend must send)

| Item | Backend requires | Frontend today |
|---|---|---|
| Credential | `Authorization: Bearer <Supabase access token>`. No other auth header. No cookies. No `X-Org-Id` style headers (org comes from the token). | `chat.ts` and `upload.ts` take a `token` option and set Bearer correctly. **Nothing produces a token.** |
| Token type | A Supabase-issued JWT. `aud` must be `authenticated`. Algorithms: `HS256` (needs `SUPABASE_JWT_SECRET` on the server) or `ES256` / `RS256` verified against `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. | No Supabase client: `package.json` has no `@supabase/supabase-js`, there is no auth code, and no `NEXT_PUBLIC_SUPABASE_*` variable. |
| Custom claims | `user_role` (required, else 403 "Token has no user_role claim") and `org_id` (may be null). Added by `custom_access_token_hook` (migration 08), enabled in `supabase/config.toml` for local. **The hosted project must enable the hook in the dashboard too.** | n/a |
| Role values | `startup_user` or `lawyer`. | The session role is `client` or `lawyer` (`lib/session.tsx`). FE change: map `client` to `startup_user`. The backend uses `lawyer` where we say "advocate" in copy only. |
| Role changes | Claims are fixed at token issue. A role or org change needs a refreshed token. | n/a |
| Org membership | A `startup_user` with no `org_id` cannot create documents (400) and sees an empty list. **No route or flow sets `org_id`.** Lawyers must have `org_id` null (DB check). | The invite and onboarding flows are mocks. BE change plus Decision: how a first user gets an organisation and how a lawyer's role is granted. |
| CORS | `allow_origins = [FRONTEND_ORIGIN]` (default `http://localhost:3000`), all methods and headers, no credentials. Bearer works. | The deployed origin must be set in `FRONTEND_ORIGIN`. Only one origin is allowed. |
| Errors | 401 with `WWW-Authenticate: Bearer` for missing or invalid token. 403 for wrong role. 404 hides other tenants' documents. | `kindOfStatus` maps statuses to fixed copy. `readDetail` keeps `detail` only when it is a string, so 422 validation lists are dropped from the debug text (harmless). |
| Login UI | Real Supabase sign-in (email and password, or magic link). | `app/(public)/login` and `advocate-login` are gated by `NEXT_PUBLIC_VIDHATA_PREVIEW_MODE` and sign in with `admin/admin`. The session is a `localStorage` role flag and is presentation only (`docs/api-contract.md` section 9). |

---

## 3. Gaps

### 3.1 What the backend lacks that the frontend needs

| # | Gap | Tag |
|---|---|---|
| B1 | No system actor over HTTP. `drafted` to `under_ai_review` to `pending_lawyer_review`, `revision_in_progress` to `under_ai_review`, and `lawyer_approved` to `delivered` cannot happen via the API. Nothing runs the pipeline. | BE change |
| B2 | No code creates `document_versions`, so no findings can exist, and no "add finding" works. | BE change |
| B3 | No upload, confirm or download routes, no S3 config, no `boto3`. A reference helper exists in the frontend repo (`docs/storage/`). | BE change |
| B4 | No chat route. No `agents` package, no document clause store, no summary, no released notes to answer from. | BE change |
| B5 | No citations: no column, no lookup, no gate. D7 was removed. Findings carry no sources. | BE change plus Decision |
| B6 | No document identity or deal-facts columns beyond `doc_type`, `state_of_execution`, `transaction_value`. No title, parties, governing law, duration, MSME flag, key terms. | BE change |
| B7 | No clause store for a **document**. `clauses` is the reusable corpus, not a document's text. The workspace needs numbered clauses, headings and bodies per version. | BE change |
| B8 | No payment, fee, invoice or tier-price model, and no `awaiting_payment` state. | Decision (then BE change) |
| B9 | No client-facing findings, request, response or revision data model, no client-visible subset, no finding numbering. | BE change |
| B10 | No version list, diff or audit-trail routes (the audit table exists; RLS lets a user read it only through direct Supabase access). | BE change |
| B11 | No route to create an organisation, set `org_id` or grant the `lawyer` role. New users cannot create documents. | BE change plus Decision |
| B12 | `POST /documents` accepts only `live` types and none is live. The environment must set `SELECTABLE_CONTRACT_STATUSES`, or statuses must be promoted. | BE change (config) |
| B13 | A "reopen" (adjudicate back to pending) action. | Decision |
| B14 | `GET /documents/{id}` is lawyer-visible only after a claim; a lawyer cannot open a queued document to read it before claiming. The queue rows carry no title, no parties and no findings. | Decision (conflict check vs. informed claiming) |
| B15 | Role-based response shaping: `GET /documents` returns the full row (including `assigned_lawyer_id`, `triage_tier`, `draft_for_settlement`) to clients. | BE change |
| B16 | Everything in api-contract sections 8 and 9 (consultations, settlement notes, working notes, notifications, billing profile, privacy, account and team, metrics, citation attempts, advocate profile). | BE change (later; not in this phase) |
| B17 | No drafting route. Retrieval and adaptation exist as functions. Nothing exposes "draft this contract from these facts". | BE change |

### 3.2 What the frontend must change to match what exists

| # | Change | Where |
|---|---|---|
| F1 | Read `id` (not `finding_id`), `advocate_action` (not `status`) and `advocate_notes` (not `override_note`) from findings. Map actions to our four statuses. | `lib/contracts.ts`, `lib/api/findings.ts` |
| F2 | Accept `layer: null`. Give the screens a value for "no layer". | `lib/contracts.ts`, `lib/types.ts`, `lib/api/findings.ts` |
| F3 | Add `critical` to `SEVERITIES`, `Severity` and every place that orders, colours or counts severity. | `lib/contracts.ts`, `lib/types.ts`, screens, tests |
| F4 | Use `adjudicated_at` for `resolvedAt`. | `lib/api/findings.ts` |
| F5 | Make the mapper tolerant: one bad finding should not discard the list silently, or should fail with a message that names it (it does name it today). Decide the policy together with F2. | `lib/api/findings.ts` |
| F6 | Send `addFinding` as `LawyerFindingIn` and take the id from the response. | `lib/api/documents.ts` (real client) |
| F7 | Derive `under_review` from `pending_lawyer_review` plus `assigned_lawyer_id`. Map `lawyer_commented` and `revision_in_progress` to `revision`. Map `lawyer_approved` and `delivered` to `settled`. Tolerate `negotiation_in_progress`. | new status mapper |
| F8 | Map contract type codes (`vendor` to `vendor_supplier`, `employment` to `employment_contract`) and tier (`senior` to `senior_counsel`). | intake and mappers |
| F9 | Map the session role `client` to `startup_user`. | `lib/session.tsx` |
| F10 | Add Supabase auth: `@supabase/supabase-js`, a real login that yields the access token, token refresh, and a place to keep the token in memory. Keep the preview login behind the preview flag. | new `lib/auth/*`, login pages |
| F11 | Add `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. | env, `.env.example` |
| F12 | Remove the claim body: `claimDocument` sends a conflict declaration, but `POST /queue/{id}/claim` takes no body. Keep the declaration on the screen, but it is not recorded server-side. Conflicts are by organisation id on the backend, by name on the frontend. | `lib/api/documents.ts`, `lib/conflicts.ts` |
| F13 | Do not fix up the sign-off rule: the backend only blocks on unadjudicated `high` and `critical`. Keep our stricter rule as a screen check, and read the 409 message when the backend refuses. | sign-off screen |
| F14 | Fix the `upload.ts` header comment (it names a file that does not exist). | `lib/storage/upload.ts` |
| F15 | Keep the mock layer as the default until B1 to B4 land. Nothing here should switch a screen to the real API yet. | all |

### 3.3 Needs a decision before either side builds

| # | Decision | Why it matters |
|---|---|---|
| D1 | Is `critical` a separate level on screen, or shown as `high`? | F3 touches every severity screen and test. |
| D2 | Is payment part of this product's backend? If yes, a state and tables. If no, drop `awaiting_payment` and the fee screens, or keep them mock-only. | Largest mismatch in the status vocabulary. |
| D3 | Which backend state means "the client may now read the document": `lawyer_approved` or `delivered`? | Gates summary, chat, delivery and checklist. |
| D4 | Is there an `executed` state, and who sets it? | No home today. |
| D5 | Citations: does the backend own the lookup (restore D7), or does the frontend keep a corpus mock? | The citation gate is a core rule (api-contract section 3). |
| D6 | Are R1 and C1 adopted by the backend as written, or do we adopt the backend's shape? This report assumes the backend's shape for findings because it exists. | They are marked PROVISIONAL and the backend has no copy. |
| D7 | Should evidence uploads share `document_versions`? | Otherwise evidence looks like a new draft. |
| D8 | How does a user get an organisation, and a lawyer their role? | Today a new user cannot create a document. |
| D9 | Should a lawyer be able to read a queued document before claiming? | Informed claiming against the conflict-of-interest check. |
| D10 | Should reopening an adjudicated finding be possible? | We support it. The backend does not. |

---

## 4. Questions for the backend owner

1. Which actor runs the system transitions (`drafted` to `under_ai_review` and the rest), and how? A job, a service-role endpoint, or something else? Without it a created document never moves.
2. Where is the pipeline that calls `create_findings()`, and what creates the first `document_versions` row (and its `storage_key`)? `findings.document_version_id` is NOT NULL.
3. Will you add the three file routes (`upload-url`, `confirm`, `download-url`)? We have `docs/storage/s3_presign.py` as a starting point. Should `confirm` insert into `document_versions`, or should evidence be separate?
4. Is there a plan for a chat route, and for `/agents/chat` specifically? What will it read to answer: a clause table for the document, a summary, released notes?
5. Do you want the R1 and C1 shapes we wrote, or should we follow your response shapes? `contracts.ts` says it mirrors `backend/app/contracts/review.py`, which does not exist.
6. Are `critical` findings meant to be shown to the lawyer as a fourth level? Is `layer = null` the permanent marker for a lawyer-added finding?
7. Will citations return? D7 (citation lookup) was removed. What is the plan for `citations[]` on a finding, and for `clause_text`?
8. Is payment in scope for the backend? If so, which state sits between screening and the queue? If not, we will drop `awaiting_payment`.
9. Which state is the client allowed to read the signed-off document in, and will `delivered` be reachable (today the only route into it is system-only)?
10. How do users get an `org_id`, and how is a lawyer's role granted? Is the access-token hook enabled on the hosted project, and which origin goes in `FRONTEND_ORIGIN`?
11. When will a contract type become `live`? Until then `POST /documents` returns 422 unless `SELECTABLE_CONTRACT_STATUSES` is widened. We also need `msa` and `employment_contract`, which are `planned`.
12. Will `GET /documents` and `GET /documents/{id}` be narrowed for clients (hide `assigned_lawyer_id`, `triage_tier`, `draft_for_settlement`)?
13. Is the adjudication rule intentional: only `high` and `critical` findings block sign-off? Our product rule is "every finding settled".
14. What identifies the document to a lawyer before claiming? The queue returns only type, state of execution, value and org name, with no title or parties.
15. Will there be a way to reopen an adjudicated finding?
16. Where should the deal facts from the intake wizard live (title, parties, governing law, duration, MSME flag, key terms)? `DealFacts` in `drafting/schemas.py` looks like the intended shape, but `keyTerms` is free text and `DealFacts.terms` needs snake_case keys with short string values.
