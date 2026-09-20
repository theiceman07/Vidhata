export const CURRENT_ADVOCATE = {
  id: "adv-current",
  name: "Ananya Rao",
  bar: "MH/2210/2018",
};

// Seed state for the advocate profile (QA 3.6 — "Available for new claims"
// used to be local component state with no effect on the queue). Mutated
// through lib/api/advocate.ts only, mirroring the lib/api/documents.ts
// in-memory store pattern.
export const advocateProfileSeed = {
  available: true,
  declaredConflicts: [] as string[],
};
