import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrief } from "@/lib/api/brief";
import { uploadPathEnabled } from "@/lib/api/source";
import {
  CONTRACT_CATALOGUE,
  CONTRACT_TYPES,
  LISTED_CATALOGUE,
} from "@/lib/mock/intake-options.mock";

const root = path.resolve(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), "utf8");

describe("the contract types a client is shown", () => {
  const listed = (id: string) => LISTED_CATALOGUE.find((e) => e.id === id);

  it("supports NDA and vendor only", () => {
    const supported = LISTED_CATALOGUE.filter((e) => e.available).map((e) => e.id);
    expect([...supported].sort()).toEqual(["nda", "vendor"]);
  });

  it("lists the Founders' Agreement and the SHA as coming soon", () => {
    expect(listed("cofounder")?.available).toBe(false);
    expect(listed("shareholders")?.available).toBe(false);
  });

  it("keeps MSA and employment off every list", () => {
    expect(listed("msa")).toBeUndefined();
    expect(listed("employment")).toBeUndefined();
  });

  it("still knows MSA and employment, so a document that has one keeps its label", () => {
    expect(CONTRACT_CATALOGUE.some((e) => e.id === "msa")).toBe(true);
    expect(CONTRACT_TYPES.map((t) => t.value)).toEqual(
      expect.arrayContaining(["msa", "employment"]),
    );
  });

  it("does not start an MSA or employment draft from a brief", async () => {
    for (const brief of [
      "MSA with a software client in Pune, 5 lakh, 12 months",
      "Employment agreement for a new hire in Bengaluru",
    ]) {
      const { found, missing } = await readBrief(brief);
      expect(found.type).toBeUndefined();
      expect(missing).toContain("type");
    }
  });

  it("still reads an NDA and a vendor brief", async () => {
    expect((await readBrief("Mutual NDA with a vendor in Pune")).found.type).toBe("nda");
    expect((await readBrief("Supplier agreement, paid in 45 days")).found.type).toBe("vendor");
  });

  it("offers no MSA chip on the landing page", () => {
    expect(read("components", "marketing", "public-entry.tsx")).not.toMatch(/MSA/);
  });
});

describe("the upload step", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off unless the flag is set", () => {
    expect(uploadPathEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_UPLOAD", "1");
    expect(uploadPathEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_UPLOAD", "true");
    expect(uploadPathEnabled()).toBe(false);
  });

  it("is shown only behind the flag", () => {
    const page = read("app", "(client)", "documents", "[id]", "page.tsx");
    expect(page).toMatch(/uploadPathEnabled\(\)\s*\?\s*\(\s*<UploadContractPanel/);
  });
});

describe("what an advocate sees before a claim", () => {
  const queue = read("app", "(lawyer)", "queue", "page.tsx");

  it("has no Preview button", () => {
    expect(queue).not.toMatch(/>\s*Preview\s*</);
  });

  it("does not link an unclaimed document's title to its review", () => {
    expect(queue.match(/status === "pending_review" \?/g)?.length).toBeGreaterThanOrEqual(1);
    expect(queue).toContain("const unclaimed = doc.status ===");
  });

  it("says the text and findings open on a claim, and shows no finding text before it", () => {
    expect(queue).toContain("The text and the findings open once you claim this document.");
    expect(queue).toMatch(/unclaimed\s*\?\s*\(\s*<p[^>]*>\s*The text and the findings open/);
  });
});

describe("wording and copy", () => {
  it("says nothing is generated, not that every step is complete, when a checklist has no steps", () => {
    const page = read("app", "(client)", "documents", "[id]", "checklist", "page.tsx");
    expect(page).toContain("No execution steps have been generated for this document yet.");
    expect(page).toMatch(/noSteps\s*\?/);
  });

  it("opens accounts by invitation instead of offering sign-up", () => {
    const login = read("app", "(public)", "login", "page.tsx");
    expect(login).not.toContain("Create an account");
    expect(login).toContain("Request access");
    expect(login).toContain('href="/contact"');
  });

  it("has no workflow video block on the landing page", () => {
    const how = read("components", "marketing", "how-it-works.tsx");
    expect(how).not.toMatch(/VideoPlaceholder|Workflow video|Coming soon/);
  });

  it("puts no address on the error pages, only the contact page", () => {
    for (const file of [
      ["app", "error.tsx"],
      ["components", "shared", "error-state.tsx"],
    ]) {
      const source = read(...file);
      expect(source).toContain('href="/contact"');
      expect(source).not.toMatch(/mailto:|[\w.-]+@[\w-]+\.\w+|localhost|supabase|vercel/i);
    }
  });
});
