/**
 * R1 (finding) and C1 (conversation) contracts, shared with the backend.
 *
 * PROVISIONAL until the plan owner confirms (build plan tasks R1 and C1).
 * Mirrors backend/app/contracts/review.py and chat.py. Change both together.
 *
 * These are the wire shapes (snake_case, as the backend sends them). They are
 * deliberately separate from the screens' own `Finding` in lib/types.ts, which
 * uses different status and severity words; a mapper sits between the two when
 * the pages are wired to the real backend.
 */
import { z } from "zod";

export const SEVERITIES = ["low", "medium", "high"] as const;
export const FINDING_STATUSES = ["pending", "confirmed", "overridden", "added"] as const;
export const CHAT_STATUSES = ["answered", "refused", "escalated"] as const;

export const citationSchema = z
  .object({
    text: z.string().min(1),
    verified: z.boolean(),
    corpus_ref: z.string().nullable().default(null),
  })
  .superRefine((c, ctx) => {
    // A citation that cannot be resolved to the corpus is blocked, never verified.
    if (c.verified && !c.corpus_ref) {
      ctx.addIssue({ code: "custom", message: "a verified citation must carry a corpus_ref" });
    }
    if (!c.verified && c.corpus_ref) {
      ctx.addIssue({ code: "custom", message: "a blocked citation must not carry a corpus_ref" });
    }
  });

export const reviewFindingSchema = z.object({
  finding_id: z.string().uuid(),
  layer: z.number().int().min(0).max(6),
  severity: z.enum(SEVERITIES),
  rule_applied: z.string().nullable().default(null),
  clause_reference: z.string().nullable().default(null),
  /** The quoted span of the clause the finding is about. */
  clause_text: z.string().nullable().default(null),
  description: z.string().min(1),
  remedy_suggested: z.string().nullable().default(null),
  /** Every source the finding rests on; empty when it rests on advocate judgment alone. */
  citations: z.array(citationSchema).default([]),
  status: z.enum(FINDING_STATUSES).default("pending"),
  /** The advocate's reasoning, when they settled or overrode the finding. */
  override_note: z.string().nullable().default(null),
});

export const reviewResultSchema = z.object({
  document_id: z.string().uuid(),
  state: z.string(),
  findings: z.array(reviewFindingSchema),
});

export const chatRequestSchema = z.object({
  document_id: z.string().uuid(),
  question: z.string().min(1).max(2000),
  language: z.string().min(2).max(8).default("en"),
});

export const chatCitationSchema = z.object({
  clause_reference: z.string().trim().min(1),
  quote: z.string().trim().min(1),
});

export const chatReplySchema = z
  .object({
    status: z.enum(CHAT_STATUSES),
    // Trimmed first, so text of only spaces is no answer and no reason.
    answer: z.string().trim().nullable().default(null),
    citations: z.array(chatCitationSchema).default([]),
    reason: z.string().trim().nullable().default(null),
    language: z.string().default("en"),
  })
  .superRefine((r, ctx) => {
    if (r.status === "answered") {
      if (!r.answer || r.citations.length === 0) {
        ctx.addIssue({ code: "custom", message: "an answered reply needs answer text and a citation" });
      }
      if (r.reason) ctx.addIssue({ code: "custom", message: "an answered reply has no reason" });
    } else {
      // Never a partial answer alongside a refusal or escalation.
      if (r.answer || r.citations.length > 0) {
        ctx.addIssue({ code: "custom", message: `a ${r.status} reply carries no answer or citations` });
      }
      if (!r.reason) ctx.addIssue({ code: "custom", message: `a ${r.status} reply needs a reason` });
    }
  });

export type WireCitation = z.infer<typeof citationSchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatReply = z.infer<typeof chatReplySchema>;
