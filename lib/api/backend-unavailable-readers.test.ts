import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccount } from "@/lib/api/account";
import { declaredConflictNames, getAdvocateProfile } from "@/lib/api/advocate";
import { getBillingProfile, getInvoice, listInvoices } from "@/lib/api/billing";
import { listConsultations, listOrgConsultations } from "@/lib/api/consultations";
import { getDocumentVersions } from "@/lib/api/documents";
import { getInvite, onboardingProblems } from "@/lib/api/onboarding";
import { getPrivacy } from "@/lib/api/privacy";
import { snapshot } from "@/lib/api/state";
import { NOT_AVAILABLE_YET } from "@/lib/api/unavailable";

const ORG = "org-1";

async function refuses(call: () => unknown) {
  const before = JSON.stringify(snapshot());
  let thrown: unknown;
  try {
    await call();
  } catch (err) {
    thrown = err;
  }
  expect((thrown as Error | undefined)?.message).toBe(NOT_AVAILABLE_YET);
  expect(JSON.stringify(snapshot())).toBe(before);
}

describe("backend mode: reads refuse, so no sample content reaches a real account", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "backend"));
  afterEach(() => vi.unstubAllEnvs());

  it("getPrivacy (lib/api/privacy.ts)", () => refuses(() => getPrivacy(ORG)));
  it("getAccount (lib/api/account.ts)", () => refuses(() => getAccount(ORG)));
  it("listInvoices (lib/api/billing.ts)", () => refuses(() => listInvoices(ORG)));
  it("getInvoice (lib/api/billing.ts)", () => refuses(() => getInvoice(ORG, "INV-1")));
  it("getBillingProfile (lib/api/billing.ts)", () => refuses(() => getBillingProfile(ORG)));
  it("getAdvocateProfile (lib/api/advocate.ts)", () => refuses(() => getAdvocateProfile()));
  it("declaredConflictNames (lib/api/advocate.ts)", () => refuses(() => declaredConflictNames()));
  it("getInvite (lib/api/onboarding.ts)", () => refuses(() => getInvite("any-token")));
  it("onboardingProblems (lib/api/onboarding.ts)", () => refuses(() => onboardingProblems({} as never)));
  it("listOrgConsultations (lib/api/consultations.ts)", () => refuses(() => listOrgConsultations(ORG)));
  it("listConsultations (lib/api/consultations.ts)", () => refuses(() => listConsultations("d-1")));
  it("getDocumentVersions (lib/api/documents.ts)", () => refuses(() => getDocumentVersions("d-1")));

  it("outside backend mode the preview still reads its sample data", async () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "");
    expect(declaredConflictNames()).toBeInstanceOf(Array);
    await expect(getAdvocateProfile()).resolves.toHaveProperty("available");
  });
});
