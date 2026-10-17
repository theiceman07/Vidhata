import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewFinding } from "@/lib/types";
import {
  addFinding,
  getDocument,
  requestChange,
  signOffDocument,
  updateFinding,
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
  citation: "Indian Contract Act, 1872, s.27",
  disposition: "pending",
  overrideNote: null,
  resolvedAt: null,
  changeRequest: null,
  ...over,
});

/** Each write an advocate can make, aimed at one document and one finding. */
const writes = (docId: string, findingId: string, who = advocate) => ({
  requestChange: () => requestChange(docId, findingId, "Please confirm.", who),
  updateFinding: () =>
    updateFinding(docId, findingId, { disposition: "pending", overrideNote: null }, who.id),
  addFinding: () => addFinding(docId, added(), who.id),
  signOffDocument: () => signOffDocument(docId, who.id),
});

describe("an advocate's writes", () => {
  it("are refused on an unpaid document exactly as on one that does not exist", async () => {
    const unpaid = await screenedDocument();
    expect(unpaid.status).toBe("awaiting_payment");
    const finding = unpaid.findings[0];

    for (const [name, write] of Object.entries(writes(unpaid.id, finding.findingId))) {
      expect(await refusal(write()), `${name} on an unpaid document`).toBe("Document not found.");
    }
    for (const [name, write] of Object.entries(writes("no-such-document", "f"))) {
      expect(await refusal(write()), `${name} on a missing one`).toBe("Document not found.");
    }
    const after = await settle(getDocument(unpaid.id));
    expect(after).toEqual(unpaid);
  });

  it("are refused until the document is claimed", async () => {
    const released = await releasedDocument();
    const finding = released.findings[0];
    for (const [name, write] of Object.entries(writes(released.id, finding.findingId))) {
      expect(await refusal(write()), name).toMatch(/Claim this document/);
    }
    expect(await settle(getDocument(released.id))).toEqual(released);
  });

  it("are refused to any advocate but the one who holds it, who is named, and change nothing", async () => {
    const claimed = await claimedDocument({}, otherAdvocate);
    const finding = claimed.findings[0];
    for (const [name, write] of Object.entries(writes(claimed.id, finding.findingId))) {
      expect(await refusal(write()), name).toBe("Other Advocate holds this document.");
    }
    expect(await settle(getDocument(claimed.id))).toEqual(claimed);
  });

  it("go through for the advocate who holds it", async () => {
    const claimed = await claimedDocument();
    const finding = claimed.findings[0];
    const doc = await settle(
      updateFinding(claimed.id, finding.findingId, { disposition: "confirmed", overrideNote: null }, advocate.id),
    );
    expect(doc.findings.find((f) => f.findingId === finding.findingId)?.disposition).toBe("confirmed");
  });
});

describe("adding a finding", () => {
  it("keeps the source as the advocate wrote it, trimmed", async () => {
    const claimed = await claimedDocument();
    const doc = await settle(
      addFinding(claimed.id, added({ citation: "  Indian Contract Act, 1872, s.27  " }), advocate.id),
    );
    const entered = doc.findings.find((f) => f.findingId === "added-finding-1")!;
    expect(entered.citation).toBe("Indian Contract Act, 1872, s.27");
  });

  it("is refused without a source, because R1 holds a finding to one citation", async () => {
    const claimed = await claimedDocument();
    for (const citation of ["", "   "]) {
      expect(await refusal(addFinding(claimed.id, added({ citation }), advocate.id))).toBe(
        "A finding needs the source it rests on.",
      );
    }
    const after = await settle(getDocument(claimed.id));
    expect(after!.findings.some((f) => f.findingId === "added-finding-1")).toBe(false);
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

describe("settling a finding", () => {
  it("needs no note to settle, and reopening clears what was decided", async () => {
    const claimed = await claimedDocument();
    const finding = claimed.findings[0];
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
