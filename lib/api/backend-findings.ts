import { z } from "zod";
import { ApiError, authed, type Fetcher } from "@/lib/api/backend";
import { SEVERITIES } from "@/lib/contracts";
import { layerFromName } from "@/lib/layerNames";
import type { Finding, PipelineLayer, Severity } from "@/lib/types";

/**
 * Findings on the real backend (backend/app/findings/router.py), as the screens' `Finding`.
 *
 * Two views, two shapes, and the backend decides which a caller may have:
 *  - the advocate's merged list (GET /documents/{id}/findings): agent findings and ones the advocate
 *    added, each tagged by `origin`. Only the assigned advocate may read it.
 *  - the client's list (GET /documents/{id}/client-findings): only what the advocate confirmed or
 *    added, and only after sign-off. It has no layer, no rule id and no advocate notes.
 *
 * The advocate's own findings have no layer and no citation on the backend, by design. They are
 * never given a made-up one here: the stand-ins below are values no screen shows for them.
 *
 * One finding that cannot be read fails the whole read (bad_reply), never a silent skip: an
 * advocate who cannot see every finding cannot settle them, and a client shown a partial list
 * would be shown something untrue.
 */

/** The layer integer a finding carries when the backend sent none. No screen names a layer for it. */
const NO_LAYER: PipelineLayer = 6;
/** What a finding with no clause reference is attached to. The workspace lists it as unattached. */
const WHOLE_DOCUMENT = "Whole document";

const pad = (n: number): string => String(n).padStart(2, "0");

const base = {
  finding_id: z.string().uuid(),
  severity: z.enum(SEVERITIES),
  clause_reference: z.string().nullish(),
  description: z.string().trim().min(1),
  remedy_suggested: z.string().nullish(),
};

const agentSchema = z
  .object({
    ...base,
    origin: z.literal("agent"),
    layer: z.string().nullish(), // the layer's name, e.g. "STATUTORY"
    rule_applied: z.string().nullish(),
    citation: z.string().nullish(),
    citation_type: z.string().nullish(),
    status: z.enum(["pending", "confirmed", "overridden", "added"]),
    advocate_notes: z.string().nullish(),
    adjudicated_at: z.string().nullish(),
  })
  .strip();

const advocateSchema = z
  .object({
    ...base,
    origin: z.literal("advocate"),
    rule_applied: z.string().nullish(),
    advocate_notes: z.string().nullish(),
    adjudicated_at: z.string().nullish(),
  })
  .strip();

export const lawyerFindingSchema = z.discriminatedUnion("origin", [agentSchema, advocateSchema]);
export type LawyerFinding = z.infer<typeof lawyerFindingSchema>;

export const clientFindingSchema = z
  .object({
    ...base,
    origin: z.enum(["agent", "advocate"]),
    citation: z.string().nullish(),
    citation_type: z.string().nullish(),
    status: z.enum(["confirmed", "added"]),
  })
  .strip();
export type ClientFindingWire = z.infer<typeof clientFindingSchema>;

function readItem<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new ApiError("bad_reply", { detail: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  }
  return r.data;
}

const clauseOf = (reference: string | null | undefined): string => reference?.trim() || WHOLE_DOCUMENT;

/** One advocate-view finding as the screens' `Finding`. `number` is its place in the list. */
export function lawyerFindingToScreen(raw: LawyerFinding, number: string): Finding {
  if (raw.origin === "advocate") {
    return {
      findingId: raw.finding_id,
      number,
      clientNumber: null,
      source: "advocate",
      layer: NO_LAYER,
      severity: raw.severity as Severity,
      clauseReference: clauseOf(raw.clause_reference),
      clauseText: "",
      description: raw.description,
      ruleApplied: raw.rule_applied?.trim() ?? "",
      remedySuggested: raw.remedy_suggested?.trim() ?? "",
      citation: "", // an advocate's own finding carries no citation on the backend
      disposition: "confirmed", // already the advocate's decision
      overrideNote: null,
      resolvedAt: raw.adjudicated_at ?? null,
      changeRequest: null,
    };
  }
  const layer = raw.layer ? layerFromName(raw.layer) : null;
  const citation = raw.citation?.trim();
  if (layer === null) throw new ApiError("bad_reply", { detail: `finding ${raw.finding_id}: unknown layer` });
  if (!citation) throw new ApiError("bad_reply", { detail: `finding ${raw.finding_id}: an agent finding has no citation` });
  const disposition = raw.status === "added" ? "confirmed" : raw.status;
  return {
    findingId: raw.finding_id,
    number,
    clientNumber: null,
    source: "pipeline",
    layer,
    severity: raw.severity as Severity,
    clauseReference: clauseOf(raw.clause_reference),
    clauseText: "",
    description: raw.description,
    ruleApplied: raw.rule_applied?.trim() ?? "",
    remedySuggested: raw.remedy_suggested?.trim() ?? "",
    citation,
    disposition,
    overrideNote: disposition === "overridden" ? raw.advocate_notes?.trim() || null : null,
    resolvedAt: raw.adjudicated_at ?? null,
    changeRequest: null,
  };
}

/**
 * One client-view finding as the screens' `Finding`. The client shaping (shape-findings.ts) names
 * the fields a client may read one by one, so the stand-ins here (no layer, no rule, no note) never
 * reach a client screen. It is always settled, and its client number is given by the shaping, in order.
 */
export function clientFindingToScreen(raw: ClientFindingWire, number: string): Finding {
  const advocate = raw.origin === "advocate";
  return {
    findingId: raw.finding_id,
    number,
    clientNumber: null,
    source: advocate ? "advocate" : "pipeline",
    layer: NO_LAYER,
    severity: raw.severity as Severity,
    clauseReference: clauseOf(raw.clause_reference),
    clauseText: "",
    description: raw.description,
    ruleApplied: "",
    remedySuggested: raw.remedy_suggested?.trim() ?? "",
    citation: raw.citation?.trim() ?? "",
    disposition: "confirmed",
    overrideNote: null,
    resolvedAt: null,
    changeRequest: null,
  };
}

/** The advocate's merged list for the latest version. Assigned advocate only. */
export async function listBackendFindings(documentId: string, fetchImpl?: Fetcher): Promise<Finding[]> {
  const rows = await authed(`/documents/${encodeURIComponent(documentId)}/findings`, { method: "GET" }, z.array(z.unknown()), fetchImpl);
  return rows.map((row, i) => lawyerFindingToScreen(readItem(lawyerFindingSchema, row), pad(i + 1)));
}

/** What the client may read, after sign-off. The backend answers 409 before it. */
export async function listBackendClientFindings(documentId: string, fetchImpl?: Fetcher): Promise<Finding[]> {
  const rows = await authed(
    `/documents/${encodeURIComponent(documentId)}/client-findings`,
    { method: "GET" },
    z.array(z.unknown()),
    fetchImpl,
  );
  return rows.map((row, i) => clientFindingToScreen(readItem(clientFindingSchema, row), pad(i + 1)));
}

export type Decision = { action: "confirm" } | { action: "override"; notes: string };

/** Confirm or override one agent finding. An override needs its reason (the backend refuses without). */
export async function adjudicateBackendFinding(findingId: string, decision: Decision, fetchImpl?: Fetcher): Promise<void> {
  const body = decision.action === "override" ? { action: "override", notes: decision.notes } : { action: "confirm" };
  await authed(`/findings/${encodeURIComponent(findingId)}/adjudicate`, { method: "POST", body }, z.unknown(), fetchImpl);
}

export interface NewBackendFinding {
  severity: Severity;
  description: string;
  clauseReference: string;
  remedySuggested?: string;
}

/** A finding the advocate adds. It carries no layer and no citation, and is already their decision. */
export async function addBackendFinding(documentId: string, input: NewBackendFinding, fetchImpl?: Fetcher): Promise<void> {
  const body: Record<string, unknown> = {
    severity: input.severity,
    description: input.description.trim(),
    clause_reference: input.clauseReference.trim() || null,
  };
  if (input.remedySuggested?.trim()) body.remedy_suggested = input.remedySuggested.trim();
  await authed(`/documents/${encodeURIComponent(documentId)}/findings`, { method: "POST", body }, z.unknown(), fetchImpl);
}

/** Sign-off is the move to lawyer_approved. The backend refuses it while a high or critical finding is open. */
export async function signOffBackendDocument(documentId: string, fetchImpl?: Fetcher): Promise<void> {
  await authed(
    `/documents/${encodeURIComponent(documentId)}/transition`,
    { method: "POST", body: { to_state: "lawyer_approved" } },
    z.unknown(),
    fetchImpl,
  );
}
