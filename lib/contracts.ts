/**
 * R1 (finding) and C1 (conversation) contracts, shared with the backend.
 *
 * R1 mirrors the backend's finished schema (backend/app/schemas/finding.py, and its
 * example_finding.json). C1 is still PROVISIONAL until the plan owner confirms it (build plan
 * task C1); it mirrors backend/app/contracts/chat.py. Change both together.
 *
 * These are the wire shapes (snake_case, as the backend sends them). They are deliberately
 * separate from the screens' own `Finding` in lib/types.ts, which uses different status and
 * severity words and an integer layer; lib/api/findings.ts is the mapper between the two.
 */
import { z } from "zod";
import { layerFromName } from "@/lib/layerNames";
import type { PipelineLayer } from "@/lib/types";

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const FINDING_STATUSES = ["pending", "confirmed", "overridden", "added"] as const;
export const CHAT_STATUSES = ["answered", "refused", "escalated"] as const;

/**
 * The layer, by name ("STATUTORY") or by the stored integer (2), as the backend accepts either.
 * Both come out as the integer the screens use (PipelineLayer). A name that is not one of the
 * seven, or an integer outside 0-6, is refused.
 */
export const layerSchema = z.union([
  z
    .number()
    .int()
    .min(0)
    .max(6)
    .transform((n) => n as PipelineLayer),
  z.string().transform((name, ctx): PipelineLayer => {
    const layer = layerFromName(name);
    if (layer === null) {
      ctx.addIssue({ code: "custom", message: `unknown layer "${name}"` });
      return z.NEVER;
    }
    return layer;
  }),
]);

/**
 * One finding as the review agent sends it. Keys the schema does not name are dropped, not
 * refused, so the backend can add a field without breaking the screen.
 */
export const reviewFindingSchema = z
  .object({
    finding_id: z.string().uuid(),
    layer: layerSchema,
    severity: z.enum(SEVERITIES),
    clause_reference: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1),
    /** UPPER_SNAKE rule id, e.g. NDA_GOVERNING_LAW_MISSING. */
    rule_applied: z.string().regex(/^[A-Z][A-Z0-9_]*$/).max(100),
    remedy_suggested: z.string().trim().min(1),
    /** One string, as the backend writes it; it may name more than one source. */
    citation: z.string().trim().min(1),
    status: z.enum(FINDING_STATUSES).default("pending"),
    /**
     * Not in the agent's schema, so not part of the wire contract. The findings API may
     * carry the quoted span and the advocate's note; when it does they are read, and when it
     * does not the screens show none.
     */
    clause_text: z.string().nullish(),
    override_note: z.string().nullish(),
  })
  .strip();

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

export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatReply = z.infer<typeof chatReplySchema>;
