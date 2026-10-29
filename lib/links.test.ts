import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Brand green against body text is only 2.1:1 (lib/contrast.test.ts), so
 * colour cannot mark an inline link. Every inline link is a TextLink, or an
 * element with the .link class, which is underlined at rest with an offset
 * and thicker on hover. This test fails on:
 *   - a bare <a> element (use TextLink, or next/link with .link)
 *   - hover:underline, which is an underline that only appears on hover
 *   - an underline written out by hand in a class list (use .link)
 */
const ROOT = join(__dirname, "..");

/**
 * Not held to the rule, each for a stated reason.
 * The home page and its footer are frozen this round: they are listed for the
 * team, and this list shrinks as they are brought across.
 */
const EXEMPT: { path: string; why: string }[] = [
  { path: "components/marketing/", why: "home page, frozen this round" },
  { path: "components/shared/consent-banner.tsx", why: "shown on the home page, frozen this round" },
  { path: "app/global-error.tsx", why: "renders its own html with plain anchors by design" },
  { path: "components/shared/gloss.tsx", why: "a dotted underline marks a term with a tooltip, not a link" },
  { path: "components/shared/text-link.tsx", why: "defines the link style" },
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });
}

const files = [...sources(join(ROOT, "app")), ...sources(join(ROOT, "components"))]
  .map((f) => relative(ROOT, f))
  .filter((f) => !EXEMPT.some((e) => f.startsWith(e.path)));

/** Source lines with comments dropped, so prose that says "underline" is not a class. */
function codeLines(file: string): { n: number; text: string }[] {
  return readFileSync(join(ROOT, file), "utf8")
    .split("\n")
    .map((text, i) => ({ n: i + 1, text }))
    .filter(({ text }) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(text));
}

function offenders(test: (line: string) => boolean): string[] {
  return files.flatMap((f) =>
    codeLines(f)
      .filter(({ text }) => test(text))
      .map(({ n }) => `${f}:${n}`),
  );
}

describe("inline links", () => {
  it("scans the product's files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("uses no bare anchor element", () => {
    expect(offenders((l) => /<a[\s>]/.test(l))).toEqual([]);
  });

  it("has no hover-only underline", () => {
    expect(offenders((l) => /hover:(no-)?underline/.test(l))).toEqual([]);
  });

  it("writes no underline by hand: links take the .link class", () => {
    expect(
      offenders((l) => /(^|[\s"'`])(focus-visible:)?underline(-offset-\d+)?(?=[\s"'`])/.test(l)),
    ).toEqual([]);
  });

  it("keeps the exemptions honest: each names a file or folder that exists", () => {
    for (const e of EXEMPT) {
      expect(() => statSync(join(ROOT, e.path))).not.toThrow();
    }
  });
});
