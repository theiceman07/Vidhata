import { CURRENT_ADVOCATE } from "@/lib/mock/advocate.mock";
import {
  BLOCKED_REASON_WORDS,
  additionRatio,
  blockedAttempts,
  fabricationRatio,
  overrideRatio,
} from "@/lib/metrics";
import type { Metrics } from "@/lib/types";
import { listCitationAttempts } from "./citations";
import { listDocuments } from "./documents";

/**
 * The metrics, read for an advocate.
 *
 * Counted over what an advocate may read and nothing more: `listDocuments()`
 * with no organisation is the queue's read, so a document still awaiting
 * payment is in no figure here, as it is in no other advocate-facing count. It
 * reads findings and the citation attempt log, and nothing about money or about
 * a conversation between a client and an advocate.
 *
 * The triage override rate and the corpus-currency lag have no source (no
 * screen lets an advocate change a tier, and the corpus carries no effective
 * dates), so they come back as `no_source` and not as a number. Each call to
 * its parts owns its own wait and failure.
 */
export async function getMetrics(): Promise<Metrics> {
  const [docs, attempts] = await Promise.all([listDocuments(), listCitationAttempts()]);

  const titles = new Map(docs.map((d) => [d.id, d.title]));
  const advocates = new Map<string, string>([[CURRENT_ADVOCATE.id, CURRENT_ADVOCATE.name]]);
  for (const d of docs) if (d.advocate) advocates.set(d.advocate.id, d.advocate.name);

  return {
    documentsCounted: docs.length,
    overrides: overrideRatio(docs),
    additions: additionRatio(docs),
    fabrication: fabricationRatio(attempts),
    blocked: blockedAttempts(attempts).map((a) => ({
      id: a.id,
      at: a.at,
      documentTitle: titles.get(a.documentId) ?? null,
      advocate: advocates.get(a.advocateId) ?? a.advocateId,
      typed: a.input,
      reason: a.reason ? BLOCKED_REASON_WORDS[a.reason] : "Not matched",
    })),
    triageOverride: { state: "no_source" },
    corpusLag: { state: "no_source" },
    withdrawnReplies: { state: "no_source" },
  };
}
