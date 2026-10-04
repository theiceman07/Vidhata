import { describe, expect, it } from "vitest";
import { clientVisibleFindings } from "./findings";
import { mockDocuments } from "./mock/documents.mock";
import { mockVersions } from "./mock/versions.mock";
import type { ContractDocument, Finding } from "./types";

/**
 * A finding's number, held to a rule over every fixture and every snapshot.
 *
 * A client names a finding by its number and by nothing else, so a number must
 * mean one finding, for good. Each finding carries two, both stored and never
 * worked out from where it sits in a list:
 *
 * - `number` is the document's own, given when the finding is raised.
 * - `clientNumber` is the one a client reads it by, given when the client first
 *   may know of it. It is dense over what they have been shown, so a gap never
 *   says that something was kept from them.
 *
 * If a number came from list position, a reordered or filtered list would move
 * it silently, and two findings could share one (C4 did exactly that).
 */

const NUMBER = /^\d{2,}$/;

interface Draft {
  label: string;
  /** The status the draft is read under: a signed-off document's drafts are the client's to read in full. */
  doc: ContractDocument;
  findings: Finding[];
}

/** Every draft of a document the fixtures hold: each snapshot, and the head. */
function draftsOf(head: ContractDocument): Draft[] {
  const snapshots = mockVersions
    .filter((v) => v.documentId === head.id)
    .sort((a, b) => a.number - b.number)
    .map((v) => ({ label: `${head.id} draft ${v.number}`, doc: head, findings: v.findings }));
  return [...snapshots, { label: `${head.id} head`, doc: head, findings: head.findings }];
}

const withFindings = mockDocuments.filter((d) => d.findings.length > 0);

/** Every finding the fixtures hold, with where it was found. */
const everyFinding = withFindings.flatMap((head) =>
  draftsOf(head).flatMap((d) => d.findings.map((f) => ({ ...d, finding: f }))),
);

describe("a finding's number", () => {
  it("is on every finding in every fixture and snapshot, as a padded number", () => {
    expect(everyFinding.length).toBeGreaterThan(10);
    for (const { label, finding } of everyFinding) {
      expect(finding.number, `${label} ${finding.findingId}`).toMatch(NUMBER);
    }
  });

  it("is unique within a draft", () => {
    for (const head of withFindings) {
      for (const draft of draftsOf(head)) {
        const numbers = draft.findings.map((f) => f.number);
        expect(new Set(numbers).size, draft.label).toBe(numbers.length);
      }
    }
  });

  it("means one finding across all of a document's drafts, and a finding keeps one number", () => {
    for (const head of withFindings) {
      const numberOf = new Map<string, string>();
      const findingOf = new Map<string, string>();
      for (const draft of draftsOf(head)) {
        for (const f of draft.findings) {
          expect(numberOf.get(f.findingId) ?? f.number, `${draft.label} ${f.findingId}`).toBe(f.number);
          expect(findingOf.get(f.number) ?? f.findingId, `${draft.label} number ${f.number}`).toBe(
            f.findingId,
          );
          numberOf.set(f.findingId, f.number);
          findingOf.set(f.number, f.findingId);
        }
      }
    }
  });

  it("leaves no gap in what a document has ever numbered", () => {
    for (const head of withFindings) {
      const all = new Set(draftsOf(head).flatMap((d) => d.findings.map((f) => f.number)));
      const expected = Array.from({ length: all.size }, (_, i) => String(i + 1).padStart(2, "0"));
      expect([...all].sort(), head.id).toEqual(expected);
    }
  });
});

describe("the number a client reads a finding by", () => {
  it("is set for exactly the findings the client may know about, and null for the rest", () => {
    for (const head of withFindings) {
      for (const draft of draftsOf(head)) {
        const visible = new Set(
          clientVisibleFindings({ ...draft.doc, findings: draft.findings }).map((f) => f.findingId),
        );
        for (const f of draft.findings) {
          expect(f.clientNumber !== null, `${draft.label} ${f.findingId}`).toBe(visible.has(f.findingId));
          if (f.clientNumber !== null) expect(f.clientNumber).toMatch(NUMBER);
        }
      }
    }
  });

  it("is unique within a draft, and means one finding across drafts", () => {
    for (const head of withFindings) {
      const numberOf = new Map<string, string>();
      const findingOf = new Map<string, string>();
      for (const draft of draftsOf(head)) {
        const shown = draft.findings.filter((f) => f.clientNumber !== null);
        expect(new Set(shown.map((f) => f.clientNumber)).size, draft.label).toBe(shown.length);
        for (const f of shown) {
          const n = f.clientNumber as string;
          expect(numberOf.get(f.findingId) ?? n, `${draft.label} ${f.findingId}`).toBe(n);
          expect(findingOf.get(n) ?? f.findingId, `${draft.label} number ${n}`).toBe(f.findingId);
          numberOf.set(f.findingId, n);
          findingOf.set(n, f.findingId);
        }
      }
    }
  });

  it("never changes once a finding has it: a later draft of a shown finding is shown, under the same number", () => {
    for (const head of withFindings) {
      const first = new Map<string, string>();
      for (const draft of draftsOf(head)) {
        for (const f of draft.findings) {
          if (first.has(f.findingId)) {
            expect(f.clientNumber, `${draft.label} ${f.findingId}`).toBe(first.get(f.findingId));
          } else if (f.clientNumber !== null) {
            first.set(f.findingId, f.clientNumber);
          }
        }
      }
    }
  });

  it("leaves no gap in what a client has ever been shown, so a number never says something was kept back", () => {
    for (const head of withFindings) {
      const shown = new Set(
        draftsOf(head).flatMap((d) =>
          d.findings.flatMap((f) => (f.clientNumber === null ? [] : [f.clientNumber])),
        ),
      );
      const expected = Array.from({ length: shown.size }, (_, i) => String(i + 1).padStart(2, "0"));
      expect([...shown].sort(), head.id).toEqual(expected);
    }
  });
});

describe("the numbers the fixtures carry", () => {
  const table = (id: string) =>
    Object.fromEntries(
      mockDocuments
        .find((d) => d.id === id)!
        .findings.map((f) => [f.findingId, [f.number, f.clientNumber]]),
    );

  it("number findings in the order they were raised, a retired one keeping its place", () => {
    // find-7 was raised first and is gone from the head, so the head starts at 02.
    expect(table("doc-vendor-revision")).toEqual({
      "find-4": ["02", "02"],
      "find-8": ["03", "03"],
      "find-9": ["04", null],
      "find-10": ["05", null],
    });
    // find-e2 is gone from the head, and find-e4 was raised on the re-run after find-e5.
    expect(table("doc-employment-rereview")).toEqual({
      "find-e1": ["01", "01"],
      "find-e3": ["03", "03"],
      "find-e4": ["05", "05"],
      "find-e5": ["04", "04"],
    });
    expect(table("doc-msa-pending")).toEqual({
      "find-1": ["01", "01"],
      "find-2": ["02", "02"],
      "find-3": ["03", "03"],
    });
  });

  it("show a signed-off document's advocate-added finding to the client, in order", () => {
    expect(table("doc-nda-settled")).toEqual({
      "find-n1": ["01", "01"],
      "find-n2": ["02", "02"],
    });
  });
});
