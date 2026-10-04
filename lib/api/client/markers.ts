import type { ContractDocument, DocumentVersion, Finding } from "@/lib/types";

/**
 * Strings that must never appear in anything handed to a client, for a leak
 * test to search for. Collected from the internal record, so a fixture that
 * changes cannot leave the test looking for something that is no longer there.
 *
 * `advocate` is the advocate's own identity: it is the sign-off record's to
 * show after sign-off, and nothing else's, so a test that expects it there
 * leaves it out of what it passes.
 */
export interface Markers {
  /** The pipeline's machinery and the advocate's working. Never, at any time. */
  machinery: string[];
  /** Who the advocate is. Never before sign-off, and after it only in the sign-off record. */
  advocate: string[];
}

const present = (values: (string | null | undefined)[]): string[] =>
  [...new Set(values.filter((v): v is string => typeof v === "string" && v.trim().length >= 4))];

function findingMarkers(findings: Finding[]): { machinery: string[]; names: string[] } {
  return {
    machinery: present(
      findings.flatMap((f) => [
        f.findingId,
        f.ruleApplied,
        f.overrideNote,
        ...f.citations.flatMap((c) => [c.withdrawn?.note]),
      ]),
    ),
    names: present(
      findings.flatMap((f) => [f.changeRequest?.requestedBy, ...f.citations.map((c) => c.withdrawn?.by)]),
    ),
  };
}

export function markersFor(doc: ContractDocument, versions: DocumentVersion[] = []): Markers {
  const all = [...doc.findings, ...versions.flatMap((v) => v.findings)];
  const { machinery, names } = findingMarkers(all);
  return {
    machinery: present([...machinery, doc.orgId, doc.advocate?.id]),
    advocate: present([...names, doc.advocate?.name, doc.advocate?.bar]),
  };
}

/** Which of these strings are in the output. Empty is what a leak test expects. */
export function leaked(output: unknown, markers: string[]): string[] {
  const text = JSON.stringify(output);
  return markers.filter((m) => text.includes(m));
}
