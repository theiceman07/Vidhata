import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The lint fence has a list of files. A list can have a hole, and a hole is a
 * file that reads the internal record with nothing to stop it, so this holds the
 * list to what the code actually is.
 *
 * The fence (.eslintrc.json) forbids ContractDocument, the internal Finding and
 * lib/api/documents in app/(client) and in the components only the client portal
 * uses. Those components are worked out here from the imports: every component
 * reachable from a client page and not from an advocate page. A component that
 * both portals use (the shared workspace) is outside the fence on purpose, and
 * the primitives in components/ui hold no record, so they are left out.
 *
 * This does not decide what the fence blocks. It decides that the fence is
 * pointed at the right files, and that the rule is still the one we meant.
 */

const root = path.resolve(__dirname, "..");
const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(root, dir))) {
    const full = path.join(root, dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(rel(full)));
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel(full));
  }
  return out;
}

const SOURCE = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => !/\.test\.tsx?$/.test(f));

function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? spec.slice(2)
    : spec.startsWith(".")
      ? rel(path.resolve(root, path.dirname(from), spec))
      : null;
  if (base === null) return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(path.join(root, candidate))) return candidate;
  }
  return null;
}

const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
const graph = new Map<string, string[]>(
  SOURCE.map((file) => {
    const text = readFileSync(path.join(root, file), "utf8");
    const deps = [...text.matchAll(IMPORT)]
      .map((m) => resolve(file, m[1]))
      .filter((d): d is string => d !== null);
    return [file, deps];
  }),
);

function reachableFrom(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    stack.push(...(graph.get(file) ?? []));
  }
  return seen;
}

const fromClient = reachableFrom(SOURCE.filter((f) => f.startsWith("app/(client)/")));
const fromAdvocate = reachableFrom(SOURCE.filter((f) => f.startsWith("app/(lawyer)/")));

/** Components the client portal uses and the advocate portal does not. Primitives hold no record. */
const clientOnlyComponents = SOURCE.filter(
  (f) =>
    f.startsWith("components/") &&
    !f.startsWith("components/ui/") &&
    fromClient.has(f) &&
    !fromAdvocate.has(f),
).sort();

/** The fence, as .eslintrc.json states it. */
type Override = { files: string[]; rules?: Record<string, unknown> };
const config = JSON.parse(readFileSync(path.join(root, ".eslintrc.json"), "utf8")) as {
  overrides?: Override[];
};
const fence = (config.overrides ?? []).find((o) => o.rules && "no-restricted-imports" in o.rules);

/** The one glob the fence uses is the whole of app/(client); everything else is a path. */
const covered = (file: string): boolean =>
  (fence?.files ?? []).some((pattern) =>
    pattern === "app/(client)/**/*.{ts,tsx}"
      ? file.startsWith("app/(client)/") && /\.tsx?$/.test(file)
      : pattern === file,
  );

describe("the lint fence's list of files", () => {
  it("exists, as an override that restricts imports", () => {
    expect(fence, "an override with no-restricted-imports in .eslintrc.json").toBeDefined();
  });

  it("finds the client-only components, to be meaningful", () => {
    expect(clientOnlyComponents.length).toBeGreaterThan(10);
    // Those that both portals use are not among them.
    expect(clientOnlyComponents).not.toContain("components/document/workspace.tsx");
  });

  it("covers every component only the client portal uses", () => {
    expect(clientOnlyComponents.filter((f) => !covered(f))).toEqual([]);
  });

  it("covers every page under app/(client)", () => {
    const pages = SOURCE.filter((f) => f.startsWith("app/(client)/"));
    expect(pages.length).toBeGreaterThan(5);
    expect(pages.filter((f) => !covered(f))).toEqual([]);
  });

  it("names no file that is not there, so a rename cannot quietly drop one from the fence", () => {
    const named = (fence?.files ?? []).filter((p) => !p.includes("*"));
    expect(named.filter((p) => !existsSync(path.join(root, p)))).toEqual([]);
  });

  it("names no file the advocate portal also uses, which the fence would break", () => {
    const named = (fence?.files ?? []).filter((p) => !p.includes("*"));
    expect(named.filter((p) => fromAdvocate.has(p))).toEqual([]);
  });
});

describe("the rule the fence enforces", () => {
  const rule = (fence?.rules?.["no-restricted-imports"] ?? []) as [
    string,
    { paths?: { name: string; importNames?: string[] }[]; patterns?: { group: string[] }[] },
  ];
  const [severity, options] = rule;

  it("is an error and not a warning", () => {
    expect(severity).toBe("error");
  });

  it("still forbids ContractDocument and the internal Finding from lib/types", () => {
    const types = options?.paths?.find((p) => p.name === "@/lib/types");
    expect(types?.importNames).toEqual(expect.arrayContaining(["ContractDocument", "Finding"]));
  });

  it("still forbids lib/api/documents, by alias and by path", () => {
    expect(options?.paths?.some((p) => p.name === "@/lib/api/documents")).toBe(true);
    expect(options?.patterns?.some((p) => p.group.some((g) => g.includes("api/documents")))).toBe(true);
  });
});
