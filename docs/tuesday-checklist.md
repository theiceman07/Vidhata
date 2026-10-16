# Tuesday 20 Oct dry run: completion checklist (frontend + AWS owner)

Drafted from the schedule's "done when" lines. The Wednesday checklist is the
completion list of everyone's assigned tasks, so confirm this list matches it.
Tick each item with the evidence next to it.

| # | Task | Done when | Evidence | Done |
| --- | --- | --- | --- | --- |
| 1 | AWS setup (Fri 16) | A sample PDF uploads from the app and downloads through an expiring link | Upload, confirm, download, then the same link refused after 5 minutes | ☐ |
| 2 | Stub agents, X1 (Sat 17 to Sun 18) | The frontend calls review, chat and draft and renders what comes back | Review stub moves the document `under_ai_review` to `pending_lawyer_review`; chat stub returns answered, refused and escalated | ☐ |
| 3 | Frontend-backend integration (Sun 18 to Mon 19) | Document list, upload and lawyer queue load real data, not dummy data | Pages checked while signed in with a real account | ☐ |
| 4 | Chat UI, C10 (Mon 19) | A question typed in the UI shows a cited answer, a refusal and an escalation | One screenshot of each state; loading and error states seen | ☐ |
| 5 | Findings display (Tue 20) | Rule ID, severity, clause reference and status shown from the R1 schema | A finding with a verified citation and one with a blocked citation | ☐ |

Contracts (both provisional until the plan owner confirms): R1 and C1 in
`lib/contracts.ts` and `backend/app/contracts/`.
