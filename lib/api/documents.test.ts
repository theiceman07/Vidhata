import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupCitation } from "../citations";
import { TIER_PRICING } from "../config/pricing";
import { MAX_REVISION_CYCLES } from "../config/revisions";
import { revisionCycle } from "../revisions";
import { addDeclaredConflict, removeDeclaredConflict } from "./advocate";
import {
  claimDocument,
  createDraftDocument,
  getDocument,
  getDocumentForReview,
  getDocumentVersions,
  isReleased,
  listDocuments,
  payFee,
  requestChange,
  respondToChanges,
  updateFinding,
} from "./documents";

// The mock layer's failure switch (?fail=1 in a browser), set by a test.
const failure = vi.hoisted(() => ({ on: false }));
vi.mock("./delay", async (importOriginal) => {
  const original = await importOriginal<typeof import("./delay")>();
  return { ...original, shouldSimulateFailure: () => failure.on };
});

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

const advocate = { id: "adv-test", name: "Test Advocate", bar: "XX/0001/2020" };
const declaration = { noConflictWithEitherParty: true } as const;

describe("claiming a document", () => {
  it("is refused without the conflict declaration, whatever the screen did", async () => {
    const claim = claimDocument(
      "doc-msa-pending",
      advocate,
      {} as unknown as typeof declaration,
    );
    const refused = expect(claim).rejects.toThrow(/no conflict of interest/);
    await vi.runAllTimersAsync();
    await refused;
    const doc = await settle(getDocument("doc-msa-pending"));
    expect(doc?.advocate).toBeNull();
    expect(doc?.conflictDeclaredAt ?? null).toBeNull();
  });

  it("is refused when a name the advocate declared a conflict with is a party", async () => {
    await settle(addDeclaredConflict("Sundargarh Logistics"));
    const claim = claimDocument("doc-msa-pending", advocate, declaration);
    const refused = expect(claim).rejects.toThrow(/declared conflict.*Sundargarh Logistics Pvt Ltd/);
    await vi.runAllTimersAsync();
    await refused;
    expect((await settle(getDocument("doc-msa-pending")))?.advocate).toBeNull();
    await settle(removeDeclaredConflict("Sundargarh Logistics"));
  });

  it("records the declaration with the claim", async () => {
    const doc = await settle(claimDocument("doc-msa-pending", advocate, declaration));
    expect(doc.status).toBe("under_review");
    expect(doc.advocate?.id).toBe(advocate.id);
    expect(doc.conflictDeclaredAt).toBe(doc.claimedAt);
    expect(doc.conflictDeclaredAt).not.toBeNull();
  });

  it("leaves a document alone that is already theirs, and refuses it to anyone else", async () => {
    const before = await settle(getDocument("doc-msa-pending"));
    const again = await settle(claimDocument("doc-msa-pending", advocate, declaration));
    expect(again.claimedAt).toBe(before?.claimedAt);

    const other = claimDocument("doc-msa-pending", { ...advocate, id: "adv-other" }, declaration);
    const refused = expect(other).rejects.toThrow(/already claimed/);
    await vi.runAllTimersAsync();
    await refused;
  });
});

describe("the revision limit", () => {
  const id = "doc-msa-pending";

  async function ask(findingId: string) {
    return settle(requestChange(id, findingId, "Please confirm.", advocate));
  }

  async function answerEverything() {
    const doc = await settle(getDocument(id));
    const responses = Object.fromEntries(
      doc!.findings
        .filter((f) => f.changeRequest && !f.changeRequest.response)
        .map((f) => [f.findingId, "Confirmed."]),
    );
    return settle(respondToChanges(id, responses));
  }

  it("lets the configured number of rounds be sent, logs the case on the last, then refuses another", async () => {
    const claimed = await settle(claimDocument(id, advocate, declaration));
    const [a, b, c] = claimed.findings.map((f) => f.findingId);
    expect(claimed.revisionCount).toBe(0);

    // Rounds 1 and 2.
    let doc = await ask(a);
    expect([doc.revisionCount, doc.status, doc.corpusReviewLoggedAt]).toEqual([1, "revision", undefined]);
    // Sending it back is a hand-off, so it is a snapshot, carrying the request.
    let drafts = await settle(getDocumentVersions(id));
    expect(drafts.map((v) => v.createdBy)).toEqual(["advocate_revision"]);
    expect(drafts[0].number).toBe(doc.version);
    expect(drafts[0].findings.find((f) => f.findingId === a)?.changeRequest).not.toBeNull();
    await answerEverything();
    // The client's answers are the next.
    drafts = await settle(getDocumentVersions(id));
    expect(drafts.map((v) => v.createdBy)).toEqual(["advocate_revision", "client_response"]);
    doc = await ask(b);
    expect(doc.revisionCount).toBe(2);
    expect(doc.corpusReviewLoggedAt).toBeUndefined();
    await answerEverything();

    // Round 3 uses the last one, and logs the case.
    doc = await ask(c);
    expect(doc.revisionCount).toBe(MAX_REVISION_CYCLES);
    expect(doc.corpusReviewLoggedAt).toBeDefined();
    const loggedAt = doc.corpusReviewLoggedAt;

    // A second request in the round already open is not a new round, and not
    // another hand-off.
    const draftsBefore = (await settle(getDocumentVersions(id))).length;
    const versionBefore = doc.version;
    doc = await ask(a);
    expect(doc.revisionCount).toBe(MAX_REVISION_CYCLES);
    expect(doc.corpusReviewLoggedAt).toBe(loggedAt);
    expect(doc.version).toBe(versionBefore);
    expect((await settle(getDocumentVersions(id))).length).toBe(draftsBefore);
    await answerEverything();

    // A fourth round is refused, with the reason, and nothing changes.
    const refused = expect(requestChange(id, b, "Once more.", advocate)).rejects.toThrow(
      /used all 3 revision rounds.*logged for corpus review/,
    );
    await vi.runAllTimersAsync();
    await refused;
    const after = await settle(getDocument(id));
    expect(after?.revisionCount).toBe(MAX_REVISION_CYCLES);
    expect(after?.status).toBe("under_review");
  });

  it("still lets the advocate settle a finding at the limit", async () => {
    const doc = await settle(getDocument(id));
    expect(revisionCycle(doc!).canRequest).toBe(false);
    const target = doc!.findings.find((f) => f.citations.every((c) => c.status !== "blocked"))!;
    const settled = await settle(
      updateFinding(id, target.findingId, { disposition: "overridden", overrideNote: "Decided." }, advocate.id),
    );
    expect(settled.findings.find((f) => f.findingId === target.findingId)?.disposition).toBe(
      "overridden",
    );
  });
});

describe("the snapshot written when the first pass finishes", () => {
  it("is written once, as the first pass", async () => {
    // Seeded as analysing, with the finish time already in the past, so
    // reading it completes the first pass.
    const doc = await settle(getDocument("doc-employment-analysing"));
    // Screening is done and the tier is known, so it now awaits the fee.
    expect(doc?.status).toBe("awaiting_payment");

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

// Last in the file on purpose: these pay for the employment fixture, which the
// first-pass tests above read while it still awaits payment.
describe("releasing a document to the advocate queue", () => {
  const id = "doc-employment-analysing";

  it("is not released while it awaits payment, whatever its tier", async () => {
    const doc = await settle(getDocument(id));
    expect(doc?.status).toBe("awaiting_payment");
    expect(doc?.tier).toBe("senior");
    expect(doc?.payment).toBeUndefined();
    expect(isReleased(doc!)).toBe(false);
  });

  it("knows which states are released", () => {
    expect(isReleased({ status: "draft" })).toBe(false);
    expect(isReleased({ status: "analysing" })).toBe(false);
    expect(isReleased({ status: "awaiting_payment" })).toBe(false);
    for (const status of ["pending_review", "under_review", "revision", "settled", "executed"] as const) {
      expect(isReleased({ status })).toBe(true);
    }
  });

  it("is in the client's own list but in no advocate-facing read", async () => {
    const advocateView = await settle(listDocuments());
    expect(advocateView.some((d) => d.id === id)).toBe(false);
    // And so in no count or metric built from the queue.
    expect(advocateView.every(isReleased)).toBe(true);

    const clientView = await settle(listDocuments("org-trivandrum-cloud-labs"));
    expect(clientView.some((d) => d.id === id)).toBe(true);
  });

  it("looks the same to an advocate following a link as a document that does not exist", async () => {
    const unpaid = await settle(getDocumentForReview(id));
    const missing = await settle(getDocumentForReview("doc-does-not-exist"));
    expect(unpaid).toBeNull();
    expect(missing).toBeNull();
  });

  it("cannot be claimed, and the refusal is the one for a document that does not exist", async () => {
    const refusal = async (docId: string) => {
      const claim = claimDocument(docId, advocate, declaration);
      const caught = claim.then(
        () => null,
        (e: Error) => e.message,
      );
      await vi.runAllTimersAsync();
      return caught;
    };
    expect(await refusal(id)).toBe("Document not found.");
    expect(await refusal("doc-does-not-exist")).toBe("Document not found.");
    expect((await settle(getDocument(id)))?.advocate).toBeNull();
  });

  it("is left awaiting payment when the payment fails, and the client can try again", async () => {
    failure.on = true;
    const attempt = payFee(id);
    const failed = expect(attempt).rejects.toThrow(/Nothing was charged/);
    await vi.runAllTimersAsync();
    await failed;
    failure.on = false;

    const after = await settle(getDocument(id));
    expect(after?.status).toBe("awaiting_payment");
    expect(after?.payment).toBeUndefined();

    const retried = await settle(payFee(id));
    expect(retried.status).toBe("pending_review");
  });

  it("is paid once, at its tier's flat fee, however many times Pay is pressed", async () => {
    // The fixture was paid by the retry above. A second and a third press come
    // back with the same single payment.
    const first = payFee(id);
    const second = payFee(id);
    await vi.runAllTimersAsync();
    const [a, b] = await Promise.all([first, second]);
    expect(a.payment).toEqual(b.payment);
    expect(a.payment?.amount).toBe(TIER_PRICING.senior.amount);
    expect(a.status).toBe("pending_review");
  });

  it("is released once paid: in the advocate's reads, and open to a link", async () => {
    const doc = await settle(getDocumentForReview(id));
    expect(doc?.status).toBe("pending_review");
    expect(isReleased(doc!)).toBe(true);
    expect((await settle(listDocuments())).some((d) => d.id === id)).toBe(true);
  });

  it("refuses to take a fee for a document that is not awaiting payment", async () => {
    const draft = await settle(
      createDraftDocument({
        title: "NDA",
        type: "nda",
        clientName: "Anaya Textiles Pvt Ltd",
        counterpartyName: "Someone Pvt Ltd",
        stateOfExecution: "Delhi",
        transactionValue: 0,
        counterpartyIsMsme: false,
        durationMonths: 12,
        governingLaw: "Laws of India",
        keyTerms: "",
      }),
    );
    expect(draft.status).toBe("draft");
    const attempt = payFee(draft.id);
    const refused = expect(attempt).rejects.toThrow(/not awaiting payment/);
    await vi.runAllTimersAsync();
    await refused;
  });
});

describe("creating documents", () => {
  const input = {
    title: "NDA",
    type: "nda" as const,
    clientName: "Anaya Textiles Pvt Ltd",
    counterpartyName: "Someone Pvt Ltd",
    stateOfExecution: "Delhi",
    transactionValue: 0,
    counterpartyIsMsme: false,
    durationMonths: 12,
    governingLaw: "Laws of India",
    keyTerms: "",
  };

  it("gives two documents made in the same instant two ids, and each is read back as itself", async () => {
    // The wait before a create is random. Fixed, both resume at the same instant,
    // which is when a clock-made id would be the same for both.
    vi.setSystemTime(new Date("2026-10-05T09:00:00.000Z"));
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const first = createDraftDocument({ ...input, title: "First" });
    const second = createDraftDocument({ ...input, title: "Second" });
    await vi.runAllTimersAsync();
    const [a, b] = [await first, await second];
    random.mockRestore();
    expect(a.id).not.toBe(b.id);
    expect((await settle(getDocument(a.id)))?.title).toBe("First");
    expect((await settle(getDocument(b.id)))?.title).toBe("Second");
  });
});
