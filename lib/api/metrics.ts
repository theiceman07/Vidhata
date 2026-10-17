import { additionRatio, overrideRatio } from "@/lib/metrics";
import type { Metrics } from "@/lib/types";
import { listDocuments } from "./documents";

/**
 * The metrics, read for an advocate.
 *
 * Counted over what an advocate may read and nothing more: `listDocuments()`
 * with no organisation is the queue's read, so a document still awaiting
 * payment is in no figure here, as it is in no other advocate-facing count. It
 * reads findings, and nothing about money or about a conversation between a
 * client and an advocate.
 *
 * The triage override rate and the corpus-currency lag have no source (no
 * screen lets an advocate change a tier, and the corpus carries no effective
 * dates), so they come back as `no_source` and not as a number. Each call to
 * its parts owns its own wait and failure.
 */
export async function getMetrics(): Promise<Metrics> {
  const docs = await listDocuments();

  return {
    documentsCounted: docs.length,
    overrides: overrideRatio(docs),
    additions: additionRatio(docs),
    triageOverride: { state: "no_source" },
    corpusLag: { state: "no_source" },
    withdrawnReplies: { state: "no_source" },
  };
}
