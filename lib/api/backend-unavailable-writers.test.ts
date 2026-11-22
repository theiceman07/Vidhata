import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inviteMember, removeMember, saveProfile } from "@/lib/api/account";
import {
  addDeclaredConflict,
  recordOnboarding,
  removeDeclaredConflict,
  setAdvocateAvailability,
} from "@/lib/api/advocate";
import { saveBillingProfile } from "@/lib/api/billing";
import { payConsultation, requestConsultation } from "@/lib/api/consultations";
import {
  attachEvidence,
  createDraftDocument,
  payFee,
  requestChange,
  respondToChanges,
  startAnalysis,
  toggleExecutionStep,
} from "@/lib/api/documents";
import { completeOnboarding } from "@/lib/api/onboarding";
import {
  requestDataExport,
  requestDeletion,
  setTrainingOptIn,
  withdrawDeletion,
} from "@/lib/api/privacy";
import { snapshot } from "@/lib/api/state";
import { NOT_AVAILABLE_YET } from "@/lib/api/unavailable";

const ORG = "org-1";

/** Every call here must refuse in backend mode and leave the browser store exactly as it was. */
async function refusesAndWritesNothing(calls: Array<() => unknown>) {
  const before = JSON.stringify(snapshot());
  for (const call of calls) {
    let thrown: unknown;
    try {
      await call();
    } catch (err) {
      thrown = err;
    }
    expect((thrown as Error | undefined)?.message).toBe(NOT_AVAILABLE_YET);
  }
  expect(JSON.stringify(snapshot())).toBe(before);
}

describe("backend mode: in-browser writers refuse and write nothing", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "backend"));
  afterEach(() => vi.unstubAllEnvs());

  it("declared conflicts, availability and onboarding record (lib/api/advocate.ts)", async () => {
    await refusesAndWritesNothing([
      () => addDeclaredConflict("Acme Pvt Ltd"),
      () => removeDeclaredConflict("Acme Pvt Ltd"),
      () => setAdvocateAvailability(false),
      () =>
        recordOnboarding({ barEnrolmentNumber: "X/1/2020", stateBarCouncil: "KA", declaredConflicts: ["Acme"] }),
    ]);
  });

  it("deletion, data export, consent and withdrawal (lib/api/privacy.ts)", async () => {
    await refusesAndWritesNothing([
      () => requestDeletion(ORG, { understood: true }),
      () => withdrawDeletion(ORG),
      () => requestDataExport(ORG),
      () => setTrainingOptIn(ORG, true),
    ]);
  });

  it("billing profile (lib/api/billing.ts)", async () => {
    await refusesAndWritesNothing([() => saveBillingProfile(ORG, { name: "Acme", gstin: "" })]);
  });

  it("account profile and team (lib/api/account.ts)", async () => {
    await refusesAndWritesNothing([
      () => saveProfile(ORG, { name: "A", email: "a@example.com" }),
      () => inviteMember(ORG, "b@example.com"),
      () => removeMember(ORG, "member-2"),
    ]);
  });

  it("advocate onboarding (lib/api/onboarding.ts)", async () => {
    await refusesAndWritesNothing([
      () =>
        completeOnboarding("token", {
          barEnrolmentNumber: "X/1/2020",
          stateBarCouncil: "KA",
          declaredConflicts: [],
          noConflictsToDeclare: true,
        } as never),
    ]);
  });

  it("document mutators with no backend branch (lib/api/documents.ts)", async () => {
    await refusesAndWritesNothing([
      () => createDraftDocument({ title: "t" } as never),
      () => startAnalysis("d-1"),
      () => payFee("d-1"),
      () => requestChange("d-1", "f-1", "x", { id: "a-1", name: "A" }),
      () => respondToChanges("d-1", { "f-1": "x" }),
      () => toggleExecutionStep("d-1", "stamping" as never, true, "A"),
      () => attachEvidence("d-1", "stamping" as never, "file.pdf"),
    ]);
  });

  it("client-side consultation writers (lib/api/consultations.ts)", async () => {
    await refusesAndWritesNothing([() => requestConsultation("d-1", "q"), () => payConsultation("c-1")]);
  });

  it("outside backend mode the same writer still works (preview unchanged)", async () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "");
    const profile = await setAdvocateAvailability(true);
    expect(profile.available).toBe(true);
  });
});
