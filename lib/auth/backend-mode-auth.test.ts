import { afterEach, describe, expect, it, vi } from "vitest";
import { mockCredentialsAccepted } from "./mock-credentials";
import { identityName } from "./identity";

afterEach(() => vi.unstubAllEnvs());

describe("mock credentials", () => {
  it("accepts the sample credentials when no backend is set (today's mock site)", () => {
    expect(mockCredentialsAccepted("admin", "admin")).toBe(true);
    expect(mockCredentialsAccepted("admin", "wrong")).toBe(false);
  });

  it("rejects admin/admin when the real backend is on, so the mock check is skipped", () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_DATA", "backend");
    expect(mockCredentialsAccepted("admin", "admin")).toBe(false);
  });
});

describe("identity name", () => {
  it("keeps the sample name in the preview", () => {
    expect(identityName(false, "Anaya Textiles Pvt Ltd", null)).toBe("Anaya Textiles Pvt Ltd");
  });

  it("shows the signed-in email with the backend on, never the sample name", () => {
    expect(identityName(true, "Anaya Textiles Pvt Ltd", "founder@example.com")).toBe("founder@example.com");
    expect(identityName(true, "Anaya Textiles Pvt Ltd", null)).toBe("Signed in");
  });
});
