import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewFinding } from "@/lib/types";
import {
  addFinding,
  getDocument,
  requestChange,
  signOffDocument,
  updateFinding,
  withdrawCitation,
} from "./documents";
import {
  advocate,
  claimedDocument,
  otherAdvocate,
  refusal,
  releasedDocument,
  screenedDocument,
  settle,
  settleEverything,
} from "./testing";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const added = (over: Partial<NewFinding> = {}): NewFinding => ({
  findingId: "added-finding-1",
  source: "advocate",
  layer: 0,
  severity: "medium",
  clauseReference: "Clause 4.1",
  clauseText: "Payment shall be made within sixty (60) days of receipt of a valid invoice.",
  description: "The first pass missed this.",
  ruleApplied: "MANUAL-ADVOCATE-ADDED",
  remedySuggested: "Advocate judgment.",
  citations: [],
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
  ...over,
});

/** Each write an advocate can make, aimed at one document and one finding. */
const writes = (docId: string, findingId: string, citationId: string, who = advocate) => ({
  requestChange: () => requestChange(docId, findingId, "Please confirm.", who),
  updateFinding: () =>
    updateFinding(docId, findingId, { disposition: "pending", overrideNote: null }, who.id),
  addFinding: () => addFinding(docId, added(), who.id),
  withdrawCitation: () => withdrawCitation(docId, findingId, citationId, "Because.", who),
  signOffDocument: () => signOffDocument(docId, who.id),
});

describe("an advocate's writes", () => {
  it("are refused on an unpaid document exactly as on one that does not exist", async () => {
    const unpaid = await screenedDocument();
    expect(unpaid.status).toBe("awaiting_payment");
    const finding = unpaid.findings[0];

    for (const [name, write] of Object.entries(writes(unpaid.id, finding.findingId, "c"))) {
      expect(await refusal(write()), `${name} on an unpaid document`).toBe("Document not found.");
    }
    for (const [name, write] of Object.entries(writes("no-such-document", "f", "c"))) {
      expect(await refusal(write()), `${name} on a missing one`).toBe("Document not found.");
    }
    const after = await settle(getDocument(unpaid.id));
    expect(after).toEqual(unpaid);
  });

  it("are refused until the document is claimed", async () => {
    const released = await releasedDocument();
    const finding = released.findings[0];
    for (const [name, write] of Object.entries(writes(released.id, finding.findingId, "c"))) {
      expect(await refusal(write()), name).toMatch(/Claim this document/);
    }
    expect(await settle(getDocument(released.id))).toEqual(released);
  });

  it("are refused to any advocate but the one who holds it, who is named, and change nothing", async () => {
    const claimed = await claimedDocument({}, otherAdvocate);
    const finding = claimed.findings[0];
    for (const [name, write] of Object.entries(writes(claimed.id, finding.findingId, "c"))) {
      expect(await refusal(write()), name).toBe("Other Advocate holds this document.");
    }
    expect(await settle(getDocument(claimed.id))).toEqual(claimed);
  });

  it("go through for the advocate who holds it", async () => {
    const claimed = await claimedDocument();
    const finding = claimed.findings.find((f) => f.citations.some((c) => c.status === "verified"))!;
    const doc = await settle(
      updateFinding(claimed.id, finding.findingId, { disposition: "confirmed", overrideNote: null }, advocate.id),
    );
    expect(doc.findings.find((f) => f.findingId === finding.findingId)?.disposition).toBe("confirmed");
  });
});

describe("adding a finding", () => {
  it("takes no word of the caller's about whether a citation is verified", async () => {
    const claimed = await claimedDocument();
    const doc = await settle(
      addFinding(
        claimed.id,
        added({
          citations: [
            // Claims to be verified, and is in no corpus.
            { id: "c-fake", text: "A case that does not exist", status: "verified", corpusRef: null, withdrawn: null },
            // Claims to be blocked, and is an exact corpus label.
            { id: "c-real", text: "indian contract act, 1872,  s.27", status: "blocked", corpusRef: null, withdrawn: null },
            // A near-miss: a missing comma.
            { id: "c-near", text: "Indian Contract Act, 1872 s.27", status: "verified", corpusRef: null, withdrawn: null },
          ],
        }),
        advocate.id,
      ),
    );
    const entered = doc.findings.find((f) => f.findingId === "added-finding-1")!;
    const byId = Object.fromEntries(entered.citations.map((c) => [c.id, c]));
    expect(byId["c-fake"]).toMatchObject({ status: "blocked", corpusRef: null });
    expect(byId["c-near"]).toMatchObject({ status: "blocked", corpusRef: null });
    // Verified by matching, under the corpus's own wording.
    expect(byId["c-real"]).toMatchObject({
      status: "verified",
      text: "Indian Contract Act, 1872, s.27",
      corpusRef: "ica-1872-s27",
    });
  });

  it("enters the record open, marked as added by an advocate, whatever it arrived as", async () => {
    const claimed = await claimedDocument();
    const doc = await settle(
      addFinding(
        claimed.id,
        added({
          source: "pipeline",
          disposition: "confirmed",
          overrideNote: "Already decided.",
          resolvedAt: "2026-01-01T00:00:00.000Z",
          citations: [
            {
              id: "c-w",
              text: "A case that does not exist",
              status: "blocked",
              corpusRef: null,
              withdrawn: { note: "Pre-withdrawn.", at: "2026-01-01T00:00:00.000Z", by: "Someone" },
            },
          ],
        }),
        advocate.id,
      ),
    );
    const entered = doc.findings.find((f) => f.findingId === "added-finding-1")!;
    expect(entered).toMatchObject({
      source: "advocate",
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
      changeRequest: null,
    });
    // A withdrawal is a decision on a finding already on the record, not something to arrive with.
    expect(entered.citations[0].withdrawn).toBeNull();
    expect(entered.citations[0].status).toBe("blocked");
  });

  it("is attached to the clause it names, and cannot be added twice", async () => {
    const claimed = await claimedDocument();
    const doc = await settle(addFinding(claimed.id, added(), advocate.id));
    expect(doc.clauses.find((c) => c.number === "4.1")?.findingIds).toContain("added-finding-1");
    expect(await refusal(addFinding(claimed.id, added(), advocate.id))).toBe(
      "This finding is already on the record.",
    );
    const after = await settle(getDocument(claimed.id));
    expect(after!.findings.filter((f) => f.findingId === "added-finding-1")).toHaveLength(1);
  });
});

describe("withdrawing a source", () => {
  async function withBlockedSource() {
    const claimed = await claimedDocument();
    const finding = claimed.findings.find((f) => f.citations.some((c) => c.status === "blocked"))!;
    const citation = finding.citations.find((c) => c.status === "blocked")!;
    return { id: claimed.id, finding, citation };
  }

  it("needs the reasoning, and a blank one is not reasoning", async () => {
    const { id, finding, citation } = await withBlockedSource();
    for (const note of ["", "   \n  "]) {
      expect(await refusal(withdrawCitation(id, finding.findingId, citation.id, note, advocate))).toBe(
        "Record why the finding stands without this source.",
      );
    }
    const after = await settle(getDocument(id));
    const kept = after!.findings.find((f) => f.findingId === finding.findingId)!;
    expect(kept.citations.find((c) => c.id === citation.id)!.withdrawn).toBeNull();
  });

  it("is only for a blocked source, and only for one that is there", async () => {
    const claimed = await claimedDocument();
    const verified = claimed.findings.find((f) => f.citations.some((c) => c.status === "verified"))!;
    expect(
      await refusal(
        withdrawCitation(
          claimed.id,
          verified.findingId,
          verified.citations.find((c) => c.status === "verified")!.id,
          "Because.",
          advocate,
        ),
      ),
    ).toBe("Only a blocked source can be withdrawn.");
    expect(
      await refusal(withdrawCitation(claimed.id, verified.findingId, "no-such-citation", "Because.", advocate)),
    ).toBe("Citation not found.");
  });

  it("records who, when and why, and leaves the source blocked", async () => {
    const { id, finding, citation } = await withBlockedSource();
    const doc = await settle(
      withdrawCitation(id, finding.findingId, citation.id, "  Not in the approved corpus.  ", advocate),
    );
    const after = doc.findings
      .find((f) => f.findingId === finding.findingId)!
      .citations.find((c) => c.id === citation.id)!;
    expect(after.status).toBe("blocked");
    expect(after.withdrawn).toMatchObject({ note: "Not in the approved corpus.", by: "Test Advocate" });
    expect(Number.isNaN(new Date(after.withdrawn!.at).getTime())).toBe(false);
  });
});

describe("settling a finding", () => {
  it("is refused while its source is blocked, and the finding stays open", async () => {
    const claimed = await claimedDocument();
    const finding = claimed.findings.find((f) => f.citations.some((c) => c.status === "blocked"))!;
    expect(
      await refusal(
        updateFinding(claimed.id, finding.findingId, { disposition: "overridden", overrideNote: "A reason." }, advocate.id),
      ),
    ).toMatch(/source is blocked/);
    const after = await settle(getDocument(claimed.id));
    expect(after!.findings.find((f) => f.findingId === finding.findingId)!.disposition).toBe("pending");
  });

  it("needs the reasoning when no verified source remains, and a blank one is not reasoning", async () => {
    const claimed = await claimedDocument();
    const finding = claimed.findings.find((f) => f.citations.some((c) => c.status === "blocked"))!;
    const citation = finding.citations.find((c) => c.status === "blocked")!;
    await settle(withdrawCitation(claimed.id, finding.findingId, citation.id, "Not in the corpus.", advocate));

    for (const note of [null, "", "   "]) {
      expect(
        await refusal(
          updateFinding(claimed.id, finding.findingId, { disposition: "confirmed", overrideNote: note }, advocate.id),
        ),
      ).toBe("No verified source remains, so settling needs your reasoning on the record.");
    }
    const settled = await settle(
      updateFinding(
        claimed.id,
        finding.findingId,
        { disposition: "overridden", overrideNote: "  The finding stands on my judgment.  " },
        advocate.id,
      ),
    );
    const after = settled.findings.find((f) => f.findingId === finding.findingId)!;
    expect(after).toMatchObject({ disposition: "overridden", overrideNote: "The finding stands on my judgment." });
    expect(after.resolvedAt).not.toBeNull();
  });

  it("needs no note when a verified source stands behind it, and reopening clears what was decided", async () => {
    const claimed = await claimedDocument();
    const finding = claimed.findings.find((f) => f.citations.some((c) => c.status === "verified"))!;
    const settled = await settle(
      updateFinding(claimed.id, finding.findingId, { disposition: "confirmed", overrideNote: null }, advocate.id),
    );
    expect(settled.findings.find((f) => f.findingId === finding.findingId)!.disposition).toBe("confirmed");

    const reopened = await settle(
      updateFinding(claimed.id, finding.findingId, { disposition: "pending", overrideNote: "ignored" }, advocate.id),
    );
    expect(reopened.findings.find((f) => f.findingId === finding.findingId)).toMatchObject({
      disposition: "pending",
      overrideNote: null,
      resolvedAt: null,
    });
  });

  it("is refused for a finding that is not there", async () => {
    const claimed = await claimedDocument();
    expect(
      await refusal(
        updateFinding(claimed.id, "no-such-finding", { disposition: "confirmed", overrideNote: null }, advocate.id),
      ),
    ).toBe("Finding not found.");
  });
});

describe("signing off", () => {
  it("is refused while any finding is still open, and nothing is recorded", async () => {
    const claimed = await claimedDocument();
    expect(claimed.findings.some((f) => f.disposition === "pending")).toBe(true);
    expect(await refusal(signOffDocument(claimed.id, advocate.id))).toBe(
      "Every finding must be settled before sign-off.",
    );
    const after = await settle(getDocument(claimed.id));
    expect(after!.status).toBe("under_review");
    expect(after!.settledAt ?? null).toBeNull();
    expect(after!.executionSteps).toEqual([]);
  });

  it("is refused while a finding's source is blocked, because that finding cannot have been settled", async () => {
    const claimed = await claimedDocument();
    // Settle everything except the finding whose source is blocked.
    const blocked = claimed.findings.find((f) => f.citations.some((c) => c.status === "blocked"))!;
    for (const f of claimed.findings.filter((x) => x.findingId !== blocked.findingId)) {
      await settle(
        updateFinding(claimed.id, f.findingId, { disposition: "overridden", overrideNote: "Decided." }, advocate.id),
      );
    }
    expect(await refusal(signOffDocument(claimed.id, advocate.id))).toBe(
      "Every finding must be settled before sign-off.",
    );
  });

  it("is refused to anyone but the advocate who holds the document", async () => {
    const claimed = await claimedDocument();
    await settleEverything(claimed.id);
    expect(await refusal(signOffDocument(claimed.id, otherAdvocate.id))).toBe(
      "Test Advocate holds this document.",
    );
    expect((await settle(getDocument(claimed.id)))!.status).toBe("under_review");
  });

  it("records the sign-off once the holder has settled everything, and a second press changes nothing", async () => {
    const claimed = await claimedDocument();
    await settleEverything(claimed.id);
    const signed = await settle(signOffDocument(claimed.id, advocate.id));
    expect(signed.status).toBe("settled");
    expect(signed.advocate?.id).toBe(advocate.id);
    expect(typeof signed.settledAt).toBe("string");
    expect(signed.executionSteps.map((s) => s.kind)).toEqual(["stamping", "registration", "esignature"]);

    const again = await settle(signOffDocument(claimed.id, advocate.id));
    expect(again.settledAt).toBe(signed.settledAt);
    expect(again.executionSteps).toEqual(signed.executionSteps);
  });
});
