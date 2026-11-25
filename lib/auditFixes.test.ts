import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readBrief } from "@/lib/api/brief";
import { uploadPathEnabled } from "@/lib/api/source";
import { supportEmail } from "@/lib/config/contact";
import { COMPANY } from "@/lib/config/company";
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
    expect(queue).toContain("const unclaimed = !partiesVisibleInQueue(doc);");
  });

  it("says the text and findings open on a claim, and shows no finding text before it", () => {
    expect(queue).toContain("The text and the findings open once you claim this document.");
    expect(queue).toMatch(/unclaimed\s*\?\s*\(\s*<p[^>]*>\s*The text and the findings open/);
  });
});

describe("no link to a form that discards messages", () => {
  it("links neither the contact page nor the invitation form from any public page or menu", () => {
    for (const file of [
      ["app", "page.tsx"],
      ["app", "(public)", "pricing", "page.tsx"],
      ["app", "(public)", "terms", "page.tsx"],
      ["app", "(public)", "advocate-login", "page.tsx"],
      ["app", "(public)", "advocate-onboarding", "[token]", "page.tsx"],
      ["components", "marketing", "site-header.tsx"],
      ["components", "marketing", "site-footer.tsx"],
    ]) {
      const source = read(...file);
      expect(source, file.join("/")).not.toMatch(/["']\/contact["']|["']\/advocate-invite["']/);
      // The only address written to is the configured one (lib/config/contact.ts), never a literal.
      for (const m of source.matchAll(/mailto:(.{0,20})/g)) {
        expect(m[1], file.join("/")).toMatch(/^\$\{supportEmail\(\)\}/);
      }
    }
  });

  it("states that advocate sign-in is by invitation, as plain text", () => {
    expect(read("app", "(public)", "advocate-login", "page.tsx")).toContain(
      "Empanelment is by invitation.",
    );
  });
});

describe("wording and copy", () => {
  it("says nothing is generated, not that every step is complete, when a checklist has no steps", () => {
    const page = read("app", "(client)", "documents", "[id]", "checklist", "page.tsx");
    expect(page).toContain("No execution steps have been generated for this document yet.");
    expect(page).toMatch(/noSteps\s*\?/);
  });

  it("opens accounts by invitation instead of offering sign-up, and links no mock form", () => {
    const login = read("app", "(public)", "login", "page.tsx");
    expect(login).not.toContain("Create an account");
    expect(login).toContain("Accounts are opened by invitation.");
    expect(login).not.toContain('"/contact"');
    expect(login).toContain("supportEmail()");
  });

  it("has no workflow video block on the landing page", () => {
    const how = read("components", "marketing", "how-it-works.tsx");
    expect(how).not.toMatch(/VideoPlaceholder|Workflow video|Coming soon/);
  });

  it("writes no address into the error pages or the login page, and links no mock form", () => {
    for (const file of [
      ["app", "error.tsx"],
      ["components", "shared", "error-state.tsx"],
      ["app", "(public)", "login", "page.tsx"],
    ]) {
      const source = read(...file);
      expect(source).not.toContain('"/contact"');
      expect(source).not.toMatch(/[\w.-]+@[\w-]+\.\w+/);
      if (file.join("/").includes("error")) {
        expect(source).not.toMatch(/localhost|supabase|vercel/i);
      }
      expect(source).toContain("supportEmail()");
    }
  });

  it("uses the deploy's address when it is one, and the company address otherwise", () => {
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL", "");
    expect(supportEmail()).toBe(COMPANY.email);
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL", "not an address");
    expect(supportEmail()).toBe(COMPANY.email);
    vi.stubEnv("NEXT_PUBLIC_VIDHATA_SUPPORT_EMAIL", " help@example.test ");
    expect(supportEmail()).toBe("help@example.test");
    vi.unstubAllEnvs();
  });

  it("says version history isn't available yet, instead of reporting the document missing", () => {
    const page = read("app", "(client)", "documents", "[id]", "history", "page.tsx");
    expect(page).toContain("Version history isn&apos;t available yet.");
    expect(page).toMatch(/backendDataEnabled\(\)\)\s*\{[\s\S]*setState\("unavailable"\)/);
  });

  it("says what the upload-off state is, in the owner's words", () => {
    const page = read("app", "(client)", "documents", "[id]", "page.tsx");
    expect(page).toContain("Drafting from your answers isn&apos;t open yet. There is nothing to submit for now.");
  });

  it("names the supported vendor type as the SRD does", () => {
    expect(LISTED_CATALOGUE.find((e) => e.id === "vendor")?.label).toBe(
      "Vendor / MSME supplier agreement",
    );
  });

  it("shows an unclaimed document by type, plan and state only: no value and no execution state", () => {
    const schema = read("lib", "api", "backend-documents.ts");
    const queueRow = schema.slice(schema.indexOf("export const queueRowSchema"), schema.indexOf("export type QueueRow"));
    expect(queueRow).not.toMatch(/transaction_value|state_of_execution/);
    const queue = read("app", "(lawyer)", "queue", "page.tsx");
    expect(queue).toMatch(/partiesLine\s*&&\s*\(\s*<>[\s\S]*Executed in/);
  });

  it("uses no MSA or employment fixture on the landing page", () => {
    for (const file of ["living-document.tsx", "india-checks.tsx"]) {
      const source = read("components", "marketing", file);
      expect(source).not.toMatch(/doc-msa|doc-employment|Master services/i);
    }
  });
});
