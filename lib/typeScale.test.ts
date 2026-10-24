import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The product has six type steps (tailwind.config.ts): 12 label, 14 meta,
// 16 body, 20 h3, 26 h2, 40 h1, plus the marketing display sizes. A size
// written as text-[13px], or one of Tailwind's own text-sm/text-xl, steps
// outside the scale and is how the rendered sizes grew to nineteen. Sizes
// come from the named scale or not at all.

const root = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

const files = [...sourceFiles(join(root, "app")), ...sourceFiles(join(root, "components"))];

function offenders(pattern: RegExp): string[] {
  return files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) => (pattern.test(line) ? [`${relative(root, file)}:${i + 1}  ${line.trim().slice(0, 100)}`] : [])),
  );
}

describe("type scale", () => {
  it("has no arbitrary font sizes (text-[13px] and the like)", () => {
    expect(offenders(/\btext-\[\d/)).toEqual([]);
  });

  it("has no Tailwind default sizes (text-xs, text-sm, text-lg, text-xl and up)", () => {
    expect(offenders(/\btext-(xs|sm|lg|xl|[2-9]xl)\b/)).toEqual([]);
  });
});

// Every page title is a PageHeader (components/shared/page-header.tsx), so the
// title has one size, one height and one left edge. A hand-written <h1> in a
// portal page is how titles ended up at eight different left edges.
const H1_ALLOWED: Array<[RegExp, string]> = [
  [/^components\/shared\/page-header\.tsx$/, "the one header"],
  [/^components\/marketing\//, "marketing pages own their hero"],
  [/^app\/\(public\)\//, "public pages own their hero"],
  [/^components\/shared\/(auth-screen|portal-gate)\.tsx$/, "sign-in and session screens"],
  [/^app\/(global-error|not-found)\.tsx$/, "error pages"],
  [/^app\/dev\//, "developer pages, not part of the product"],
  [/^app\/\(client\)\/documents\/page\.tsx$/, "the Documents greeting, the one centred hero"],
  [/^components\/document\/workspace\.tsx$/, "the full-bleed document workspace header"],
];

describe("page titles", () => {
  it("are PageHeaders, not hand-written <h1> elements", () => {
    const strays = files
      .map((file) => relative(root, file))
      .filter((rel) => !H1_ALLOWED.some(([pattern]) => pattern.test(rel)))
      .filter((rel) => /<h1[\s>]/.test(readFileSync(join(root, rel), "utf8")));
    expect(strays).toEqual([]);
  });
});
