import { CORPUS } from "@/lib/mock/corpus.mock";
import {
  PIPELINE_LAYERS,
  type ContractDocument,
  type PipelineLayer,
} from "@/lib/types";

/**
 * What a document is checked against, and what it is not.
 *
 * The lists are the same for every document, so they are fixed text. What
 * actually ran on a particular document is read from the document itself
 * (layersRun), never assumed from these lists.
 */

// A statute is named the way the corpus names it, so this cannot drift from
// what a citation can verify against.
function corpusLabel(ref: string): string {
  const entry = CORPUS.find((e) => e.ref === ref);
  if (!entry) throw new Error(`Corpus entry ${ref} is missing.`);
  return entry.label;
}

export const COVERAGE = {
  /** Checks run at Layer 2. */
  statutory: [
    corpusLabel("ica-1872-s27"),
    corpusLabel("ica-1872-s74"),
    "MSMED payment terms",
    "Stamping",
  ],
  /** Checks that read one clause against another, at Layers 3 and 4. */
  crossClause: [
    "Uncapped indemnity against the liability cap",
    "Governing-law and seat mismatch",
    "Liability asymmetry",
  ],
  outOfScope: [
    "Litigation",
    "Criminal matters",
    "Wills and trusts",
    "Regulated-sector filings",
    "Cross-border or foreign-law contracts",
    "Tax opinions",
  ],
} as const;

const ALL_LAYERS = (Object.keys(PIPELINE_LAYERS) as string[])
  .map(Number)
  .sort((a, b) => a - b) as PipelineLayer[];

/**
 * The layers that have run on this document. Until the first pass has
 * finished none has; after it, the whole pipeline has, and it runs again on
 * every revision.
 */
export function layersRun(doc: ContractDocument): PipelineLayer[] {
  return doc.status === "draft" || doc.status === "analysing" ? [] : ALL_LAYERS;
}
