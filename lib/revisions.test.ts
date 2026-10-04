import { describe, expect, it } from "vitest";
import { MAX_REVISION_CYCLES } from "./config/revisions";
import { signOffBlockers } from "./findings";
import { mockDocuments } from "./mock/documents.mock";
import {
  revisionBlockedReason,
  revisionCounter,
  revisionCycle,
  revisionNotice,
} from "./revisions";
import type { ContractDocument } from "./types";

const vendor = mockDocuments.find((d) => d.id === "doc-vendor-revision")!;
const rereview = mockDocuments.find((d) => d.id === "doc-employment-rereview")!;

describe("the limit", () => {
  it("is set in config, as a whole number of rounds above zero", () => {
    expect(Number.isInteger(MAX_REVISION_CYCLES)).toBe(true);
    expect(MAX_REVISION_CYCLES).toBeGreaterThan(0);
    expect(revisionCycle({ status: "under_review", revisionCount: 0 }).max).toBe(
      MAX_REVISION_CYCLES,
    );
  });

  it("can be given another value, so nothing but the config decides it", () => {
    const cycle = revisionCycle({ status: "under_review", revisionCount: 1 }, 1);
    expect(cycle).toMatchObject({ max: 1, reached: true, canRequest: false });
    // And reads properly at one round.
    expect(revisionBlockedReason(cycle)).toMatch(/used its one revision round/);
  });
});

describe("where a document stands against it", () => {
  it("has rounds left before the limit, and says nothing", () => {
    const cycle = revisionCycle(rereview);
    expect(cycle).toEqual({
      count: 1,
      max: MAX_REVISION_CYCLES,
      roundOpen: false,
      reached: false,
      canRequest: true,
    });
    expect(revisionCounter(cycle)).toBe(`Revision 1 of ${MAX_REVISION_CYCLES}`);
    expect(revisionNotice(cycle)).toBeNull();
    expect(revisionBlockedReason(cycle)).toBeNull();
  });

  it("shows no counter before the first send-back", () => {
    expect(revisionCounter(revisionCycle({ status: "pending_review", revisionCount: 0 }))).toBeNull();
  });

  it("can still ask for more in a round already open, because that starts no new round", () => {
    const cycle = revisionCycle({ status: "revision", revisionCount: MAX_REVISION_CYCLES });
    expect(cycle).toMatchObject({ roundOpen: true, reached: true, canRequest: true });
    expect(revisionCounter(cycle)).toBe(
      `Revision ${MAX_REVISION_CYCLES} of ${MAX_REVISION_CYCLES} (this round is open)`,
    );
    expect(revisionNotice(cycle)).toMatch(/last round.*with the client.*logged for corpus review/);
    expect(revisionBlockedReason(cycle)).toBeNull();
  });

  it("refuses a round past the limit, says the case is logged, and keeps sign-off open", () => {
    const cycle = revisionCycle({ status: "under_review", revisionCount: MAX_REVISION_CYCLES });
    expect(cycle).toMatchObject({ roundOpen: false, reached: true, canRequest: false });
    expect(revisionNotice(cycle)).toMatch(/logged for corpus review/);
    expect(revisionNotice(cycle)).toMatch(/no further revision can be requested/);
    expect(revisionNotice(cycle)).toMatch(/still settle each finding and sign off/);
    expect(revisionBlockedReason(cycle)).toMatch(/used all \d+ revision rounds/);
  });

  it("takes no request once signed off, and does not say the limit was hit", () => {
    const cycle = revisionCycle({ status: "settled", revisionCount: 1 });
    expect(cycle.canRequest).toBe(false);
    expect(revisionNotice(cycle)).toBeNull();
    expect(revisionBlockedReason(cycle)).toMatch(/signed-off/);
  });

  it("reads the vendor agreement mid-round, with a round open and one to spare", () => {
    expect(revisionCycle(vendor)).toMatchObject({
      count: 2,
      roundOpen: true,
      reached: false,
      canRequest: true,
    });
  });
});

describe("sign-off at the limit", () => {
  it("is not blocked by it: a document at the limit with every finding decided can be signed off", () => {
    const atLimit: ContractDocument = {
      ...rereview,
      status: "under_review",
      revisionCount: MAX_REVISION_CYCLES,
      findings: rereview.findings.map((f) => ({
        ...f,
        disposition: "confirmed",
        overrideNote: "Decided.",
        resolvedAt: "2026-10-02T09:00:00.000Z",
      })),
    };
    expect(revisionCycle(atLimit).canRequest).toBe(false);
    expect(signOffBlockers(atLimit, atLimit.advocate!.id)).toEqual([]);
  });
});
