import { describe, expect, it } from "vitest";
import config from "../tailwind.config";
import { AA_LARGE_OR_GRAPHIC, AA_TEXT, contrast } from "../scripts/contrast";

/**
 * The palette, measured. The colours are read from tailwind.config.ts, the one
 * place they are written, so a changed hex is measured and cannot slip past.
 * Each pair also carries the ratio the design board quotes: if a colour
 * moves, the ratio moves and this fails, and the answer is to tell the
 * team, not to quietly change a hex to make it pass.
 */
type Palette = Record<string, string | Record<string, string>>;
const colors = (config.theme?.extend as { colors: Palette }).colors;

function token(path: string): string {
  if (path === "white") return "#FFFFFF";
  const [name, shade] = path.split(".");
  const value = colors[name];
  const hex = typeof value === "string" ? value : value[shade ?? "DEFAULT"];
  if (!hex) throw new Error(`No colour token ${path}`);
  return hex;
}

interface Pair {
  name: string;
  fg: string;
  bg: string;
  /** What it is: body text must reach 4.5, large text and graphics 3. */
  use: "text" | "graphic";
  /** The ratio on the design board, to one decimal place. */
  board: number;
}

const PAIRS: Pair[] = [
  { name: "ink on paper", fg: "ink", bg: "paper", use: "text", board: 15.8 },
  { name: "muted on paper", fg: "muted", bg: "paper", use: "text", board: 6.7 },
  { name: "muted on sand", fg: "muted", bg: "sand", use: "text", board: 6.1 },
  { name: "white on brand", fg: "white", bg: "brand", use: "text", board: 8.0 },
  { name: "brand on brand-tint", fg: "brand", bg: "brand.tint", use: "text", board: 6.8 },
  { name: "done text on done-tint", fg: "done.text", bg: "done.tint", use: "text", board: 5.7 },
  { name: "tick (white) on done fill", fg: "white", bg: "done", use: "graphic", board: 5.0 },
  { name: "progress text on progress-tint", fg: "progress", bg: "progress.tint", use: "text", board: 5.8 },
  { name: "white on progress fill", fg: "white", bg: "progress", use: "text", board: 6.7 },
  { name: "move-text on move-tint", fg: "move.text", bg: "move.tint", use: "text", board: 6.4 },
  { name: "ink on marigold", fg: "ink", bg: "move", use: "text", board: 8.2 },
  { name: "blocked text on blocked-tint", fg: "blocked", bg: "blocked.tint", use: "text", board: 4.9 },
  { name: "white on blocked fill", fg: "white", bg: "blocked", use: "text", board: 5.8 },
  { name: "marigold on night", fg: "move", bg: "night", use: "graphic", board: 8.4 },
  { name: "mint on night", fg: "mint", bg: "night", use: "graphic", board: 8.2 },
];

describe("palette contrast (WCAG 2)", () => {
  for (const p of PAIRS) {
    const ratio = contrast(token(p.fg), token(p.bg));
    const floor = p.use === "text" ? AA_TEXT : AA_LARGE_OR_GRAPHIC;

    it(`${p.name} reaches ${floor}:1`, () => {
      expect(ratio).toBeGreaterThanOrEqual(floor);
    });

    it(`${p.name} matches the board's ${p.board}`, () => {
      expect(Number(ratio.toFixed(1))).toBe(p.board);
    });
  }

  it("knows the calculation: black on white is 21:1, white on white 1:1", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("brand green against body text is about 2.1:1, so a link needs its underline", () => {
    const ratio = contrast(token("brand"), token("ink"));
    expect(ratio).toBeLessThan(AA_LARGE_OR_GRAPHIC);
    expect(Number(ratio.toFixed(1))).toBe(2.1);
    // Which is why lib/links.test.ts holds every inline link to .link, underlined at rest.
  });

  it("brand reads clearly as text on the page and on sand, where a link sits", () => {
    expect(contrast(token("brand"), token("paper"))).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(token("brand"), token("sand"))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("the old token names still equal the tokens they stand for", () => {
    const same: [string, string][] = [
      ["accent", "brand"],
      ["accent.hover", "brand.deep"],
      ["muted-fg", "muted"],
      ["canvas", "paper"],
      ["parchment", "sand"],
      ["verified", "done"],
      ["flagged", "blocked"],
      ["caution", "move"],
      ["caution.fg", "move.text"],
      ["info", "progress"],
    ];
    for (const [alias, real] of same) expect(token(alias)).toBe(token(real));
  });
});
