import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LIMITS, isEmail, toRow } from "./access-requests";

const root = path.resolve(__dirname, "..", "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8");

describe("access requests", () => {
  it("writes a form row only, trimmed and clipped to the table's limits", () => {
    const row = toRow({
      kind: "client_access",
      name: "  Asha  ",
      email: " asha@example.test ",
      company: "",
      brief: "x".repeat(LIMITS.brief + 50),
      details: { Phone: "  ", "Enrolment number": " D/1/2020 " },
    });
    expect(row.source).toBe("form");
    expect(row.name).toBe("Asha");
    expect(row.email).toBe("asha@example.test");
    expect(row.company).toBeNull();
    expect(row.brief).toHaveLength(LIMITS.brief);
    expect(row.details).toEqual({ "Enrolment number": "D/1/2020" });
  });

  it("checks the email shape the table checks", () => {
    expect(isEmail("name@company.com")).toBe(true);
    expect(isEmail("name@company")).toBe(false);
    expect(isEmail("not an email")).toBe(false);
  });

  it("asks for nothing back from the insert, because the browser cannot read the table", () => {
    const source = read("lib", "api", "access-requests.ts");
    expect(source).toMatch(/\.from\("access_requests"\)\.insert\(/);
    expect(source).not.toMatch(/\.select\(/);
  });

  it("sends every public way in to the request form, not to a sign-in that cannot open an account", () => {
    expect(read("components", "marketing", "public-entry.tsx")).toContain('destination="/request-access"');
    expect(read("app", "(public)", "login", "page.tsx")).toContain('href="/request-access"');
    expect(read("app", "(public)", "advocate-login", "page.tsx")).toContain('href="/advocate-apply"');
    expect(read("components", "marketing", "pricing-table.tsx")).not.toContain('href="/new"');
  });

  it("keeps the provider profile out of the URL", () => {
    const callback = read("app", "auth", "callback", "page.tsx");
    expect(callback).toContain('router.replace("/request-access?from=signin")');
    expect(callback).not.toMatch(/email=|name=/);
  });
});
