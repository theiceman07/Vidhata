import type { PipelineLayer } from "@/lib/types";

/**
 * The backend's layer names, in pipeline order. The one place a name from the wire becomes the
 * integer the screens use (PipelineLayer). Mirrors `Layer` in the backend's schemas/finding.py
 * (SRD R2-R9); lib/layerNames.test.ts keeps the order and labels in step with PIPELINE_LAYERS.
 */
export const LAYER_NAMES = [
  { name: "INTAKE", index: 0, label: "Intake and normalisation" },
  { name: "COMPLETENESS", index: 1, label: "Completeness" },
  { name: "STATUTORY", index: 2, label: "Statutory compliance" },
  { name: "CONSISTENCY", index: 3, label: "Cross-clause consistency" },
  { name: "RISK_ASYMMETRY", index: 4, label: "Risk asymmetry" },
  { name: "CITATION_GATE", index: 5, label: "Citation gate" },
  { name: "TRIAGE", index: 6, label: "Risk triage" },
] as const satisfies readonly { name: string; index: PipelineLayer; label: string }[];

export type LayerName = (typeof LAYER_NAMES)[number]["name"];

const BY_NAME = new Map<string, PipelineLayer>(LAYER_NAMES.map((l) => [l.name, l.index]));

/** The screens' layer for a backend name ("STATUTORY" -> 2), or null if the name is not one. Case-insensitive, as the backend is. */
export function layerFromName(name: string): PipelineLayer | null {
  return BY_NAME.get(name.trim().toUpperCase()) ?? null;
}

/** The backend name for a screen layer (2 -> "STATUTORY"). */
export function layerName(layer: PipelineLayer): LayerName {
  return LAYER_NAMES[layer].name;
}
