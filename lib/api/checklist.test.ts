import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMockDocumentById } from "@/lib/mock/documents.mock";
import type { ContractDocument, ExecutionStep } from "@/lib/types";
import {
  claimDocument,
  createDraftDocument,
  getDocument,
  payFee,
  signOffDocument,
  startAnalysis,
  updateFinding,
  withdrawCitation,
} from "./documents";

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

// A figure in rupees, however it is written: Rs 100, Rs. 1,00,000, INR 5000, ₹4,999.
const RUPEE_FIGURE = /(?:₹|\brs\.?|\binr)\s*\d/i;

function stepText(step: ExecutionStep): string {
  return [step.headline, step.detail, step.reason, ...step.instructions].join("\n");
}

// A document run all the way through the mock pipeline to sign-off, so its
// checklist is the one the product generates.
async function generatedChecklist(
  type: ContractDocument["type"],
  stateOfExecution: string,
  transactionValue: number,
): Promise<ExecutionStep[]> {
  const draft = await settle(
    createDraftDocument({
      title: `Checklist ${type} ${stateOfExecution}`,
      type,
      clientName: "Anaya Textiles Pvt Ltd",
      counterpartyName: "Counterparty Pvt Ltd",
      stateOfExecution,
      transactionValue,
      counterpartyIsMsme: false,
      durationMonths: 12,
      governingLaw: "Laws of India",
      keyTerms: "",
    }),
  );
  await settle(startAnalysis(draft.id));
  // Reading it after the analysis window reconciles it to awaiting payment.
  vi.advanceTimersByTime(60_000);
  await settle(getDocument(draft.id));
  await settle(payFee(draft.id));
  const claimed = await settle(
    claimDocument(draft.id, advocate, { noConflictWithEitherParty: true }),
  );
  // The advocate settles every finding, and withdraws any blocked source, before sign-off.
  for (const finding of claimed.findings) {
    for (const citation of finding.citations.filter((c) => c.status === "blocked")) {
      await settle(withdrawCitation(draft.id, finding.findingId, citation.id, "Withdrawn.", advocate.name));
    }
    await settle(updateFinding(draft.id, finding.findingId, { disposition: "confirmed", overrideNote: null }));
  }
  const settled = await settle(signOffDocument(draft.id));
  return settled.executionSteps;
}

describe("a generated execution checklist", () => {
  const cases: Array<[ContractDocument["type"], string, number]> = [
    ["nda", "Delhi", 0],
    ["nda", "Maharashtra", 0],
    ["msa", "Maharashtra", 4_200_000],
    ["msa", "Karnataka", 900_000],
    ["vendor", "Kerala", 150_000],
    ["employment", "Some Other State", 2_400_000],
  ];

  it.each(cases)("states no rupee figure for a %s in %s worth %i", async (type, state, value) => {
    const steps = await generatedChecklist(type, state, value);
    expect(steps.map((s) => s.kind)).toEqual(["stamping", "registration", "esignature"]);
    for (const step of steps) {
      expect(stepText(step), step.kind).not.toMatch(RUPEE_FIGURE);
    }
  });

  it("leaves the amount to the advocate, and never rules registration out", async () => {
    const [stamping, registration] = await generatedChecklist("msa", "Maharashtra", 4_200_000);
    expect(stamping.applicable).toBe(true);
    expect(stamping.detail).toBe(
      "Stamp duty depends on the state of execution and the instrument. Your advocate confirms the amount before you sign.",
    );
    // "Not required" is a legal conclusion with no audited rule behind it, so a
    // generated checklist keeps the step open for the advocate to confirm.
    expect(registration.applicable).toBe(true);
    expect(registration.detail).toBe("Your advocate confirms whether registration applies.");
  });

  it("cites no section of any Act", async () => {
    const steps = await generatedChecklist("msa", "Delhi", 5_000_000);
    for (const step of steps) {
      expect(stepText(step), step.kind).not.toMatch(/\bsection\s+\d|\bs\.\s?\d+/i);
    }
  });
});

describe("a fixture's checklist", () => {
  // A figure may stand only on a fixture, as an entry an advocate confirmed on
  // that sample document, and the fixture says so.
  const NDA = getMockDocumentById("doc-nda-settled")!;

  it("may carry a figure, and says it is a sample entry", () => {
    const stamping = NDA.executionSteps.find((s) => s.kind === "stamping")!;
    expect(stamping.headline).toBe("Stamp duty: Rs 100 (Delhi)");
    expect(stepText(stamping)).toMatch(/Sample entry/);
  });

  it("supplies every figure a client can read on its sample", () => {
    const supplied = new Set(
      NDA.executionSteps.flatMap((s) => stepText(s).match(/rs\.?\s*[\d,]+/gi) ?? []),
    );
    expect([...supplied]).toEqual(["Rs 100"]);
  });
});
