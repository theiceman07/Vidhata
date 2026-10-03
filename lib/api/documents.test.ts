import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupCitation } from "../citations";
import { getDocument, getDocumentVersions } from "./documents";

// The corpus without the MSMED s.15 entry. The fixture's finding cites it as
// verified, so if the first-pass snapshot comes out blocked, the gate really
// ran at hand-off and the old state was not simply copied over.
vi.mock("@/lib/mock/corpus.mock", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mock/corpus.mock")>();
  return {
    ...original,
    CORPUS: original.CORPUS.filter((entry) => entry.ref !== "msmed-2006-s15"),
  };
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe("the snapshot written when the first pass finishes", () => {
  it("is written once, as the first pass", async () => {
    // Seeded as analysing, with the finish time already in the past, so
    // reading it completes the first pass.
    const doc = await settle(getDocument("doc-employment-analysing"));
    expect(doc?.status).toBe("pending_review");

    const versions = await settle(getDocumentVersions("doc-employment-analysing"));
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ number: 1, createdBy: "first_pass" });
  });

  it("runs the citation gate again, so a citation the corpus no longer holds is blocked", async () => {
    const doc = await settle(getDocument("doc-employment-analysing"));
    const [snapshot] = await settle(getDocumentVersions("doc-employment-analysing"));

    const cited = (findings: NonNullable<typeof doc>["findings"]) =>
      findings
        .filter((f) => f.ruleApplied.startsWith("MSMED"))
        .flatMap((f) => f.citations);

    // The fixture says verified; the corpus no longer holds it.
    expect(cited(snapshot.findings).length).toBeGreaterThan(0);
    for (const c of cited(snapshot.findings)) {
      expect(c.status).toBe("blocked");
      expect(c.corpusRef).toBeNull();
    }
    // The working copy agrees with the snapshot at the moment of hand-off.
    expect(cited(doc!.findings)).toEqual(cited(snapshot.findings));
  });

  it("leaves every citation agreeing with a fresh lookup of its own text", async () => {
    const [snapshot] = await settle(getDocumentVersions("doc-employment-analysing"));
    const citations = snapshot.findings.flatMap((f) => f.citations);
    expect(citations.length).toBeGreaterThan(0);
    for (const c of citations) {
      expect(c.status).toBe(lookupCitation(c.text).status);
      if (c.status === "verified") expect(c.corpusRef).not.toBeNull();
      else expect(c.corpusRef).toBeNull();
    }
  });

  it("is not written a second time by reading the document again", async () => {
    await settle(getDocument("doc-employment-analysing"));
    const versions = await settle(getDocumentVersions("doc-employment-analysing"));
    expect(versions).toHaveLength(1);
  });
});
